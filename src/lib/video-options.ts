// Client-safe video generation options: durations, plan gating, aspect ratios,
// and model tiers. Credit amounts live in video-pricing.ts (single source of truth).

import type { PlanId } from "./plans";
import {
  VIDEO_DURATION_BASE_CREDITS,
  type VideoDurationSec,
  type VideoModelTierUi,
} from "./video-pricing";

export type VideoDuration = VideoDurationSec;
export type VideoAspectRatio = "16:9" | "9:16" | "1:1" | "4:3";
/** Internal routing tiers (map to fal models server-side only). */
export type VideoModelTier = "standard" | "pro" | "master";

/** User-facing durations — authoritative max is 15s (video-capability-registry). */
export const VIDEO_DURATIONS: VideoDuration[] = [5, 10, 15];

/** @deprecated Prefer computeVideoCreditCost from video-pricing.ts */
/** @deprecated Display-only legacy map — live charges use motio-video-credits staircase. */
export const VIDEO_CREDIT_COST: Partial<Record<VideoDuration, number>> = {
  5: VIDEO_DURATION_BASE_CREDITS[5],
  10: VIDEO_DURATION_BASE_CREDITS[10],
  15: VIDEO_DURATION_BASE_CREDITS[15],
};

/** Max duration each plan can generate (Base tier). Premium can go longer later. */
/** Plan caps cannot exceed USER_MAX_DURATION_SEC (15) from capability registry. */
export const PLAN_MAX_VIDEO_DURATION: Record<PlanId, VideoDuration> = {
  free: 5,
  lite: 10,
  plus: 15,
  pro: 15,
  studio: 15,
  business: 15,
};

export const VIDEO_ASPECT_RATIOS: { id: VideoAspectRatio; label: string; icon: string }[] = [
  { id: "16:9", label: "Landscape", icon: "▭" },
  { id: "9:16", label: "Portrait", icon: "▯" },
  { id: "1:1", label: "Square", icon: "▢" },
  { id: "4:3", label: "Classic", icon: "▤" },
];

export function planRequiredForDuration(seconds: number): string {
  if (seconds <= 5) return "Free";
  if (seconds <= 10) return "Lite";
  if (seconds <= 15) return "Plus";
  return "Plus";
}

export function maxVideoDurationForPlan(plan: PlanId | string | null | undefined): VideoDuration {
  return PLAN_MAX_VIDEO_DURATION[(plan ?? "free") as PlanId] ?? 5;
}

/**
 * Dual-order safe: isDurationAllowed(plan, seconds, isAdmin) OR
 * isDurationAllowed(seconds, plan, isAdmin). Hard ceiling 15s.
 */
export function isDurationAllowed(
  a: PlanId | string | number | null | undefined,
  b?: PlanId | string | number | null,
  isAdmin = false,
): boolean {
  let seconds: number;
  let plan: PlanId | string | null | undefined;
  if (typeof a === "number") {
    seconds = a;
    plan = typeof b === "string" || b == null ? (b as string | null | undefined) : undefined;
  } else {
    plan = a as PlanId | string | null | undefined;
    seconds = typeof b === "number" ? b : 0;
  }
  if (isAdmin) return seconds <= 15;
  if (seconds > 15) return false;
  return seconds <= maxVideoDurationForPlan(plan);
}

/** Plans that can use Advanced (top-model) routing. */
export function canUseAdvancedTier(
  plan: PlanId | string | null | undefined,
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  const p = (plan ?? "free") as PlanId;
  return p === "pro" || p === "studio" || p === "business";
}

/** Map UI tier → internal fal routing tier by duration. */
export function modelTierForDuration(seconds: number): VideoModelTier {
  if (seconds <= 5) return "standard";
  if (seconds <= 10) return "pro";
  return "master";
}

/** User-facing labels — capability only, no vendor names. */
export const MODEL_TIER_LABEL: Record<VideoModelTier, string> = {
  standard: "Standard",
  pro: "Standard+",
  master: "Standard Max",
};

export const MODEL_TIER_DESCRIPTION: Record<VideoModelTier, string> = {
  standard: "Fast motion for short clips.",
  pro: "Sharper detail and steadier motion.",
  master: "Highest fidelity for longer clips.",
};

export function uiTierFromInternal(t: VideoModelTier): VideoModelTierUi {
  // Internal pro/master still map to "standard" product surface unless user picks Advanced
  void t;
  return "standard";
}

/** Credits for a duration (legacy helper — Standard base only). */
export function videoCreditCost(seconds: number): number {
  const supported = VIDEO_DURATIONS.filter((d) => d >= seconds);
  const d = (supported[0] ?? 15) as VideoDuration;
  return VIDEO_CREDIT_COST[d] ?? 0;
}
