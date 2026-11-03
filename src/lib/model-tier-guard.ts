/**
 * Server-side model tier access control.
 * Call BEFORE debiting credits and BEFORE running Premium/Ultra generation.
 * Frontend labels are not authorization.
 */
import { canAccessModelTier, type PlanId, type ModelTier } from "@/lib/plans";

export type StudioTierRequest = "standard" | "pro" | "premium" | null | undefined;

/** Map client studioTier to required ModelTier. */
export function requiredModelTierForStudio(
  studioTier: StudioTierRequest,
): ModelTier {
  if (studioTier === "premium") return "ultra";
  if (studioTier === "pro") return "premium";
  return "standard";
}

/**
 * Throws if the authenticated user plan cannot use the requested studio tier.
 * Admins may pass isAdmin=true to bypass.
 */
export function assertModelTierAccess(opts: {
  plan: PlanId | string | null | undefined;
  studioTier?: StudioTierRequest;
  required?: ModelTier;
  isAdmin?: boolean;
}): void {
  if (opts.isAdmin) return;
  const required =
    opts.required ?? requiredModelTierForStudio(opts.studioTier);
  if (required === "standard") return;
  if (!canAccessModelTier(opts.plan as PlanId, required)) {
    const label =
      required === "ultra"
        ? "Ultra AI"
        : required === "premium"
          ? "Premium"
          : "Standard";
    throw new Error(
      `Your plan does not include ${label} models. Upgrade to access this quality tier.`,
    );
  }
}
