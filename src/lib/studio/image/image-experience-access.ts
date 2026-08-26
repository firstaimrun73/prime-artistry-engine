/**
 * Image Studio experience access matrix (Standard / Premium / Ultra AI).
 * Internal tier ids: standard | pro | premium
 * Plan ids: free | lite | plus | pro | studio | business (Master Studio)
 *
 * Visibility (UI hides inaccessible experiences — no locked promo cards):
 *   Free / Lite / Plus → Standard only
 *   Pro               → Standard + Premium
 *   Studio / Business → Standard + Premium + Ultra AI
 *   Admin             → all three (handled by caller with isAdmin override)
 *
 * Single source of truth for UI locks + server enforcement.
 */

import type { PlanId } from "@/lib/plans";
import type { StudioTier } from "@/lib/studio/studio-tier";

/** Plans allowed per experience (authoritative). */
export const IMAGE_EXPERIENCE_ALLOWED_PLANS: Record<StudioTier, readonly PlanId[]> = {
  /** Standard Image — every plan */
  standard: ["free", "lite", "plus", "pro", "studio", "business"],
  /** Premium Image (internal pro) — Pro plan and above */
  pro: ["pro", "studio", "business"],
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
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  const planId = normalizePlanId(plan);
  return IMAGE_EXPERIENCE_ALLOWED_PLANS[tier].includes(planId);
}

/** Experiences visible in the Image Editor selector (hidden if not allowed). */
export function visibleImageExperiences(
  plan: string | null | undefined,
  isAdmin = false,
): StudioTier[] {
  const all: StudioTier[] = ["standard", "pro", "premium"];
  return all.filter((t) => canAccessImageExperience(plan, t, isAdmin));
}

/** Locked map for StudioTierSelector (true = locked / not allowed). Prefer hide over lock. */
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

/** Default experience when current selection is locked for plan. */
export function defaultImageExperienceForPlan(
  plan: string | null | undefined,
): StudioTier {
  return "standard";
}

/**
 * Server-side assert. Throws a clear product message on denial.
 * Call with the *effective* plan (after admin test-plan override).
 */
export function assertImageExperienceAccess(
  plan: string | null | undefined,
  tier: StudioTier | null | undefined,
  isAdmin = false,
): void {
  const t: StudioTier = tier ?? "standard";
  if (canAccessImageExperience(plan, t, isAdmin)) return;

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
      `Premium Image requires Pro or higher. Your current plan (${planId}) does not include Premium.`,
    );
  }
  throw new Error(`${label} Image is not available on plan ${planId}.`);
}
