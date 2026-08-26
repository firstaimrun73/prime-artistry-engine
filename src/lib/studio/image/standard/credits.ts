/**
 * LOCKED Standard Image Studio credits — authoritative for Standard path.
 *
 * Text → Image: SD 20, HD 25
 * Image → Image: 25 (no fake HD premium)
 * Multi (GPT Image 2, 2–5 total images): gpt-image-2 credit table (SD/HD)
 * Circle to Remove: 25 flat
 *
 * Aspect ratio = 0 additional credits.
 */

import {
  quoteGptImage2MultiCredits,
  type GptImage2OutputClass,
} from "@/lib/studio/image/gpt-image-2";
import type { StandardCreditQuote, StandardImageMode, StandardImageQuality } from "./types";

export const STANDARD_CREDITS = {
  textToImageSd: 20,
  textToImageHd: 25,
  imageToImage: 25,
  multi1to2: 30,
  multi3to4: 35,
  multi5: 40,
  circleToRemove: 25,
} as const;

export function quoteStandardCredits(opts: {
  mode: StandardImageMode;
  /** Total images in multi path (primary + refs), 2–5. */
  referenceCount?: number;
  imageQuality?: StandardImageQuality | null;
}): StandardCreditQuote {
  const { mode } = opts;

  if (mode === "circle_to_remove") {
    return {
      credits: STANDARD_CREDITS.circleToRemove,
      mode,
      breakdown: `Circle remove ${STANDARD_CREDITS.circleToRemove}`,
    };
  }

  if (mode === "text_to_image") {
    const hd = opts.imageQuality === "hd";
    const credits = hd ? STANDARD_CREDITS.textToImageHd : STANDARD_CREDITS.textToImageSd;
    return {
      credits,
      mode,
      breakdown: `Text→Image ${hd ? "HD" : "SD"} ${credits}`,
    };
  }

  if (mode === "image_to_image") {
    return {
      credits: STANDARD_CREDITS.imageToImage,
      mode,
      breakdown: `Image→Image ${STANDARD_CREDITS.imageToImage}`,
    };
  }

  const n = Math.max(0, opts.referenceCount ?? 0);
  const outputClass: GptImage2OutputClass = opts.imageQuality === "hd" ? "hd" : "sd";
  const q = quoteGptImage2MultiCredits({
    experience: "standard",
    referenceCount: n,
    outputClass,
  });
  return {
    credits: q.credits,
    mode,
    breakdown: q.breakdown,
  };
}
