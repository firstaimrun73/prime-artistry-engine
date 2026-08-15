// Plan-based capability limits for multi-image upload and features.
import type { PlanId } from "@/lib/plans";

export type PlanLimits = {
  maxImages: number;
  videoEnabled: boolean;
  hd: boolean;
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { maxImages: 1, videoEnabled: false, hd: false },
  lite: { maxImages: 2, videoEnabled: true, hd: false },
  plus: { maxImages: 3, videoEnabled: true, hd: false },
  pro: { maxImages: 5, videoEnabled: true, hd: true },
  studio: { maxImages: 8, videoEnabled: true, hd: true },
  business: { maxImages: 10, videoEnabled: true, hd: true }, // Master Studio
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanId] ?? PLAN_LIMITS.free;
}
