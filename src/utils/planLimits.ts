// Plan-based capability limits for multi-image upload and features.
// Keyed by the app's actual plan ids (free / plus / pro / studio) with the
// public marketing names in comments.
import type { PlanId } from "@/lib/plans";

export type PlanLimits = {
  /** Max number of images that can be uploaded for a single generation. */
  maxImages: number;
  /** Whether video generation is available. */
  videoEnabled: boolean;
  /** Whether HD / high-quality output is available. */
  hd: boolean;
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { maxImages: 1, videoEnabled: false, hd: false }, // Free
  lite: { maxImages: 2, videoEnabled: false, hd: false }, // Lite ($4.99 / 350 credits)
  plus: { maxImages: 3, videoEnabled: true, hd: false }, // Starter
  pro: { maxImages: 5, videoEnabled: true, hd: true }, // Plus
  studio: { maxImages: 8, videoEnabled: true, hd: true }, // Pro
  business: { maxImages: 10, videoEnabled: true, hd: true }, // Business
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanId] ?? PLAN_LIMITS.free;
}
