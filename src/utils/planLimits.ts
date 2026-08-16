// Plan-based capability limits for multi-image upload and features.
import type { PlanId } from "@/lib/plans";

export type PlanLimits = {
  maxImages: number;
  videoEnabled: boolean;
  hd: boolean;
};

/**
 * Product matrix (usage/access only — does not change AI edit quality):
 * Free: 1 image, no video/music
 * Lite: 2 images, video+music
 * Plus: 4 images, video+music
 * Pro+: higher multi-image caps per existing plan definitions
 */
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { maxImages: 1, videoEnabled: false, hd: false },
  lite: { maxImages: 2, videoEnabled: true, hd: false },
  plus: { maxImages: 4, videoEnabled: true, hd: false },
  pro: { maxImages: 5, videoEnabled: true, hd: true },
  studio: { maxImages: 8, videoEnabled: true, hd: true },
  business: { maxImages: 10, videoEnabled: true, hd: true }, // Master Studio
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanId] ?? PLAN_LIMITS.free;
}

/** Free (and unknown) plans cannot use multi-image. */
export function isMultiImageLocked(plan: string | undefined | null, isAdmin = false): boolean {
  if (isAdmin) return false;
  return getPlanLimits(plan ?? "free").maxImages <= 1;
}

/** Max concurrent gallery / reference images for this plan. */
export function maxImagesForPlan(plan: string | undefined | null, isAdmin = false): number {
  if (isAdmin) return 10;
  return getPlanLimits(plan ?? "free").maxImages;
}

export const MULTI_IMAGE_UPGRADE_MESSAGE =
  "Multi-image editing is available on paid plans. Upgrade your plan to use multiple images.";
