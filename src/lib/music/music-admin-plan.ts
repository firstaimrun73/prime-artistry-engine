/**
 * Admin-only Music plan resolution.
 * Server must only honor adminTestPlan when isAdminEmail is true.
 */
import type { PlanId } from "@/lib/plans";
import { getEffectiveAccessPlan, isValidPlanId } from "@/lib/studio/image/admin-test-plan";
import { getMusicPlanCapabilities, type MusicPlanCapabilities } from "@/lib/music/music-plan-capabilities";

export function resolveMusicPlanForRequest(opts: {
  isAdmin: boolean;
  profilePlan: string | null | undefined;
  adminTestPlan?: string | null;
}): {
  planForCaps: PlanId;
  usingAdminTestPlan: boolean;
  shouldCharge: boolean;
  caps: MusicPlanCapabilities;
} {
  const testPlan =
    opts.adminTestPlan && isValidPlanId(opts.adminTestPlan) ? opts.adminTestPlan : null;
  const effective = getEffectiveAccessPlan({
    profilePlan: opts.profilePlan,
    isAdmin: opts.isAdmin,
    adminTestPlan: testPlan,
  });
  const usingAdminTestPlan = Boolean(opts.isAdmin && testPlan);
  const planForCaps: PlanId =
    opts.isAdmin && !usingAdminTestPlan ? ("business" as PlanId) : effective;
  const caps = getMusicPlanCapabilities(planForCaps);
  const shouldCharge = !opts.isAdmin || usingAdminTestPlan;
  return { planForCaps, usingAdminTestPlan, shouldCharge, caps };
}
