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

export function buildImageToImageStep(req: StandardValidationOk): StandardFalStep {
  if (!req.imageUrl) {
    throw new Error("Image → Image requires a source image.");
  }
  // Flux 0.1 Dev I2I — supported params only (prompt, image_url, strength, steps, guidance).
  const strength =
    typeof req.strength === "number" && req.strength >= 0.01 && req.strength <= 1
      ? req.strength
      : 0.85;
  return {
    label: `standard I2I flux-dev ${req.imageQuality === "hd" ? "HD" : "SD"}`,
    model: STANDARD_MODELS.imageToImage,
    body: {
      prompt: req.prompt,
      image_url: req.imageUrl,
      strength,
      num_inference_steps: req.imageQuality === "hd" ? 28 : 20,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: true,
      output_format: "png",
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
    default: {
      const _exhaustive: never = req.mode;
      throw new Error(`Unknown Standard mode: ${String(_exhaustive)}`);
    }
  }
}