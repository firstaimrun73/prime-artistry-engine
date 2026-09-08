/**
 * Motio2edit Video Studio — single retail credit pricing engine.
 * CREDIT_PRICING_VERSION: 2026-09-v2
 *
 * 1 credit = $0.01 USD retail face value.
 * Credits are Motio2edit retail price, NOT fal.ai COGS.
 * All prices use clean increments (prefer 25/50 steps for video).
 *
 * Customer-facing durations:
 *   Standard: 5s, 10s   (15s unavailable)
 *   Premium:  5s, 10s, 15s
 *
 * Economics target (internal):
 * - Prefer Kling / LTX / economical Wan-class models for Standard.
 * - Premium routes to stronger models only when quality floor requires it.
 * - Avoid default routing to Seedance / Veo / Sora (high COGS).
 * - ~$0.25–0.55 backend for a good 5s I2V is acceptable if quality justifies it.
 * - $4.99 / 350 credits must remain useful for mixed image + video use.
 */

export type MotioVideoTier = "standard" | "premium";
export type MotioVideoQuality = "SD" | "HD"; // maps to 720p / 1080p
export type MotioVideoMode = "text" | "image" | "video" | "audio";

export const CREDIT_PRICING_VERSION = "2026-09-v2";
export const CREDIT_RETAIL_USD = 0.01;

/**
 * Silent base retail table (credits).
 * Designed so Lite ($4.99 / 350 cr) can deliver several good Standard clips
 * while still covering realistic Kling/LTX-class COGS + margin + PayPal fees.
 */
const RETAIL_TABLE: Record<
  MotioVideoTier,
  Record<MotioVideoQuality, Partial<Record<number, number>>>
> = {
  standard: {
    SD: { 5: 50, 10: 100 },
    HD: { 5: 65, 10: 125 },
  },
  premium: {
    SD: { 5: 75, 10: 150, 15: 225 },
    HD: { 5: 100, 10: 175, 15: 250 },
  },
};

/** Extra when user requests synchronized sound and model supports it. */
export const SOUND_SURCHARGE = 25;

export function roundTo25(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 25;
  return Math.max(25, Math.ceil(n / 25) * 25);
}

export function qualityFromResolution(res: string): MotioVideoQuality {
  if (res === "1080p" || res === "2k" || res === "HD" || res === "4k") return "HD";
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
 * Single source of truth for customer-facing video credit cost.
 * Used by calculator modal AND Generate button — must stay in sync.
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
      reason: `This combination isn't available yet. ${allowed}. Try a shorter duration or different quality.`,
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

  // V2V / A2V can carry slightly higher retail when backend cost is higher.
  // Keep transparent: small fixed uplift, still clean numbers.
  let modeUplift = 0;
  if (mode === "video") modeUplift = 25;
  if (mode === "audio") modeUplift = 15;

  const soundExtra = soundOn ? SOUND_SURCHARGE : 0;
  const credits = roundTo25(base + soundExtra + modeUplift);
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

/** Allowed durations for UI chips (never show 15s on Standard). */
export function allowedDurationsForTier(tier: MotioVideoTier): number[] {
  return tier === "premium" ? [5, 10, 15] : [5, 10];
}

export const TIER_COPY = {
  standard: {
    title: "Standard",
    headline: "Fast, dependable generations for everyday ideas.",
    supporting: "Great quality. Great value. SD/HD · 5s & 10s",
  },
  premium: {
    title: "Premium",
    headline: "More detail, stronger image preservation and better prompt adherence.",
    supporting: "Made for your final shots · up to 15s · HD",
  },
} as const;
