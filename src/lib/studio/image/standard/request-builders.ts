/**
 * Build fal request bodies for locked Standard models.
 * Never reorder multi-image URLs. Never drop the source image for I2I.
 * enhance_prompt is always false — do not silently rewrite user prompts.
 */

import { STANDARD_MODELS, schnellImageSize } from "./models";
import type { StandardFalStep, StandardValidationOk } from "./types";

const IDENTITY =
  "Preserve the exact same person and face identity. Only change what the user requested. Keep unrelated areas stable. Photorealistic. No watermark.";

export function buildTextToImageStep(req: StandardValidationOk): StandardFalStep {
  return {
    label: "standard text-to-image (flux schnell)",
    model: STANDARD_MODELS.textToImage,
    body: {
      prompt: req.prompt,
      image_size: schnellImageSize(req.aspectRatio, req.imageQuality),
      num_images: 1,
      num_inference_steps: req.imageQuality === "hd" ? 8 : 4,
      enable_safety_checker: true,
      output_format: "png",
    },
  };
}

export function buildImageToImageStep(req: StandardValidationOk): StandardFalStep {
  if (!req.imageUrl) {
    throw new Error("Image → Image requires a source image.");
  }
  const prompt = `${req.prompt}. ${IDENTITY}`;
  return {
    label: "standard image-to-image (flux kontext)",
    model: STANDARD_MODELS.imageToImage,
    body: {
      prompt,
      image_url: req.imageUrl,
      guidance_scale: 3.0,
      num_images: 1,
      output_format: "png",
      safety_tolerance: "2",
      enhance_prompt: false,
    },
  };
}

/**
 * Multi: image_urls = [base, ref1, ref2, ...] in exact upload order.
 * Reference #1 stays index 1 in the array after base.
 */
export function buildMultiImageStep(req: StandardValidationOk): StandardFalStep {
  if (!req.imageUrl) {
    throw new Error("Multiple Image requires a base image.");
  }
  const refs = req.referenceImageUrls;
  if (refs.length < 1 || refs.length > 5) {
    throw new Error("Multiple Image requires 1–5 reference images.");
  }
  const image_urls = [req.imageUrl, ...refs];
  const prompt =
    `${req.prompt}. Use image 1 as the base subject. ` +
    `Images 2–${image_urls.length} are references in order (reference #1 = image 2). ` +
    `Do not reorder references. Preserve face and identity from image 1 unless the user asks otherwise. ` +
    `Photorealistic. No watermark.`;

  return {
    label: `standard multi-image (kontext multi x${image_urls.length})`,
    model: STANDARD_MODELS.multiImageToImage,
    body: {
      prompt,
      image_urls,
      guidance_scale: 3.5,
      num_images: 1,
      output_format: "png",
      safety_tolerance: "2",
      enhance_prompt: false,
    },
  };
}

/**
 * Circle erase: original image + mask at original pixel dimensions.
 * Never use editor canvas screenshots as the source image.
 */
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
      // Optional guidance text for fill; model is erase-first
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
