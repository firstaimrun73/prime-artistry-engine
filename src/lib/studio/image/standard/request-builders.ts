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
 * Flux Dev I2I strength:
 * 0.1 ≈ keep original · 1.0 ≈ near full regenerate.
 * Edit prompts ("sharper", "brighter") must use LOW strength or the model
 * ignores the source and invents a new scene (looks like accidental T2I).
 */
export function resolveStandardI2IStrength(
  prompt: string,
  provided?: number | null,
): number {
  if (typeof provided === "number" && provided >= 0.01 && provided <= 1) {
    return provided;
  }
  const p = prompt.toLowerCase();
  // Preserve composition for enhance / cleanup prompts
  if (
    /\b(sharp|sharper|bright|brighter|clear|clearer|enhance|cleaner|upscale|denoise|noise|detail|quality|fix lighting|color balance|more detail)\b/.test(
      p,
    )
  ) {
    return 0.4;
  }
  // Strong stylistic / replace transforms
  if (
    /\b(replace|transform into|change into|convert to|in the style of|as a|turn into|make it a)\b/.test(
      p,
    )
  ) {
    return 0.72;
  }
  // Balanced default for general edits (keep subject recognizable)
  return 0.55;
}

export function buildImageToImageStep(req: StandardValidationOk): StandardFalStep {
  if (!req.imageUrl || !req.imageUrl.startsWith("https://")) {
    throw new Error("Image → Image requires a valid HTTPS source image URL.");
  }
  // Flux Dev I2I — params: prompt, image_url, strength, steps, guidance only.
  const strength = resolveStandardI2IStrength(req.prompt, req.strength);
  // Mild structural anchor so the model treats this as an edit, not a fresh scene.
  const prompt = req.prompt.trim().toLowerCase().startsWith("edit ")
    ? req.prompt
    : `Edit the provided photo in place. ${req.prompt}`;
  return {
    label: `standard I2I flux-dev ${req.imageQuality === "hd" ? "HD" : "SD"} s=${strength}`,
    model: STANDARD_MODELS.imageToImage,
    body: {
      prompt,
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
