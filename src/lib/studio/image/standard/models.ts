/**
 * LOCKED Standard Image Studio models — do not substitute without product approval.
 */

export const STANDARD_MODELS = {
  textToImage: "fal-ai/flux/schnell",
  imageToImage: "fal-ai/flux-pro/kontext",
  multiImageToImage: "fal-ai/flux-pro/kontext/multi",
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
