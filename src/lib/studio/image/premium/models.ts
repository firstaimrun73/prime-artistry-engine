/**
 * LOCKED Premium (studioTier "pro") models — isolated from Ultra.
 *
 * T2I → fal-ai/flux-2-pro
 * Single I2I → fal-ai/flux-pro/kontext (instruction edit; preserves scene)
 * Multi → openai/gpt-image-2/edit (handled in multi-image.ts)
 *
 * Never route Premium through Ultra or Seedream.
 * Single I2I uses Kontext (not Flux Dev style-transfer).
 */

export const PREMIUM_MODELS = {
  textToImage: "fal-ai/flux-2-pro",
  imageToImage: "fal-ai/flux-pro/kontext",
} as const;

export type PremiumModelId = (typeof PREMIUM_MODELS)[keyof typeof PREMIUM_MODELS];

export type PremiumQuality = "sd" | "hd" | "2k";

/**
 * image_size for Flux 2 Pro T2I.
 * SD \~0.25 MP, HD \~1 MP, 2K \~2 MP — via documented presets only.
 */
export function premiumFlux2ProImageSize(
  quality: PremiumQuality,
  aspect?: string | null,
): string {
  const ar = aspect ?? "1:1";
  if (quality === "2k") {
    switch (ar) {
      case "16:9":
        return "landscape_16_9";
      case "9:16":
        return "portrait_16_9";
      case "4:3":
        return "landscape_4_3";
      case "3:4":
        return "portrait_4_3";
      case "1:1":
      default:
        return "square_hd";
    }
  }
  if (quality === "hd") {
    switch (ar) {
      case "16:9":
        return "landscape_16_9";
      case "9:16":
        return "portrait_16_9";
      case "4:3":
        return "landscape_4_3";
      case "3:4":
        return "portrait_4_3";
      case "1:1":
      default:
        return "square_hd";
    }
  }
  // SD
  switch (ar) {
    case "16:9":
      return "landscape_4_3";
    case "9:16":
      return "portrait_4_3";
    case "4:3":
      return "landscape_4_3";
    case "3:4":
      return "portrait_4_3";
    case "1:1":
    default:
      return "square";
  }
}
