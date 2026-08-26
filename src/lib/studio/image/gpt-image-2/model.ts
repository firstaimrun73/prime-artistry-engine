/**
 * GPT Image 2 (fal) — multi-reference edit only.
 * Never used for T2I or single-image I2I.
 *
 * Endpoint: openai/gpt-image-2/edit
 * Quality is hard-locked to "low" for cost control.
 */

export const GPT_IMAGE_2_EDIT_MODEL = "openai/gpt-image-2/edit" as const;

/** Always force low — never medium/high for Standard/Premium multi path. */
export const GPT_IMAGE_2_QUALITY = "low" as const;

export type GptImage2Experience = "standard" | "premium";

/** Product output classes for GPT Image 2 multi path. */
export type GptImage2OutputClass = "sd" | "hd" | "2k";

/**
 * Map product SD/HD/2K + aspect → fal image_size preset.
 * Uses documented presets only (no invented sizes).
 */
export function gptImage2ImageSize(
  output: GptImage2OutputClass,
  aspect?: string | null,
): string {
  const ar = aspect ?? "1:1";
  // Prefer larger presets for HD/2K; SD uses smaller presets.
  if (output === "sd") {
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
  // HD / 2K — use HD presets (model quality stays "low"; size is output framing)
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

/** Normalize any client quality string to product output class; never model quality. */
export function normalizeGptImage2OutputClass(
  experience: GptImage2Experience,
  raw: string | null | undefined,
): GptImage2OutputClass {
  const q = (raw ?? "sd").toLowerCase();
  if (experience === "standard") {
    if (q === "hd") return "hd";
    // 2k/4k/8k/medium/high rejected → sd or hd only; treat non-hd as sd
    return "sd";
  }
  // Premium
  if (q === "2k") return "2k";
  if (q === "hd") return "hd";
  return "sd";
}

/** Reject Standard 2K explicitly (for error messages). */
export function isStandardForbiddenOutput(raw: string | null | undefined): boolean {
  const q = (raw ?? "").toLowerCase();
  return q === "2k" || q === "4k" || q === "8k";
}
