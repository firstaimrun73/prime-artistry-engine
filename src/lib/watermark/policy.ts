import { isFreePlan, isPaidPlan } from "@/lib/policy";
import { isAdminClaims } from "@/lib/admin-guard.server";
import type { WatermarkMode, WatermarkPolicy } from "./types";
import { FINALIZED_PATH_MARKER, FINALIZED_VIDEO_MARKER } from "./types";

export type ResolvePolicyInput = {
  plan: string | null | undefined;
  email?: string | null | undefined;
  isAdmin?: boolean;
  keepWatermark?: boolean;
  sourceUrl?: string | null;
  alreadyFinalizedHint?: boolean;
};

/**
 * Watermark entitlement:
 * - Admin (firstaimrun89@gmail.com): default OFF / clean; may opt in
 * - Free: forced Motio2edit primary (no secondary)
 * - Paid: respect keepWatermark (client default ON)
 */
export function resolveWatermarkPolicy(input: ResolvePolicyInput): WatermarkPolicy {
  const url = input.sourceUrl ?? "";
  const alreadyFinalized =
    input.alreadyFinalizedHint === true ||
    url.includes(FINALIZED_PATH_MARKER) ||
    url.includes(FINALIZED_VIDEO_MARKER);

  const admin =
    input.isAdmin === true ||
    isAdminClaims({ email: input.email ?? undefined });

  // Sole admin: clean output by default; optional stamp when keepWatermark=true
  if (admin) {
    if (input.keepWatermark === true) {
      return {
        mode: "primary",
        primary: true,
        secondary: false,
        alreadyFinalized,
        reason: "admin_opt_in",
      };
    }
    return {
      mode: "none",
      primary: false,
      secondary: false,
      alreadyFinalized,
      reason: "admin_default_off",
    };
  }

  // Free: forced primary Motio2edit only — no secondary watermark.
  if (isFreePlan(input.plan)) {
    return {
      mode: "primary",
      primary: true,
      secondary: false,
      alreadyFinalized,
      reason: "free_plan_forced",
    };
  }

  // Paid: respect user preference (default ON is a client concern).
  if (isPaidPlan(input.plan)) {
    if (input.keepWatermark === true) {
      return {
        mode: "primary",
        primary: true,
        secondary: false,
        alreadyFinalized,
        reason: "paid_user_opt_in",
      };
    }
    return {
      mode: "none",
      primary: false,
      secondary: false,
      alreadyFinalized,
      reason: "paid_user_opt_out",
    };
  }

  // Unknown plan: safe default — primary only (no secondary).
  return {
    mode: "primary",
    primary: true,
    secondary: false,
    alreadyFinalized,
    reason: "unknown_plan_safe_default",
  };
}

export function policyRequiresStamp(mode: WatermarkMode): boolean {
  return mode !== "none";
}
