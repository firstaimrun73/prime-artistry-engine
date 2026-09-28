// Plan-based capability limits for multi-image upload and features.
import type { PlanId } from "@/lib/plans";

export type PlanLimits = {
  /** Max concurrent gallery images (base + references). */
  maxImages: number;
  /** Max prompt characters (frontend + server should agree). */
  maxPromptChars: number;
  videoEnabled: boolean;
  hd: boolean;
  /** Premium (pro internal) experience unlocked */
  premiumUnlocked: boolean;
  /** Ultra AI (premium internal) experience unlocked */
  ultraUnlocked: boolean;
  /** IMAX + 8k_max + Custom aspect (Master-level Ultra) */
  ultraFullUnlocked: boolean;
};

/**
 * Product matrix (access only — does not change AI edit quality or credit prices).
 *
 * Lite:   Standard only · up to 5 images · 2000 chars
 * Plus:   Standard only · up to 10 images · 4000 chars
 * Pro:    Standard + Premium · up to 10 · 6000 chars
 * Studio: + Ultra (restricted) · up to 10 · 6000 chars · IMAX/Custom locked
 * Master: full Ultra · up to 10 · UI unlimited / backend ~7000
 */
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxImages: 1,
    maxPromptChars: 2000,
    videoEnabled: false,
    hd: false,
    premiumUnlocked: false,
    ultraUnlocked: false,
    ultraFullUnlocked: false,
  },
  lite: {
    maxImages: 5,
    maxPromptChars: 2000,
    videoEnabled: true,
    hd: false,
    premiumUnlocked: false,
    ultraUnlocked: false,
    ultraFullUnlocked: false,
  },
  plus: {
    maxImages: 10,
    maxPromptChars: 4000,
    videoEnabled: true,
    hd: false,
    premiumUnlocked: false,
    ultraUnlocked: false,
    ultraFullUnlocked: false,
  },
  pro: {
    maxImages: 10,
    maxPromptChars: 6000,
    videoEnabled: true,
    hd: true,
    premiumUnlocked: true,
    ultraUnlocked: false,
    ultraFullUnlocked: false,
  },
  studio: {
    maxImages: 10,
    maxPromptChars: 6000,
    videoEnabled: true,
    hd: true,
    premiumUnlocked: true,
    ultraUnlocked: true,
    ultraFullUnlocked: false, // IMAX / Custom / 8k_max locked for Studio
  },
  business: {
    maxImages: 10,
    maxPromptChars: 7000, // backend safety ceiling only — UI uses isPromptEffectivelyUnlimited
    videoEnabled: true,
    hd: true,
    premiumUnlocked: true,
    ultraUnlocked: true,
    ultraFullUnlocked: true,
  },
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
  // Admin may bypass free 1-image lock, but never exceeds plan matrix (and experience caps elsewhere).
  if (isAdmin) return Math.max(getPlanLimits(plan ?? "free").maxImages, 1);
  return getPlanLimits(plan ?? "free").maxImages;
}

/** UI + client clamp. Uses effective plan — admin does not force 7000. */
export function maxPromptCharsForPlan(plan: string | undefined | null, _isAdmin = false): number {
  void _isAdmin;
  return getPlanLimits(plan ?? "free").maxPromptChars;
}

/**
 * True when UI should hide a numeric character limit (Master Studio).
 * Backend may still enforce ~7000 safety ceiling — that must not be shown as the UI limit.
 */
export function isPromptEffectivelyUnlimited(plan: string | undefined | null): boolean {
  const id = (plan ?? "free").toLowerCase();
  return id === "business" || getPlanLimits(plan ?? "free").ultraFullUnlocked;
}

export const MULTI_IMAGE_UPGRADE_MESSAGE =
  "Multi-image editing is available on paid plans. Upgrade your plan to use multiple images.";
