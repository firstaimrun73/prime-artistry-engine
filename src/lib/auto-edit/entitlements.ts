/**
 * Auto Edit plan entitlements (server-side source of truth).
 * Internal Master Studio plan id remains "business".
 */

import type { PlanId } from "@/lib/plans";
import type { AutoEditQuality } from "./constants";

/** Qualities each plan may request for Auto Edit. */
export const AUTO_EDIT_QUALITIES_BY_PLAN: Record<PlanId, readonly AutoEditQuality[]> = {
  free: ["sd", "hd"],
  lite: ["sd", "hd"],
  plus: ["sd", "hd", "2k"],
  pro: ["sd", "hd", "2k", "4k"],
  studio: ["sd", "hd", "2k", "4k", "8k"],
  business: ["sd", "hd", "2k", "4k", "8k", "8k_max"],
};

/** Free plan: exactly one successful Auto Edit (server-enforced). */
export const FREE_AUTO_EDIT_LIMIT = 1;

export function planAllowsAutoEditQuality(
  plan: string | null | undefined,
  quality: AutoEditQuality,
): boolean {
  const id = (plan ?? "free") as PlanId;
  const list = AUTO_EDIT_QUALITIES_BY_PLAN[id] ?? AUTO_EDIT_QUALITIES_BY_PLAN.free;
  return list.includes(quality);
}

export function assertAutoEditQualityEntitlement(
  plan: string | null | undefined,
  quality: AutoEditQuality,
): void {
  if (!planAllowsAutoEditQuality(plan, quality)) {
    throw new Error(
      `Your plan does not include Auto Edit at ${quality.toUpperCase()}. Upgrade to unlock this quality.`,
    );
  }
}

export function assertFreeAutoEditAllowance(opts: {
  plan: string | null | undefined;
  isAdmin: boolean;
  autoEditUsedCount: number;
}): void {
  if (opts.isAdmin) return;
  if ((opts.plan ?? "free") !== "free") return;
  if (opts.autoEditUsedCount >= FREE_AUTO_EDIT_LIMIT) {
    throw new Error(
      "Free plan includes 1 Auto Edit. Upgrade to continue using Auto Edit.",
    );
  }
}
