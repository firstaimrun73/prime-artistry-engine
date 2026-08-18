import { isAdminEmail } from "@/lib/admin-config";
import { isFreePlan, isPaidPlan } from "@/lib/policy";
import type { WatermarkMode, WatermarkPolicy } from "./types";
import { FINALIZED_PATH_MARKER, FINALIZED_VIDEO_MARKER } from "./types";

export type ResolvePolicyInput = {
  plan: string | null | undefined; email?: string | null | undefined;
  isAdmin?: boolean; keepWatermark?: boolean; sourceUrl?: string | null;
  alreadyFinalizedHint?: boolean;
};

export function resolveWatermarkPolicy(input: ResolvePolicyInput): WatermarkPolicy {
  const admin = input.isAdmin === true || isAdminEmail(input.email);
  const url = input.sourceUrl ?? "";
  const alreadyFinalized =
    input.alreadyFinalizedHint === true ||
    url.includes(FINALIZED_PATH_MARKER) || url.includes(FINALIZED_VIDEO_MARKER);
  if (admin)
    return { mode: "none", primary: false, secondary: false, alreadyFinalized, reason: "admin" };
  if (isFreePlan(input.plan))
    return { mode: "primary+secondary", primary: true, secondary: true, alreadyFinalized, reason: "free_plan_forced" };
  if (isPaidPlan(input.plan)) {
    if (input.keepWatermark === true)
      return { mode: "primary", primary: true, secondary: false, alreadyFinalized, reason: "paid_user_opt_in" };
    return { mode: "none", primary: false, secondary: false, alreadyFinalized, reason: "paid_user_opt_out" };
  }
  return { mode: "primary+secondary", primary: true, secondary: true, alreadyFinalized, reason: "unknown_plan_safe_default" };
}
export function policyRequiresStamp(mode: WatermarkMode): boolean { return mode !== "none"; }
