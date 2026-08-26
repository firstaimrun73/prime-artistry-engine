/**
 * Authoritative server-side credit tables for GPT Image 2 multi-reference only.
 * Isolated from Ultra / T2I / single I2I / video / music.
 *
 * Aspect ratio = 0 additional credits.
 * Model quality is always low (not priced).
 */

import type { GptImage2Experience, GptImage2OutputClass } from "./model";

/** Standard: 2–5 total reference images (primary + extra refs in product count). */
const STANDARD_SD: Record<number, number> = {
  2: 30,
  3: 35,
  4: 35,
  5: 40,
};

/** Premium (studioTier "pro"): 2–10 total reference images. */
const PREMIUM_SD: Record<number, number> = {
  2: 35,
  3: 40,
  4: 42,
  5: 45,
  6: 50,
  7: 54,
  8: 58,
  9: 62,
  10: 66,
};

const HD_ADDON = 5;
const PREMIUM_2K_ADDON = 10;
const PREMIUM_MAX = 76;

export type GptImage2CreditQuote = {
  credits: number;
  experience: GptImage2Experience;
  referenceCount: number;
  outputClass: GptImage2OutputClass;
  breakdown: string;
};

/**
 * Quote credits for GPT Image 2 multi path.
 * @param referenceCount Total images sent as image_urls (must be 2–5 standard / 2–10 premium).
 */
export function quoteGptImage2MultiCredits(opts: {
  experience: GptImage2Experience;
  referenceCount: number;
  outputClass: GptImage2OutputClass;
}): GptImage2CreditQuote {
  const { experience, referenceCount: n, outputClass } = opts;

  if (experience === "standard") {
    if (n < 2 || n > 5) {
      throw new Error(`Standard multi-reference accepts 2–5 images (got ${n}).`);
    }
    if (outputClass === "2k") {
      throw new Error("Standard does not support 2K for multi-reference GPT Image 2.");
    }
    const base = STANDARD_SD[n];
    if (base == null) throw new Error(`No Standard credit row for ${n} images.`);
    const credits = outputClass === "hd" ? base + HD_ADDON : base;
    return {
      credits,
      experience,
      referenceCount: n,
      outputClass,
      breakdown: `Standard multi GPT Image 2 (${n} imgs, ${outputClass.toUpperCase()}) ${credits}`,
    };
  }

  // Premium
  if (n < 2 || n > 10) {
    throw new Error(`Premium multi-reference accepts 2–10 images (got ${n}).`);
  }
  const base = PREMIUM_SD[n];
  if (base == null) throw new Error(`No Premium credit row for ${n} images.`);
  let credits = base;
  if (outputClass === "hd") credits = base + HD_ADDON;
  else if (outputClass === "2k") credits = base + PREMIUM_2K_ADDON;
  if (credits > PREMIUM_MAX) credits = PREMIUM_MAX;
  return {
    credits,
    experience,
    referenceCount: n,
    outputClass,
    breakdown: `Premium multi GPT Image 2 (${n} imgs, ${outputClass.toUpperCase()}) ${credits}`,
  };
}

export const GPT_IMAGE_2_STANDARD_LIMITS = {
  minRefs: 2,
  maxRefs: 5,
  maxMpPerImage: 4,
  maxCombinedMp: 20,
  maxPromptChars: 2000,
} as const;

export const GPT_IMAGE_2_PREMIUM_LIMITS = {
  minRefs: 2,
  maxRefs: 10,
  maxMpPerImage: 4,
  maxCombinedMp: 40,
  maxPromptChars: 2000,
} as const;
