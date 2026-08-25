/**
 * Admin-only plan override for testing Image Studio experience access.
 * Does NOT grant infinite credits or bypass credit deduction for non-admin paths.
 * Real customer entitlements remain driven by profiles.plan.
 *
 * Client stores selection in localStorage; server only honors adminTestPlan
 * when the caller is an authenticated admin (email check).
 */

import type { PlanId } from "@/lib/plans";
import { PLANS } from "@/lib/plans";
import { normalizePlanId } from "@/lib/studio/image/image-experience-access";

export const ADMIN_TEST_PLAN_STORAGE_KEY = "motio2edit.adminTestPlan";

/** All selectable test plans (same ids as customer plans). */
export const ADMIN_TEST_PLAN_OPTIONS: { id: PlanId; label: string }[] = PLANS.map(
  (p) => ({ id: p.id, label: p.name }),
);

export function isValidPlanId(value: string | null | undefined): value is PlanId {
  if (!value) return false;
  return PLANS.some((p) => p.id === value);
}

/** Read client-side override (browser only). */
export function readAdminTestPlan(): PlanId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ADMIN_TEST_PLAN_STORAGE_KEY);
    if (isValidPlanId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

/** Persist client-side override. */
export function writeAdminTestPlan(plan: PlanId | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!plan) {
      localStorage.removeItem(ADMIN_TEST_PLAN_STORAGE_KEY);
      return;
    }
    if (isValidPlanId(plan)) {
      localStorage.setItem(ADMIN_TEST_PLAN_STORAGE_KEY, plan);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Effective plan for experience access checks.
 * - Non-admin: always real profile plan
 * - Admin with valid test plan: test plan
 * - Admin without test plan: real profile plan (no silent free-only trap)
 */
export function getEffectiveAccessPlan(opts: {
  profilePlan: string | null | undefined;
  isAdmin: boolean;
  adminTestPlan?: string | null;
}): PlanId {
  const real = normalizePlanId(opts.profilePlan);
  if (!opts.isAdmin) return real;
  if (opts.adminTestPlan && isValidPlanId(opts.adminTestPlan)) {
    return opts.adminTestPlan;
  }
  return real;
}
