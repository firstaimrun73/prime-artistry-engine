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

export const VIDEO_DURATIONS: VideoDuration[] = [5, 10, 15, 20, 25, 30];

/** @deprecated Prefer computeVideoCreditCost from video-pricing.ts */
export const VIDEO_CREDIT_COST: Record<VideoDuration, number> = {
  5: VIDEO_DURATION_BASE_CREDITS[5],
  10: VIDEO_DURATION_BASE_CREDITS[10],
  15: VIDEO_DURATION_BASE_CREDITS[15],
  20: VIDEO_DURATION_BASE_CREDITS[20],
  25: VIDEO_DURATION_BASE_CREDITS[25],
  30: VIDEO_DURATION_BASE_CREDITS[30],
};

/** Max duration each plan can generate (Base tier). Premium can go longer later. */
export const PLAN_MAX_VIDEO_DURATION: Record<PlanId, VideoDuration> = {
  free: 5,
  lite: 10,
  plus: 15,
  pro: 20,
  studio: 30,
  business: 30,
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
  if (seconds <= 20) return "Pro";
  return "Studio";
}

export function maxVideoDurationForPlan(plan: PlanId | string | null | undefined): VideoDuration {
  return PLAN_MAX_VIDEO_DURATION[(plan ?? "free") as PlanId] ?? 5;
}

export function isDurationAllowed(
  plan: PlanId | string | null | undefined,
  seconds: number,
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
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
  const d = (supported[0] ?? 30) as VideoDuration;
  return VIDEO_CREDIT_COST[d];
}
