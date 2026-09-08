/**
 * Motio2edit Video Studio — single retail credit pricing engine.
 * 1 credit = $0.01 USD retail.
 * Credits are Motio2edit retail price, NOT fal.ai COGS.
 * All prices rounded to clean 25-credit steps.
 * Customer-facing durations:
 *   Standard: 5s, 10s
 *   Premium:  5s, 10s, 15s
 */

export type MotioVideoTier = "standard" | "premium";
export type MotioVideoQuality = "SD" | "HD"; // maps to 720p / 1080p
export type MotioVideoMode = "text" | "image" | "video" | "audio";

/** Exact retail table from product rules (silent base). */
const RETAIL_TABLE: Record<
  MotioVideoTier,
  Record<MotioVideoQuality, Partial<Record<number, number>>>
> = {
  standard: {
    SD: { 5: 100, 10: 200 },
    HD: { 5: 125, 10: 250 },
  },
  premium: {
    SD: { 5: 125, 10: 225, 15: 350 },
    HD: { 5: 150, 10: 275, 15: 375 },
  },
};

export const SOUND_SURCHARGE = 25;
export const CREDIT_RETAIL_USD = 0.01;

export function roundTo25(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 25;
  return Math.max(25, Math.ceil(n / 25) * 25);
}

export function qualityFromResolution(res: string): MotioVideoQuality {
  if (res === "1080p" || res === "2k" || res === "HD") return "HD";
  return "SD";
}

export function resolutionFromQuality(q: MotioVideoQuality): "720p" | "1080p" {
  return q === "HD" ? "1080p" : "720p";
}

export type MotioVideoPriceInput = {
  tier: MotioVideoTier;
  durationSec: number;
  quality: MotioVideoQuality;
  soundOn: boolean;
  mode?: MotioVideoMode;
};

export type MotioVideoPriceResult = {
  credits: number;
  usd: number;
  supported: boolean;
  reason?: string;
  breakdown: {
    tier: MotioVideoTier;
    mode?: MotioVideoMode;
    durationSec: number;
    quality: MotioVideoQuality;
    soundOn: boolean;
    baseCredits: number;
    soundSurcharge: number;
  };
};

/**
 * Single source of truth for customer-facing credit cost.
 * Used by calculator modal AND Generate button.
 */
export function computeMotioVideoCredits(input: MotioVideoPriceInput): MotioVideoPriceResult {
  const { tier, durationSec, quality, soundOn, mode } = input;
  const table = RETAIL_TABLE[tier]?.[quality];
  const base = table?.[durationSec];

  if (base == null) {
    const allowed =
      tier === "standard"
        ? "Standard supports 5s / 10s only"
        : "Premium supports 5s / 10s / 15s";
    return {
      credits: 0,
      usd: 0,
      supported: false,
      reason: `This combination isn't available yet. ${allowed}. Try a shorter duration, different resolution, or another aspect ratio.`,
      breakdown: {
        tier,
        mode,
        durationSec,
        quality,
        soundOn,
        baseCredits: 0,
        soundSurcharge: 0,
      },
    };
  }

  const soundExtra = soundOn ? SOUND_SURCHARGE : 0;
  const credits = roundTo25(base + soundExtra);
  return {
    credits,
    usd: +(credits * CREDIT_RETAIL_USD).toFixed(2),
    supported: true,
    breakdown: {
      tier,
      mode,
      durationSec,
      quality,
      soundOn,
      baseCredits: base,
      soundSurcharge: soundExtra,
    },
  };
}

/** Allowed durations for UI chips. */
export function allowedDurationsForTier(tier: MotioVideoTier): number[] {
  return tier === "premium" ? [5, 10, 15] : [5, 10];
}

export const TIER_COPY = {
  standard: {
    title: "Standard",
    headline: "Great video without the premium price.",
    supporting: "Fast generation · SD/HD · multiple formats",
  },
  premium: {
    title: "Premium",
    headline: "More detail. More control. More cinematic.",
    supporting: "Enhanced motion · stronger prompt following · finer detail",
  },
} as const;
