/**
 * Build fal request bodies for locked Standard models.
 * Never reorder multi-image URLs. Never drop the source image for I2I.
 * enhance_prompt is always false — do not silently rewrite user prompts.
 *
 * Multi (2+ images) → GPT Image 2 edit @ quality low only.
 */

import { buildGptImage2MultiStep } from "@/lib/studio/image/gpt-image-2";
import {
  STANDARD_MODELS,
  kleinImageSize,
  standardTextToImageModel,
} from "./models";
import type { StandardFalStep, StandardValidationOk } from "./types";

export function buildTextToImageStep(req: StandardValidationOk): StandardFalStep {
  const model = standardTextToImageModel(req.imageQuality);
  return {
    label: `standard T2I ${req.imageQuality === "hd" ? "HD klein-9b" : "SD klein-4b"}`,
    model,
    body: {
      prompt: req.prompt,
      image_size: kleinImageSize(req.aspectRatio, req.imageQuality),
      num_images: 1,
      num_inference_steps: 4,
      enable_safety_checker: true,
      output_format: "png",
    },
  };
}

/**
 * Standard single-image edit via FLUX.1 Kontext [pro].
 * This is an instruction-following editor (not Flux Dev denoise/style-transfer).
 * Do NOT use strength — Kontext does not take a denoise strength parameter.
 * Always send the real HTTPS image_url.
 */
export function buildImageToImageStep(req: StandardValidationOk): StandardFalStep {
  if (!req.imageUrl || !req.imageUrl.startsWith("https://")) {
    throw new Error("Image → Image requires a valid HTTPS source image URL.");
  }
  const raw = req.prompt.trim();
  const prompt =
    /\b(edit|enhance|sharpen|brighten|clear|fix|improve|make|change|remove|add)\b/i.test(raw)
      ? raw
      : `Edit this photo: ${raw}. Keep the same scene, layout, and subjects.`;

  return {
    label: `standard I2I kontext-pro ${req.imageQuality === "hd" ? "HD" : "SD"}`,
    model: STANDARD_MODELS.imageToImage,
    body: {
      prompt,
      image_url: req.imageUrl,
      guidance_scale: 3.5,
      num_images: 1,
      output_format: "png",
      safety_tolerance: "2",
      enhance_prompt: false,
    },
  };
}

/**
 * Multi: image_urls = [base, ref1, ref2, ...] in exact upload order.
 * GPT Image 2 quality hard-locked to low.
 */
export function buildMultiImageStep(req: StandardValidationOk): StandardFalStep {
  if (!req.imageUrl) {
    throw new Error("Multiple Image requires a base image.");
  }
  const refs = req.referenceImageUrls;
  const image_urls = [req.imageUrl, ...refs];
  if (image_urls.length < 2 || image_urls.length > 5) {
    throw new Error("Multiple Image requires 2–5 total images.");
  }

  const step = buildGptImage2MultiStep({
    prompt: req.prompt,
    imageUrls: image_urls,
    outputClass: req.imageQuality === "hd" ? "hd" : "sd",
    aspectRatio: req.aspectRatio,
    experience: "standard",
  });

  return {
    label: step.label,
    model: step.model,
    body: step.body as Record<string, unknown>,
  };
}

export function buildCircleRemoveStep(req: StandardValidationOk): StandardFalStep {
  if (!req.imageUrl || !req.maskImageUrl) {
    throw new Error("Circle remove requires original image and mask.");
  }
  return {
    label: "standard circle-to-remove (flux erase)",
    model: STANDARD_MODELS.circleToRemove,
    body: {
      image_url: req.imageUrl,
      mask_url: req.maskImageUrl,
      prompt:
        req.prompt ||
        "Remove the masked region and fill naturally with surrounding background. Preserve all unmasked pixels.",
    },
  };
}

/**
 * Circle Add — flux-general/inpainting.
 * MUST use source image + user mask + asset backend prompt.
 * MUST NOT regenerate the full scene. White mask = edit region only.
 */
export function buildCircleAddStep(req: StandardValidationOk): StandardFalStep {
  if (!req.imageUrl || !req.maskImageUrl) {
    throw new Error("Circle add requires original image and mask.");
  }
  const userPrompt = (req.prompt || "").trim();
  const prompt = [
    userPrompt,
    "Edit ONLY the white masked region.",
    "Preserve every unmasked pixel exactly as in the source photograph.",
    "Do not change architecture, railings, walls, floors, faces, clothing, or background outside the mask.",
    "Do not regenerate the full image. Inpaint the mask only.",
  ]
    .filter(Boolean)
    .join(" ");

  if (process.env.NODE_ENV !== "production") {
    console.log("[circle-add] modelRequestCreated", {
      operation: "circle_add",
      promptPresent: prompt.length > 0,
      promptLen: prompt.length,
      imageUrlPresent: !!req.imageUrl,
      maskUrlPresent: !!req.maskImageUrl,
      model: "fal-ai/flux-general/inpainting",
    });
  }

  return {
    label: "standard circle-to-add (flux inpaint)",
    model: "fal-ai/flux-general/inpainting",
    body: {
      prompt,
      image_url: req.imageUrl,
      mask_url: req.maskImageUrl,
      strength: 0.88,
      guidance_scale: 4.0,
      num_inference_steps: 42,
      num_images: 1,
      enable_safety_checker: true,
      output_format: "png",
      scheduler: "euler",
      negative_prompt:
        "changed unmasked area, altered railing, modified architecture, different face, different background, full scene regeneration, artifacts, blur, extra objects outside mask, watermark, text",
    },
  };
}

export function buildStandardStep(req: StandardValidationOk): StandardFalStep {
  switch (req.mode) {
    case "text_to_image":
      return buildTextToImageStep(req);
    case "image_to_image":
      return buildImageToImageStep(req);
    case "multi_image_to_image":
      return buildMultiImageStep(req);
    case "circle_to_remove":
      return buildCircleRemoveStep(req);
    case "circle_to_add":
      return buildCircleAddStep(req);
    default: {
      const _exhaustive: never = req.mode;
      throw new Error(`Unknown Standard mode: ${String(_exhaustive)}`);
    }
  }
}
