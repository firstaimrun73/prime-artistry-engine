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

/** 21:9 ultra-wide custom dims by quality (NOT IMAX). */
function premium21x9Size(quality: PremiumQuality): { width: number; height: number } {
  // Keep long side in line with other presets; height = width * 9/21
  if (quality === "2k") return { width: 1920, height: 823 };
  if (quality === "hd") return { width: 1344, height: 576 };
  return { width: 768, height: 329 };
}

/**
 * image_size for Flux 2 Pro T2I.
 * SD ~0.25 MP, HD ~1 MP, 2K ~2 MP — via documented presets, or custom for 21:9.
 */
export function premiumFlux2ProImageSize(
  quality: PremiumQuality,
  aspect?: string | null,
): string | { width: number; height: number } {
  const ar = aspect ?? "1:1";
  if (ar === "21:9") {
    return premium21x9Size(quality);
  }
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
