// Client-safe video generation options: durations, plan gating, aspect ratios.
// Live charges use motio-video-credits + customer-pricing staircase.

import type { PlanId } from "./plans";
import {
  VIDEO_DURATION_BASE_CREDITS,
  type VideoDurationSec,
  type VideoModelTierUi,
} from "./video-pricing";

export type VideoDuration = VideoDurationSec;
export type VideoAspectRatio = "16:9" | "9:16" | "1:1" | "4:3";
export type VideoModelTier = "standard" | "pro" | "master";

export const VIDEO_DURATIONS: VideoDuration[] = [5, 10, 15];

/** @deprecated Display-only — live charges use motio-video-credits staircase. */
export const VIDEO_CREDIT_COST: Partial<Record<VideoDuration, number>> = {
  5: VIDEO_DURATION_BASE_CREDITS[5],
  10: VIDEO_DURATION_BASE_CREDITS[10],
  15: VIDEO_DURATION_BASE_CREDITS[15],
};

/**
 * Max duration each plan may generate.
 * Starter: 5s SD only (enforced server + client).
 * Pro: up to 10s (15s only on Ultra / higher).
 * Ultra AI: up to 15s where provider supports.
 */
export const PLAN_MAX_VIDEO_DURATION: Record<PlanId, VideoDuration> = {
  free: 5,
  starter: 5,
  lite: 10,
  plus: 15,
  pro: 10,
  ultra: 15,
  studio: 15,
  business: 15,
};

/** Starter (and free) limited to SD — no HD / 1080p. */
export function planAllowsVideoHd(plan: PlanId | string | null | undefined): boolean {
  const p = (plan ?? "free") as PlanId;
  return p !== "free" && p !== "starter";
}

export const VIDEO_ASPECT_RATIOS: { id: VideoAspectRatio; label: string; icon: string }[] = [
  { id: "16:9", label: "Landscape", icon: "▭" },
  { id: "9:16", label: "Portrait", icon: "▯" },
  { id: "1:1", label: "Square", icon: "▢" },
  { id: "4:3", label: "Classic", icon: "▤" },
];

export function planRequiredForDuration(seconds: number): string {
  if (seconds <= 5) return "Starter";
  if (seconds <= 10) return "Pro";
  if (seconds <= 15) return "Ultra AI";
  return "Ultra AI";
}

export function maxVideoDurationForPlan(plan: PlanId | string | null | undefined): VideoDuration {
  return PLAN_MAX_VIDEO_DURATION[(plan ?? "free") as PlanId] ?? 5;
}

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

export function canUseAdvancedTier(
  plan: PlanId | string | null | undefined,
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  const p = (plan ?? "free") as PlanId;
  return p === "pro" || p === "ultra" || p === "studio" || p === "business";
}

export function modelTierForDuration(seconds: number): VideoModelTier {
  if (seconds <= 5) return "standard";
  if (seconds <= 10) return "pro";
  return "master";
}

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
  void t;
  return "standard";
}

export function videoCreditCost(seconds: number): number {
  const supported = VIDEO_DURATIONS.filter((d) => d >= seconds);
  const d = (supported[0] ?? 15) as VideoDuration;
  return VIDEO_CREDIT_COST[d] ?? 0;
}
