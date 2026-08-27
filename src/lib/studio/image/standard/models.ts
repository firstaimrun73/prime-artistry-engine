/**
 * LOCKED Standard Image Studio models — do not substitute without product approval.
 *
 * T2I SD  → fal-ai/flux-2/klein/4b
 * T2I HD  → fal-ai/flux-2/klein/9b
 * Single I2I → fal-ai/flux-pro/kontext (instruction edit; preserves scene)
 * Multi (2–5 total images) → openai/gpt-image-2/edit @ quality low only
 *
 * Never route Standard through Schnell, Seedream, or Ultra.
 * Single I2I uses Kontext (not Flux Dev style-transfer).
 */

import { GPT_IMAGE_2_EDIT_MODEL } from "@/lib/studio/image/gpt-image-2";

export const STANDARD_MODELS = {
  /** T2I SD (\~0.25 MP target via image_size presets). */
  textToImageSd: "fal-ai/flux-2/klein/4b",
  /** T2I HD (\~1 MP target via image_size presets). */
  textToImageHd: "fal-ai/flux-2/klein/9b",
  /** Single-image instruction edit only (never multi). FLUX.1 Kontext [pro]. */
  imageToImage: "fal-ai/flux-pro/kontext",
  /** Multi-reference only (2–5 total images). Never for 0–1 image. */
  multiImageToImage: GPT_IMAGE_2_EDIT_MODEL,
  circleToRemove: "fal-ai/flux-pro/v1/erase",
} as const;

export type StandardModelId = (typeof STANDARD_MODELS)[keyof typeof STANDARD_MODELS];

/** Resolve T2I model by quality (default SD → 4B). */
export function standardTextToImageModel(
  quality?: "sd" | "hd" | null,
): typeof STANDARD_MODELS.textToImageSd | typeof STANDARD_MODELS.textToImageHd {
  return quality === "hd"
    ? STANDARD_MODELS.textToImageHd
    : STANDARD_MODELS.textToImageSd;
}

/**
 * image_size presets for Flux 2 Klein T2I.
 * SD → smaller presets (\~0.25 MP class); HD → larger presets (\~1 MP class).
 * Uses only documented fal image_size enum strings.
 */
export function kleinImageSize(
  aspect?: string | null,
  quality?: "sd" | "hd" | null,
): string {
  const hd = quality === "hd";
  switch (aspect) {
    case "16:9":
      return hd ? "landscape_16_9" : "landscape_4_3";
    case "9:16":
      return hd ? "portrait_16_9" : "portrait_4_3";
    case "4:3":
      return "landscape_4_3";
    case "3:4":
      return "portrait_4_3";
    case "1:1":
    default:
      return hd ? "square_hd" : "square";
  }
}

/** @deprecated Use kleinImageSize — kept for residual callers. */
export const schnellImageSize = kleinImageSize;
