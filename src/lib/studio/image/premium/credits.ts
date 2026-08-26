/**
 * LOCKED Premium (pro) T2I / single-I2I credits.
 * Multi credits live in gpt-image-2/credits.ts — do not duplicate here.
 *
 * Aspect ratio = 0 additional credits.
 * Does NOT use Ultra or Standard calculators.
 */

import type { PremiumQuality } from "./models";

export type PremiumMode = "text_to_image" | "image_to_image";

export const PREMIUM_T2I_CREDITS: Record<PremiumQuality, number> = {
  sd: 25,
  hd: 30,
  "2k": 30,
};

export const PREMIUM_I2I_CREDITS: Record<PremiumQuality, number> = {
  sd: 30,
  hd: 35,
  "2k": 40,
};

export type PremiumCreditQuote = {
  credits: number;
  mode: PremiumMode;
  quality: PremiumQuality;
  breakdown: string;
};

export function quotePremiumCredits(opts: {
  mode: PremiumMode;
  quality: PremiumQuality;
}): PremiumCreditQuote {
  const { mode, quality } = opts;
  if (mode === "text_to_image") {
    const credits = PREMIUM_T2I_CREDITS[quality];
    return {
      credits,
      mode,
      quality,
      breakdown: `Premium T2I ${quality.toUpperCase()} ${credits}`,
    };
  }
  const credits = PREMIUM_I2I_CREDITS[quality];
  return {
    credits,
    mode,
    quality,
    breakdown: `Premium I2I ${quality.toUpperCase()} ${credits}`,
  };
}