/**
 * Shared mask statistics for Circle Add preflight + prompt positioning.
 * Client may compute; server validates and never trusts coverage alone for charge.
 */

export type MaskBoundingBox = { x: number; y: number; width: number; height: number };

export type MaskStatsPayload = {
  width: number;
  height: number;
  coveragePercent: number;
  paintedPixels: number;
  totalPixels: number;
  boundingBox: MaskBoundingBox | null;
  /** Normalized 0–1 center of painted region */
  centerX: number;
  centerY: number;
};

/** Build human placement line for server prompt (still-image). */
export function buildMaskPositionPrompt(stats: MaskStatsPayload | null | undefined): string {
  if (!stats || !stats.boundingBox || stats.coveragePercent <= 0) {
    return "Place the object only inside the white masked region. Leave every black pixel unchanged.";
  }
  const { boundingBox: b, width, height, centerX, centerY, coveragePercent } = stats;
  const relW = Math.round((b.width / Math.max(1, width)) * 100);
  const relH = Math.round((b.height / Math.max(1, height)) * 100);
  const horiz =
    centerX < 0.33 ? "left third of the frame" : centerX > 0.66 ? "right third of the frame" : "horizontal center";
  const vert =
    centerY < 0.33 ? "upper third" : centerY > 0.66 ? "lower third" : "vertical middle";
  return [
    `Place exactly one instance of the object inside the white masked region only.`,
    `Approximate selection covers ~${coveragePercent.toFixed(1)}% of the image, near the ${horiz} and ${vert}.`,
    `Selection bounding box about ${relW}% × ${relH}% of the frame (natural px ${b.width}×${b.height} at origin ${b.x},${b.y}).`,
    `Scale the object to fit naturally inside this region without stretching to fill the entire mask if a smaller physical size is correct.`,
    `Match ground contact, perspective, and lighting of the surrounding unmasked scene.`,
    `Leave every black (unmasked) pixel unchanged.`,
  ].join(" ");
}
