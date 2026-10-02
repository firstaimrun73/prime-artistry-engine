/**
 * Motio2edit Video Studio — customer-facing credit estimates.
 *
 * Authoritative spend rule (server via billing/customer-pricing):
 *   TOTAL provider COGS (video + audio) → Video COGS staircase → customer credits
 *
 * Face value: 1 Motio2edit credit = $0.01
 * Do NOT add Premium/Image flat surcharges on top of the staircase.
 * Do NOT use COGS×100 or 1.86¢ face for Video.
 */

import {
  computeProviderCogsUsd,
  selectApprovedVideoRoute,
  type VideoGenMode,
  type VideoProductMode,
  type VideoResolution,
  type VideoAspect,
} from "@/lib/video/video-capability-registry";
import {
  videoCogsToCredits,
  VIDEO_COGS_TIER_UNDEFINED,
} from "@/lib/billing/customer-pricing";
import { VIDEO_CREDIT_FACE_CENTS } from "@/lib/billing/types";

export type MotioVideoTier = "standard" | "premium";
export type MotioVideoQuality = "SD" | "HD";
export type MotioVideoMode = "text" | "image" | "video" | "audio";

export const CREDIT_PRICING_VERSION = "2026-10-video-staircase-v1";
/** @deprecated Flat surcharges removed — staircase is the only customer charge. */
export const PREMIUM_TIER_SURCHARGE_CREDITS = 0;
/** @deprecated Flat surcharges removed — staircase is the only customer charge. */
export const IMAGE_MODE_SURCHARGE_CREDITS = 0;
/** Spend face value: 1 Motio2edit credit = $0.01 in Video Studio */
export const CREDIT_RETAIL_USD = VIDEO_CREDIT_FACE_CENTS / 100;
export const VIDEO_CREDIT_FACE_CENTS_PUBLIC = VIDEO_CREDIT_FACE_CENTS;

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
  resolution?: VideoResolution;
  aspect?: VideoAspect;
};

export type MotioVideoPriceResult = {
  credits: number;
  /** Alias used by some UI callers */
  total: number;
  usd: number;
  supported: boolean;
  reason?: string;
  providerCogsUsd?: number;
  breakdown: {
    tier: MotioVideoTier;
    mode?: MotioVideoMode;
    durationSec: number;
    quality: MotioVideoQuality;
    soundOn: boolean;
    baseCredits: number;
    soundSurcharge: number;
    formula: string;
  };
};

function toResolution(q: MotioVideoQuality, explicit?: VideoResolution): VideoResolution {
  if (explicit) return explicit;
  return q === "HD" ? "1080p" : "720p";
}

function toGenMode(mode?: MotioVideoMode): VideoGenMode {
  if (mode === "image") return "image";
  if (mode === "video") return "video";
  return "text";
}

/**
 * Estimate Motio2edit credits for Video Studio UI.
 * Server re-computes from live COGS + staircase and is authoritative.
 */
export function computeMotioVideoCredits(input: MotioVideoPriceInput): MotioVideoPriceResult {
  const { tier, durationSec, quality, soundOn, mode } = input;
  const productMode: VideoProductMode = tier === "premium" ? "premium" : "standard";
  const genMode = toGenMode(mode);
  const resolution = toResolution(quality, input.resolution);
  const aspect: VideoAspect = input.aspect ?? "9:16";

  if (genMode === "video") {
    return {
      credits: 0,
      total: 0,
      usd: 0,
      supported: false,
      reason: "Video to Video isn't available yet. Try Text to Video or Image to Video.",
      breakdown: {
        tier,
        mode,
        durationSec,
        quality,
        soundOn,
        baseCredits: 0,
        soundSurcharge: 0,
        formula: "unsupported",
      },
    };
  }

  const route = selectApprovedVideoRoute({
    mode: genMode,
    productMode,
    durationSec,
    resolution,
    aspect,
    audio: soundOn,
  });

  let effectiveRoute = route;
  let effectiveSound = soundOn;
  if (!effectiveRoute && soundOn) {
    effectiveRoute = selectApprovedVideoRoute({
      mode: genMode,
      productMode,
      durationSec,
      resolution,
      aspect,
      audio: false,
    });
    effectiveSound = false;
  }
  if (!effectiveRoute) {
    return {
      credits: 0,
      total: 0,
      usd: 0,
      supported: false,
      reason:
        tier === "standard"
          ? "This combination isn't available on Standard. Try a shorter duration or Premium."
          : "This combination isn't available right now. Try a shorter duration or lower quality.",
      breakdown: {
        tier,
        mode,
        durationSec,
        quality,
        soundOn,
        baseCredits: 0,
        soundSurcharge: 0,
        formula: "unsupported",
      },
    };
  }

  const model = effectiveRoute.model;
  const cogs = computeProviderCogsUsd({
    model,
    durationSec,
    resolution,
    audio: effectiveSound && !!model.nativeAudio,
  });

  if (cogs == null) {
    return {
      credits: 0,
      total: 0,
      usd: 0,
      supported: false,
      reason: "Pricing unavailable for this option.",
      breakdown: {
        tier,
        mode,
        durationSec,
        quality,
        soundOn,
        baseCredits: 0,
        soundSurcharge: 0,
        formula: "unsupported",
      },
    };
  }

  try {
    const credits = videoCogsToCredits(cogs);
    return {
      credits,
      total: credits,
      usd: +(credits * CREDIT_RETAIL_USD).toFixed(4),
      supported: true,
      providerCogsUsd: cogs,
      breakdown: {
        tier,
        mode,
        durationSec,
        quality,
        soundOn: effectiveSound,
        baseCredits: credits,
        soundSurcharge: 0,
        formula: `video staircase on total COGS $${cogs.toFixed(4)} → ${credits} credits`,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === VIDEO_COGS_TIER_UNDEFINED) {
      return {
        credits: 0,
        total: 0,
        usd: 0,
        supported: false,
        reason: "This video setting exceeds the current pricing range. Try a shorter duration or lower quality.",
        providerCogsUsd: cogs,
        breakdown: {
          tier,
          mode,
          durationSec,
          quality,
          soundOn: effectiveSound,
          baseCredits: 0,
          soundSurcharge: 0,
          formula: VIDEO_COGS_TIER_UNDEFINED,
        },
      };
    }
    return {
      credits: 0,
      total: 0,
      usd: 0,
      supported: false,
      reason: "Pricing unavailable for this option.",
      providerCogsUsd: cogs,
      breakdown: {
        tier,
        mode,
        durationSec,
        quality,
        soundOn: effectiveSound,
        baseCredits: 0,
        soundSurcharge: 0,
        formula: "error",
      },
    };
  }
}

export function allowedDurationsForTier(tier: MotioVideoTier): number[] {
  return tier === "premium" ? [5, 10, 15] : [5, 10];
}

export const TIER_COPY = {
  standard: {
    title: "Standard",
    headline: "Fast, dependable generations for everyday ideas.",
    supporting: "Fast clips · SD/HD · staircase credits from 50",
  },
  premium: {
    title: "Premium",
    headline: "More detail, stronger image preservation and better prompt adherence.",
    supporting: "Higher quality · longer clips · staircase credits from 50",
  },
} as const;
