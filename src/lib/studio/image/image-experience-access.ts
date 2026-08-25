/**
 * Image Studio experience access matrix (Standard / Premium / Ultra AI).
 * Internal tier ids: standard | pro | premium
 * Plan ids: free | lite | plus | pro | studio | business (Master Studio)
 *
 * Single source of truth for UI locks + server enforcement.
 */

import type { PlanId } from "@/lib/plans";
import type { StudioTier } from "@/lib/studio/studio-tier";

/** Plans allowed per experience (authoritative). */
export const IMAGE_EXPERIENCE_ALLOWED_PLANS: Record<StudioTier, readonly PlanId[]> = {
  /** Standard Image — every plan */
  standard: ["free", "lite", "plus", "pro", "studio", "business"],
  /** Premium Image (internal pro) — Plus and above */
  pro: ["plus", "pro", "studio", "business"],
  /** Ultra AI Image (internal premium) — Studio and Master Studio only */
  premium: ["studio", "business"],
} as const;

export function normalizePlanId(plan: string | null | undefined): PlanId {
  const p = (plan ?? "free").toLowerCase().trim();
  if (
    p === "free" ||
    p === "lite" ||
    p === "plus" ||
    p === "pro" ||
    p === "studio" ||
    p === "business"
  ) {
    return p;
  }
  return "free";
}

/** Whether a plan may use the given Image Studio experience. */
export function canAccessImageExperience(
  plan: string | null | undefined,
  tier: StudioTier,
): boolean {
  const planId = normalizePlanId(plan);
  return IMAGE_EXPERIENCE_ALLOWED_PLANS[tier].includes(planId);
}

/** Locked map for StudioTierSelector (true = locked / not allowed). */
export function imageExperienceLockedMap(
  plan: string | null | undefined,
): Partial<Record<StudioTier, boolean>> {
  return {
    standard: !canAccessImageExperience(plan, "standard"),
    pro: !canAccessImageExperience(plan, "pro"),
    premium: !canAccessImageExperience(plan, "premium"),
  };
}

/** Default experience when current selection is locked for plan. */
export function defaultImageExperienceForPlan(
  plan: string | null | undefined,
): StudioTier {
  if (canAccessImageExperience(plan, "premium")) return "standard";
  if (canAccessImageExperience(plan, "pro")) return "standard";
  return "standard";
}

/**
 * Server-side assert. Throws a clear product message on denial.
 * Call with the *effective* plan (after admin test-plan override).
 */
export function assertImageExperienceAccess(
  plan: string | null | undefined,
  tier: StudioTier | null | undefined,
): void {
  const t: StudioTier = tier ?? "standard";
  if (canAccessImageExperience(plan, t)) return;

  const planId = normalizePlanId(plan);
  const label =
    t === "premium" ? "Ultra AI" : t === "pro" ? "Premium" : "Standard";

  if (t === "premium") {
    throw new Error(
      `Ultra AI Image requires Studio or Master Studio. Your current plan (${planId}) does not include Ultra AI.`,
    );
  }
  if (t === "pro") {
    throw new Error(
      `Premium Image requires Plus or higher. Your current plan (${planId}) does not include Premium.`,
    );
  }
  throw new Error(`${label} Image is not available on plan ${planId}.`);
}
