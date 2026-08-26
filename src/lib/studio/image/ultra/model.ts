/**
 * LOCKED Ultra AI models — do not substitute without product approval.
 *
 * T2I / single I2I → Flux 2 Pro
 * Multi-reference (2–10) → Seedream 5.0 Pro Edit
 * Enhancement → Topaz Precision (4× max per call)
 */

export const ULTRA_FLUX_2_PRO_T2I = "fal-ai/flux-2-pro" as const;
export const ULTRA_FLUX_2_PRO_EDIT = "fal-ai/flux-2-pro/edit" as const;
export const ULTRA_SEEDREAM_EDIT = "bytedance/seedream/v5/pro/edit" as const;
export const ULTRA_TOPAZ_PRECISION = "topaz/upscale/image/precision" as const;

/** Legacy Topaz endpoint already in repo (fallback adapter). */
export const ULTRA_TOPAZ_LEGACY = "fal-ai/topaz/upscale/image" as const;

export const ULTRA_LIMITS = {
  minMultiRefs: 2,
  maxMultiRefs: 10,
  maxPromptChars: 2000,
  /** Soft target per input image before provider send. */
  maxInputMegapixels: 4,
  /** Seedream native ceiling. */
  seedreamMaxSide: 2048,
} as const;

export type UltraQuality = "sd" | "hd" | "2k" | "4k" | "8k" | "8k_max";

/**
 * Map product quality → Seedream / Flux master image_size preset.
 * Never emit unsupported native 4K/8K — those use enhancement after.
 */
export function ultraMasterImageSize(
  quality: UltraQuality,
  aspect: string,
): string {
  // Prefer documented presets; Seedream default auto_2K for HD+ masters.
  const ar = aspect === "imax" ? "16:9" : aspect;
  if (quality === "sd") {
    switch (ar) {
      case "16:9":
        return "landscape_4_3";
      case "9:16":
        return "portrait_4_3";
      case "4:3":
        return "landscape_4_3";
      case "3:4":
        return "portrait_4_3";
      default:
        return "square";
    }
  }
  // HD / 2K / 4K / 8K / 8K Max master ≈ 2K-class
  switch (ar) {
    case "16:9":
      return "landscape_16_9";
    case "9:16":
      return "portrait_16_9";
    case "4:3":
      return "landscape_4_3";
    case "3:4":
      return "portrait_4_3";
    default:
      return "square_hd";
  }
}

/** Seedream prefers auto_2K for multi masters when aspect is free. */
export function seedreamImageSize(quality: UltraQuality): string {
  if (quality === "sd") return "auto_1K";
  return "auto_2K";
}

/** Approximate master MP for provider cost (Flux). */
export function ultraMasterMegapixels(quality: UltraQuality): number {
  switch (quality) {
    case "sd":
      return 0.25;
    case "hd":
      return 1;
    case "2k":
      return 2;
    case "4k":
      return 3;
    case "8k":
    case "8k_max":
      return 4;
  }
}

/** Target delivery dimensions (width × height) by quality + aspect. */
export function ultraDeliveryDimensions(
  quality: UltraQuality,
  aspect: string,
): { width: number; height: number } {
  const ar = aspect === "imax" ? "21:9" : aspect;
  const targets: Record<UltraQuality, number> = {
    sd: 512,
    hd: 1024,
    "2k": 1440,
    "4k": 2160,
    "8k": 4320,
    "8k_max": 4320,
  };
  const long = targets[quality];
  const map: Record<string, [number, number]> = {
    "1:1": [long, long],
    "4:3": [long, Math.round((long * 3) / 4)],
    "3:4": [Math.round((long * 3) / 4), long],
    "16:9": [long, Math.round((long * 9) / 16)],
    "9:16": [Math.round((long * 9) / 16), long],
    "21:9": [long, Math.round((long * 9) / 21)],
  };
  const [w, h] = map[ar] ?? map["1:1"];
  return { width: w, height: h };
}
