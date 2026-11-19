/**
 * Image Studio experience access matrix (Standard / Premium / Ultra AI).
 * Internal tier ids: standard | pro | premium
 * Plan ids: free | lite | plus | pro | studio | business (Master Studio)
 *
 * Selector always lists all three experiences.
 * Locks use canAccessImageExperience — server assertImageExperienceAccess is authoritative.
 */

import type { PlanId } from "@/lib/plans";
import type { StudioTier } from "@/lib/studio/studio-tier";

/** Plans allowed per experience (authoritative). */
export const IMAGE_EXPERIENCE_ALLOWED_PLANS: Record<StudioTier, readonly PlanId[]> = {
  standard: ["free", "lite", "plus", "pro", "studio", "business", "starter", "ultra"],
  pro: ["pro", "studio", "business", "ultra"],
  premium: ["studio", "business", "ultra"],
} as const;

export function normalizePlanId(plan: string | null | undefined): PlanId {
  const p = (plan ?? "free").toLowerCase().trim();
  if (
    p === "free" ||
    p === "lite" ||
    p === "plus" ||
    p === "pro" ||
    p === "studio" ||
    p === "business" ||
    p === "starter" ||
    p === "ultra"
  ) {
    return p;
  }
  return "free";
}

export function canAccessImageExperience(
  plan: string | null | undefined,
  tier: StudioTier,
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  const planId = normalizePlanId(plan);
  return (IMAGE_EXPERIENCE_ALLOWED_PLANS[tier] as readonly string[]).includes(planId);
}

/** Always list Standard, Premium, Ultra AI — lock, do not hide. */
export function visibleImageExperiences(
  plan: string | null | undefined,
  isAdmin = false,
): StudioTier[] {
  void plan;
  void isAdmin;
  return ["standard", "pro", "premium"];
}

export function imageExperienceLockedMap(
  plan: string | null | undefined,
  isAdmin = false,
): Partial<Record<StudioTier, boolean>> {
  return {
    standard: !canAccessImageExperience(plan, "standard", isAdmin),
    pro: !canAccessImageExperience(plan, "pro", isAdmin),
    premium: !canAccessImageExperience(plan, "premium", isAdmin),
  };
}

export function defaultImageExperienceForPlan(
  plan: string | null | undefined,
): StudioTier {
  void plan;
  return "standard";
}

export function assertImageExperienceAccess(
  plan: string | null | undefined,
  tier: StudioTier | null | undefined,
  isAdmin = false,
): void {
  const t: StudioTier = tier ?? "standard";
  if (canAccessImageExperience(plan, t, isAdmin)) return;

  const planId = normalizePlanId(plan);
  if (t === "premium") {
    throw new Error(
      `Ultra AI Image requires Studio or Master Studio. Your current plan (${planId}) does not include Ultra AI.`,
    );
  }
  if (t === "pro") {
    throw new Error(
      `Premium Image requires Pro or higher. Your current plan (${planId}) does not include Premium.`,
    );
  }
  throw new Error(`Standard Image is not available on plan ${planId}.`);
}
