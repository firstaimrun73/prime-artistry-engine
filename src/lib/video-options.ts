// Client-safe video generation options: durations, plan gating, aspect ratios,
// model tiers and per-duration credit costs.
//
// Shared by the video editor UI and the server generate function so the price
// shown to the user always matches what the backend charges.

import type { PlanId } from "./plans";

export type VideoDuration = 5 | 10 | 15 | 20 | 25 | 30;
export type VideoAspectRatio = "16:9" | "9:16" | "1:1" | "4:3";
export type VideoModelTier = "standard" | "pro" | "master";

export const VIDEO_DURATIONS: VideoDuration[] = [5, 10, 15, 20, 25, 30];

/** Credits charged per video duration. */
export const VIDEO_CREDIT_COST: Record<VideoDuration, number> = {
  5: 125,
  10: 200,
  15: 300,
  20: 400,
  25: 500,
  30: 600,
};

/** Max duration each plan can generate. */
export const PLAN_MAX_VIDEO_DURATION: Record<PlanId, VideoDuration> = {
  free: 5,
  lite: 10,
  plus: 10,
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

/** Cheapest plan that unlocks a given duration (for upgrade tooltips). */
export function planRequiredForDuration(seconds: number): string {
  if (seconds <= 5) return "Free";
  if (seconds <= 10) return "Lite";
  if (seconds <= 20) return "Plus";
  return "Pro";
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

/** Model tier used for a duration — Standard 5s, Pro 10s, Master 15s+. */
export function modelTierForDuration(seconds: number): VideoModelTier {
  if (seconds <= 5) return "standard";
  if (seconds <= 10) return "pro";
  return "master";
}

export const MODEL_TIER_LABEL: Record<VideoModelTier, string> = {
  standard: "Standard",
  pro: "Pro",
  master: "Master",
};

export const MODEL_TIER_DESCRIPTION: Record<VideoModelTier, string> = {
  standard: "Kling 1.6 Standard — fast, great for short 5s clips.",
  pro: "Kling 1.6 Pro — sharper detail and steadier motion for 10s clips.",
  master: "Kling 2.1 Master — highest fidelity and best motion for long clips.",
};

/** Credits for a duration (clamped to the nearest supported tier). */
export function videoCreditCost(seconds: number): number {
  const supported = VIDEO_DURATIONS.filter((d) => d >= seconds);
  const d = (supported[0] ?? 30) as VideoDuration;
  return VIDEO_CREDIT_COST[d];
}
