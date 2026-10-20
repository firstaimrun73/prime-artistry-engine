/**
 * LOCKED Standard Image Studio credits — authoritative for Standard path.
 *
 * Text → Image: SD 20, HD 25 (any aspect ratio = +0)
 * Image → Image (single): SD 25, HD 30
 * Multi (total images 2–5): SD 30/35/40/40 → HD +5 = 35/40/45/45
 * Circle to Remove: 25 flat
 * Circle to Add: 25 flat
 *
 * Aspect ratio = 0 additional credits.
 * Amounts are product-locked; model change (Kontext multi) does not change quotes.
 */

import type { StandardCreditQuote, StandardImageMode, StandardImageQuality } from "./types";

export const STANDARD_CREDITS = {
  textToImageSd: 20,
  textToImageHd: 25,
  imageToImageSd: 25,
  imageToImageHd: 30,
  /** @deprecated Prefer imageToImageSd — kept for older test imports. */
  imageToImage: 25,
  multi1to2: 30,
  multi3to4: 35,
  multi5: 40,
  circleToRemove: 25,
  circleToAdd: 25,
} as const;

/** Total images (primary + refs) → SD base credits. HD = base + 5. */
const MULTI_SD: Record<number, number> = {
  2: 30,
  3: 35,
  4: 35,
  5: 40,
};

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

  if (mode === "circle_to_add") {
    return {
      credits: STANDARD_CREDITS.circleToAdd,
      mode,
      breakdown: `Circle add ${STANDARD_CREDITS.circleToAdd}`,
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
    const hd = opts.imageQuality === "hd";
    const credits = hd ? STANDARD_CREDITS.imageToImageHd : STANDARD_CREDITS.imageToImageSd;
    return {
      credits,
      mode,
      breakdown: `Image→Image ${hd ? "HD" : "SD"} ${credits}`,
    };
  }

  // multi_image_to_image
  const n = Math.max(0, opts.referenceCount ?? 0);
  if (n < 2 || n > 5) {
    throw new Error(`Standard multi-reference accepts 2–5 images (got ${n}).`);
  }
  const base = MULTI_SD[n];
  if (base == null) throw new Error(`No Standard multi credit row for ${n} images.`);
  const hd = opts.imageQuality === "hd";
  const credits = hd ? base + 5 : base;
  return {
    credits,
    mode,
    breakdown: `Standard multi Kontext (${n} imgs, ${hd ? "HD" : "SD"}) ${credits}`,
  };
}
