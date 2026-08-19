/**
 * Video credit pricing — single source of truth (AI Video Studio blueprint §2).
 *
 * Retail rate: $0.004 / credit
 * Base generation: 125 credits ≈ $0.50 for a 5s Standard clip
 *
 * Frontend MUST call computeVideoCreditCost for live previews.
 * Server MUST re-run the same function before charging.
 */

import type { PlanId } from "./plans";

export const CREDIT_RETAIL_USD = 0.004;

/** Base credits for one 5-second Standard generation. */
export const VIDEO_BASE_CREDITS = 125;

export type VideoDurationSec = 5 | 10 | 15 | 20 | 25 | 30;
export type VideoAspectId = "16:9" | "9:16" | "1:1" | "4:3" | "custom";
export type VideoQualityId = "480p" | "720p" | "1080p" | "2k" | "4k" | "8k";
/** User-facing tier — never expose underlying model vendor names. */
export type VideoModelTierUi = "standard" | "advanced";

export const VIDEO_DURATION_OPTIONS: VideoDurationSec[] = [5, 10, 15, 20, 25, 30];

export const VIDEO_QUALITY_OPTIONS: {
  id: VideoQualityId;
  label: string;
  /** Multiplier on base duration cost */
  multiplier: number;
  minPlan: PlanId;
  hint: string;
}[] = [
  { id: "480p", label: "480p", multiplier: 0.85, minPlan: "lite", hint: "Fastest, lowest cost" },
  { id: "720p", label: "720p", multiplier: 0.9, minPlan: "lite", hint: "Good for drafts" },
  { id: "1080p", label: "1080p", multiplier: 1, minPlan: "lite", hint: "Recommended" },
  { id: "2k", label: "2K", multiplier: 1.25, minPlan: "plus", hint: "Extra detail (+25%)" },
  { id: "4k", label: "4K", multiplier: 1.6, minPlan: "pro", hint: "Maximum sharpness (+60%)" },
  { id: "8k", label: "8K", multiplier: 2.2, minPlan: "studio", hint: "Premium only (+120%)" },
];

/** Duration → base credits (Standard tier). Linear-ish scale past 5s. */
export const VIDEO_DURATION_BASE_CREDITS: Record<VideoDurationSec, number> = {
  5: 125,
  10: 220,
  15: 320,
  20: 420,
  25: 520,
  30: 620,
};

/**
 * Advanced (top-model) credits — higher real API cost + ~35% buffer.
 * Blueprint placeholders for 5/10/15s; extended for longer clips.
 */
export const VIDEO_ADVANCED_BASE_CREDITS: Record<VideoDurationSec, number> = {
  5: 800,
  10: 1500,
  15: 2200,
  20: 2900,
  25: 3600,
  30: 4300,
};

export type VideoPriceInput = {
  duration: VideoDurationSec;
  quality: VideoQualityId;
  aspect: VideoAspectId;
  tier: VideoModelTierUi;
  /** Video→Video enhance path uses a fixed enhance cost */
  mode?: "generate" | "enhance";
};

export type VideoPriceResult = {
  credits: number;
  usdEstimate: number;
  breakdown: {
    base: number;
    qualityMultiplier: number;
    aspectSurcharge: number;
    tier: VideoModelTierUi;
  };
};

export function computeVideoCreditCost(input: VideoPriceInput): VideoPriceResult {
  if (input.mode === "enhance") {
    const credits = 200;
    return {
      credits,
      usdEstimate: +(credits * CREDIT_RETAIL_USD).toFixed(2),
      breakdown: {
        base: credits,
        qualityMultiplier: 1,
        aspectSurcharge: 0,
        tier: "standard",
      },
    };
  }

  const base =
    input.tier === "advanced"
      ? VIDEO_ADVANCED_BASE_CREDITS[input.duration]
      : VIDEO_DURATION_BASE_CREDITS[input.duration];

  const q =
    VIDEO_QUALITY_OPTIONS.find((o) => o.id === input.quality)?.multiplier ?? 1;

  // Standard ratios free; custom +10%
  const aspectMult = input.aspect === "custom" ? 1.1 : 1;

  const credits = Math.max(1, Math.round(base * q * aspectMult));
  return {
    credits,
    usdEstimate: +(credits * CREDIT_RETAIL_USD).toFixed(2),
    breakdown: {
      base,
      qualityMultiplier: q,
      aspectSurcharge: aspectMult > 1 ? 0.1 : 0,
      tier: input.tier,
    },
  };
}

/** Efficiency 0–1: low = fast & cheap, high = slow & max quality */
export function videoEfficiencyScore(input: {
  duration: VideoDurationSec;
  quality: VideoQualityId;
  tier: VideoModelTierUi;
}): number {
  const durPart = (input.duration - 5) / 25; // 0..1
  const qIdx = VIDEO_QUALITY_OPTIONS.findIndex((o) => o.id === input.quality);
  const qPart = Math.max(0, qIdx) / Math.max(1, VIDEO_QUALITY_OPTIONS.length - 1);
  const tierPart = input.tier === "advanced" ? 0.35 : 0;
  return Math.min(1, durPart * 0.45 + qPart * 0.4 + tierPart);
}

export function formatCreditUsd(credits: number): string {
  return `$${(credits * CREDIT_RETAIL_USD).toFixed(2)}`;
}

/** User-facing labels — never name Kling / Veo / Runway. */
export const TIER_UI = {
  standard: {
    label: "Standard",
    title: "Standard Motion AI",
    blurb: "Fast, reliable motion for everyday clips.",
  },
  advanced: {
    label: "Advanced",
    title: "Studio Pro Motion",
    blurb: "Sharper motion, better physics, longer shots.",
  },
} as const;

export const VIDEO_PROGRESS_STAGES = [
  { id: "analysing", label: "Analysing", hint: "Parsing prompt & references" },
  { id: "shooting", label: "Shooting", hint: "Render pass" },
  { id: "editing", label: "Editing", hint: "Trim & timing" },
  { id: "fix", label: "Fix", hint: "Quality pass" },
] as const;

/** Rough ETA seconds for UI (not a hard promise). */
export function estimateVideoEtaSeconds(input: {
  duration: VideoDurationSec;
  quality: VideoQualityId;
  tier: VideoModelTierUi;
}): number {
  const base = input.tier === "advanced" ? 90 : 45;
  const durExtra = (input.duration / 5 - 1) * 20;
  const qExtra =
    input.quality === "8k" ? 60 : input.quality === "4k" ? 40 : input.quality === "2k" ? 20 : 0;
  return Math.round(base + durExtra + qExtra);
}
