/**
 * Auto Edit post-processing — uses the EXISTING Motio2edit watermark path.
 * Do not invent a second watermark system (Sharp/Pillow). generateMedia +
 * secureDownloadImage already enforce brand policy; this helper is the
 * explicit programmatic post-pass for Auto Edit downloads/display when needed.
 */

import { watermarkImage } from "@/lib/watermark";

export type AutoEditPostProcessInput = {
  /** https URL of the model output */
  imageUrl: string;
  /** Free-plan / policy strong watermark */
  strong?: boolean;
};

export type AutoEditPostProcessResult = {
  imageUrl: string;
  watermarkApplied: boolean;
};

/**
 * Programmatic watermark pass (code-path, not an AI prompt).
 * On failure returns the original URL so the user still receives an image.
 */
export async function postProcessAutoEditOutput(
  input: AutoEditPostProcessInput,
): Promise<AutoEditPostProcessResult> {
  if (!input.imageUrl.startsWith("https://")) {
    return { imageUrl: input.imageUrl, watermarkApplied: false };
  }

  try {
    const out = await watermarkImage(input.imageUrl, { strong: input.strong === true });
    return {
      imageUrl: out,
      watermarkApplied: out !== input.imageUrl,
    };
  } catch {
    return { imageUrl: input.imageUrl, watermarkApplied: false };
  }
}
