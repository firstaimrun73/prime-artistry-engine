/**
 * Motio2edit watermark configuration.
 *
 * Watermark is ALWAYS applied AFTER AI generation returns a clean image.
 * The AI provider is never instructed to draw Motio2edit branding.
 *
 * Brand text (primary): exactly "Motio2edit" (only the digit 2 is brand-highlighted).
 * Secondary: small icon mark (top-left) — free/non-premium protection only.
 */

export const WATERMARK_BRAND_TEXT = "Motio2edit" as const;
export const WATERMARK_BRAND_ORANGE = "#f97316";

/** Supported aspect-ratio keys for asset selection (final output dimensions). */
export type WatermarkRatioKey =
  | "16x9"
  | "9x16"
  | "1x1"
  | "4x3"
  | "3x4"
  | "3x2"
  | "2x3"
  | "21x9"
  | "9x21";

export const WATERMARK_RATIO_KEYS: readonly WatermarkRatioKey[] = [
  "16x9",
  "9x16",
  "1x1",
  "4x3",
  "3x4",
  "3x2",
  "2x3",
  "21x9",
  "9x21",
] as const;

/**
 * Detect the closest supported aspect-ratio key from FINAL output pixel size.
 * Input aspect is irrelevant — only the composited image dimensions matter.
 */
export function detectWatermarkRatioKey(
  width: number,
  height: number,
): WatermarkRatioKey {
  if (width < 1 || height < 1) return "1x1";
  const r = width / height;

  const targets: { key: WatermarkRatioKey; value: number }[] = [
    { key: "21x9", value: 21 / 9 },
    { key: "16x9", value: 16 / 9 },
    { key: "3x2", value: 3 / 2 },
    { key: "4x3", value: 4 / 3 },
    { key: "1x1", value: 1 },
    { key: "3x4", value: 3 / 4 },
    { key: "2x3", value: 2 / 3 },
    { key: "9x16", value: 9 / 16 },
    { key: "9x21", value: 9 / 21 },
  ];

  let best: WatermarkRatioKey = "1x1";
  let bestDist = Infinity;
  for (const t of targets) {
    const d = Math.abs(Math.log(r) - Math.log(t.value));
    if (d < bestDist) {
      bestDist = d;
      best = t.key;
    }
  }
  return best;
}

/** Relative size of primary pill vs min(image width, height). */
export const PRIMARY_SIZE_RATIO = 0.028;
/** Relative size of secondary icon vs min(image width, height). */
export const SECONDARY_SIZE_RATIO = 0.055;
/** Safe margin from edges as fraction of min dimension. */
export const EDGE_MARGIN_RATIO = 0.015;

export function primaryAssetName(key: WatermarkRatioKey): string {
  return `watermark-primary-${key}.png`;
}

export function secondaryAssetName(key: WatermarkRatioKey): string {
  return `watermark-secondary-${key}.png`;
}
