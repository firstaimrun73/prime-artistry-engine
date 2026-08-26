/**
 * LOCKED Standard Image Studio models — do not substitute without product approval.
 *
 * Multi-reference (2+ total images) uses GPT Image 2 edit @ quality low only.
 * Single-image I2I and T2I remain on Flux paths.
 */

import { GPT_IMAGE_2_EDIT_MODEL } from "@/lib/studio/image/gpt-image-2";

export const STANDARD_MODELS = {
  textToImage: "fal-ai/flux/schnell",
  imageToImage: "fal-ai/flux-pro/kontext",
  /** Multi-reference only (2–5 total images). Never for 0–1 image. */
  multiImageToImage: GPT_IMAGE_2_EDIT_MODEL,
  circleToRemove: "fal-ai/flux-pro/v1/erase",
} as const;

export type StandardModelId = (typeof STANDARD_MODELS)[keyof typeof STANDARD_MODELS];

/** Schnell image_size for aspect + SD/HD. */
export function schnellImageSize(
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
