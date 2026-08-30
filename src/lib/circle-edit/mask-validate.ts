/**
 * Server-side Circle Add mask preflight. FAIL BEFORE FAL if invalid.
 * REMOVE path does not use this module.
 */
export const MASK_COVERAGE_MIN_PERCENT = 0.15;
export const MASK_COVERAGE_MAX_PERCENT = 85;

export type MaskBoundingBox = { x: number; y: number; width: number; height: number };

export type ClientMaskStats = {
  width: number;
  height: number;
  coveragePercent: number;
  paintedPixels?: number;
  totalPixels?: number;
  boundingBox?: MaskBoundingBox | null;
};

export type MaskValidationOk = {
  ok: true;
  imageWidth: number;
  imageHeight: number;
  maskWidth: number;
  maskHeight: number;
  maskCoveragePercent: number;
  maskBoundingBox: MaskBoundingBox | null;
  dimensionsMatch: boolean;
};

export type MaskValidationFail = { ok: false; reason: string };
export type MaskValidationResult = MaskValidationOk | MaskValidationFail;

export function validateCircleAddMask(opts: {
  imageUrl?: string | null;
  maskImageUrl?: string | null;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  clientMaskStats?: ClientMaskStats | null;
}): MaskValidationResult {
  if (!opts.imageUrl || typeof opts.imageUrl !== "string" || !opts.imageUrl.startsWith("https://")) {
    return { ok: false, reason: "Circle Add requires a valid source image URL." };
  }
  if (!opts.maskImageUrl || typeof opts.maskImageUrl !== "string" || !opts.maskImageUrl.startsWith("https://")) {
    return { ok: false, reason: "Circle Add requires a valid mask image URL." };
  }
  const maskPath = opts.maskImageUrl.split("?")[0]?.toLowerCase() ?? "";
  if (/\.(jpe?g|webp|gif)$/i.test(maskPath)) {
    return { ok: false, reason: "Circle Add mask must be a PNG (binary white = edit). Re-export the mask." };
  }
  const imageWidth = Math.round(opts.sourceWidth || 0);
  const imageHeight = Math.round(opts.sourceHeight || 0);
  if (imageWidth < 64 || imageHeight < 64) {
    return { ok: false, reason: "Circle Add source image dimensions are missing or too small." };
  }
  if (imageWidth > 30000 || imageHeight > 30000) {
    return { ok: false, reason: "Circle Add source image dimensions exceed safe limits." };
  }
  let maskWidth = imageWidth;
  let maskHeight = imageHeight;
  let coveragePercent = -1;
  let bbox: MaskBoundingBox | null = null;
  if (opts.clientMaskStats) {
    const s = opts.clientMaskStats;
    maskWidth = Math.round(s.width || 0);
    maskHeight = Math.round(s.height || 0);
    coveragePercent = Number(s.coveragePercent);
    if (s.boundingBox && Number.isFinite(s.boundingBox.width) && s.boundingBox.width > 0) {
      bbox = {
        x: Math.round(s.boundingBox.x),
        y: Math.round(s.boundingBox.y),
        width: Math.round(s.boundingBox.width),
        height: Math.round(s.boundingBox.height),
      };
    }
  }
  if (maskWidth < 64 || maskHeight < 64) {
    return { ok: false, reason: "Circle Add mask dimensions are missing or too small." };
  }
  const dimensionsMatch =
    Math.abs(maskWidth - imageWidth) <= 1 && Math.abs(maskHeight - imageHeight) <= 1;
  if (opts.clientMaskStats && !dimensionsMatch) {
    return {
      ok: false,
      reason: `Circle Add mask size (${maskWidth}x${maskHeight}) does not match image (${imageWidth}x${imageHeight}).`,
    };
  }
  if (coveragePercent >= 0) {
    if (coveragePercent < MASK_COVERAGE_MIN_PERCENT) {
      return { ok: false, reason: "Mask is empty or nearly empty. Paint the area where the object should appear." };
    }
    if (coveragePercent > MASK_COVERAGE_MAX_PERCENT) {
      return { ok: false, reason: "Mask covers too much of the image. Paint a smaller region for the object." };
    }
  }
  return {
    ok: true,
    imageWidth,
    imageHeight,
    maskWidth,
    maskHeight,
    maskCoveragePercent: coveragePercent >= 0 ? coveragePercent : -1,
    maskBoundingBox: bbox,
    dimensionsMatch,
  };
}
