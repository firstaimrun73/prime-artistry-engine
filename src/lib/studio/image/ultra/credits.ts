/**
 * Isolated Ultra AI credit calculator.
 * Does NOT reuse Standard or Premium (pro) tables.
 */

import type { UltraMode, UltraQuality, UltraCreditQuote } from "./types";

/** Multi-reference base credits by total image count (2–10). */
export const ULTRA_MULTI_BASE: Record<number, number> = {
  2: 40,
  3: 42,
  4: 44,
  5: 47,
  6: 52,
  7: 56,
  8: 60,
  9: 65,
  10: 70,
};

export const ULTRA_QUALITY_MULTIPLIER: Record<UltraQuality, number> = {
  sd: 1.0,
  hd: 1.08,
  "2k": 1.15,
  "4k": 1.3,
  "8k": 1.5,
  "8k_max": 1.7,
};

/** Ultra T2I fixed table (max 50). */
export const ULTRA_T2I_CREDITS: Record<UltraQuality, number> = {
  sd: 30,
  hd: 35,
  "2k": 40,
  "4k": 50,
  "8k": 50,
  "8k_max": 50,
};

/** Ultra single I2I base 35; quality steps upward, capped. */
export const ULTRA_I2I_CREDITS: Record<UltraQuality, number> = {
  sd: 35,
  hd: 38,
  "2k": 42,
  "4k": 48,
  "8k": 52,
  "8k_max": 55,
};

const MULTI_MIN = 40;
const MULTI_MAX = 100;

export function quoteUltraCredits(opts: {
  mode: UltraMode;
  quality: UltraQuality;
  /** Total images (primary + refs) for multi; ignored for T2I/I2I. */
  referenceCount?: number;
}): UltraCreditQuote {
  const { mode, quality } = opts;

  if (mode === "text_to_image") {
    const credits = ULTRA_T2I_CREDITS[quality];
    return {
      credits,
      mode,
      quality,
      referenceCount: 0,
      breakdown: `Ultra T2I ${quality.toUpperCase()} ${credits}`,
    };
  }

  if (mode === "image_to_image") {
    const credits = ULTRA_I2I_CREDITS[quality];
    return {
      credits,
      mode,
      quality,
      referenceCount: 1,
      breakdown: `Ultra I2I ${quality.toUpperCase()} ${credits}`,
    };
  }

  const n = opts.referenceCount ?? 0;
  const base = ULTRA_MULTI_BASE[n];
  if (base == null) {
    throw new Error(`Ultra multi accepts 2–10 images (got ${n}).`);
  }
  const mult = ULTRA_QUALITY_MULTIPLIER[quality];
  let credits = Math.round(base * mult);
  if (credits < MULTI_MIN) credits = MULTI_MIN;
  if (credits > MULTI_MAX) credits = MULTI_MAX;

  return {
    credits,
    mode,
    quality,
    referenceCount: n,
    breakdown: `Ultra multi (${n} imgs, ${quality.toUpperCase()}) ${credits}`,
  };
}

/** Full multi table for audits/tests. */
export function buildUltraMultiCreditTable(): Record<
  number,
  Record<UltraQuality, number>
> {
  const qualities: UltraQuality[] = ["sd", "hd", "2k", "4k", "8k", "8k_max"];
  const out: Record<number, Record<UltraQuality, number>> = {};
  for (let n = 2; n <= 10; n++) {
    out[n] = {} as Record<UltraQuality, number>;
    for (const q of qualities) {
      out[n][q] = quoteUltraCredits({
        mode: "multi_image",
        quality: q,
        referenceCount: n,
      }).credits;
    }
  }
  return out;
}
