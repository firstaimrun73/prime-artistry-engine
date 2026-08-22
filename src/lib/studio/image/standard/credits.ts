/**
 * LOCKED Standard Image Studio credits — authoritative for Standard path.
 *
 * Text → Image: SD 25, HD 30
 * Image → Image: 25 (no fake HD premium)
 * Multi 1–2 refs: 30 | 3–4: 35 | 5: 40 (no fake HD)
 * Circle to Remove: 25 flat
 */

import type { StandardCreditQuote, StandardImageMode, StandardImageQuality } from "./types";

export const STANDARD_CREDITS = {
  textToImageSd: 25,
  textToImageHd: 30,
  imageToImage: 25,
  multi1to2: 30,
  multi3to4: 35,
  multi5: 40,
  circleToRemove: 25,
} as const;

export function quoteStandardCredits(opts: {
  mode: StandardImageMode;
  /** Ordered reference count (multi only). */
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

  // multi_image_to_image
  const n = Math.max(0, opts.referenceCount ?? 0);
  let credits = STANDARD_CREDITS.multi1to2;
  if (n >= 5) credits = STANDARD_CREDITS.multi5;
  else if (n >= 3) credits = STANDARD_CREDITS.multi3to4;
  return {
    credits,
    mode,
    breakdown: `Multi-image (${n} ref${n === 1 ? "" : "s"}) ${credits}`,
  };
}
