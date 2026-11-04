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
  /** Client session after opt-in Sponsored unlock (free users only). */
  sponsorUnlock?: boolean;
};

/**
 * Watermark entitlement:
 * - Admin: default OFF / clean; may opt in
 * - Free: Motio2edit primary unless sponsorUnlock + keepWatermark false
 * - Paid: respect keepWatermark
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

  if (isFreePlan(input.plan)) {
    // Temporary clean export after explicit Sponsored unlock session
    if (input.sponsorUnlock === true && input.keepWatermark === false) {
      return {
        mode: "none",
        primary: false,
        secondary: false,
        alreadyFinalized,
        reason: "free_sponsor_unlock",
      };
    }
    return {
      mode: "primary",
      primary: true,
      secondary: false,
      alreadyFinalized,
      reason: "free_plan_forced",
    };
  }

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
