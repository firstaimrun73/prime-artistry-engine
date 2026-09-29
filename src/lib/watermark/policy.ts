import { isFreePlan, isPaidPlan } from "@/lib/policy";
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
 * Watermark entitlement is determined by subscription PLAN only.
 * Admin status must NOT bypass Free-plan watermark requirements.
 */
export function resolveWatermarkPolicy(input: ResolvePolicyInput): WatermarkPolicy {
  void input.isAdmin;
  void input.email;
  const url = input.sourceUrl ?? "";
  const alreadyFinalized =
    input.alreadyFinalizedHint === true ||
    url.includes(FINALIZED_PATH_MARKER) ||
    url.includes(FINALIZED_VIDEO_MARKER);

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
