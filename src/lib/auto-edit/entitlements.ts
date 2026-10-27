/**
 * Auto Edit plan entitlements (server-side source of truth).
 * Internal Master Studio plan id remains "business".
 *
 * Product rule: Maluto AI is NOT free.
 * Lite ($4.99) and above unlock restore / Auto Edit. Free plan is blocked.
 */

import type { PlanId } from "@/lib/plans";
import type { AutoEditQuality } from "./constants";

/** Qualities each plan may request for Auto Edit. Free has none (paid only). */
export const AUTO_EDIT_QUALITIES_BY_PLAN: Record<PlanId, readonly AutoEditQuality[]> = {
  free: [],
  lite: ["sd", "hd"],
  plus: ["sd", "hd", "2k"],
  pro: ["sd", "hd", "2k", "4k"],
  studio: ["sd", "hd", "2k", "4k", "8k"],
  business: ["sd", "hd", "2k", "4k", "8k", "8k_max"],
};

/** Free plan: zero Auto Edit runs. Must upgrade to Lite ($4.99)+. */
export const FREE_AUTO_EDIT_LIMIT = 0;

export function planAllowsAutoEditQuality(
  plan: string | null | undefined,
  quality: AutoEditQuality,
): boolean {
  const id = (plan ?? "free") as PlanId;
  const list = AUTO_EDIT_QUALITIES_BY_PLAN[id] ?? AUTO_EDIT_QUALITIES_BY_PLAN.free;
  return list.includes(quality);
}

/** True when plan can use Maluto AI at all (Lite+). */
export function planAllowsMalutoAI(plan: string | null | undefined): boolean {
  const id = (plan ?? "free") as PlanId;
  if (id === "free") return false;
  return (AUTO_EDIT_QUALITIES_BY_PLAN[id] ?? []).length > 0;
}

export function assertAutoEditQualityEntitlement(
  plan: string | null | undefined,
  quality: AutoEditQuality,
): void {
  if (!planAllowsMalutoAI(plan)) {
    throw new Error(
      "Maluto AI Restore is a paid feature. Upgrade to Lite ($4.99) to unlock — just upload a photo.",
    );
  }
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
  if ((opts.plan ?? "free") === "free") {
    throw new Error(
      "Maluto AI is not free. Upgrade to Lite for $4.99 — restore your photos with one upload.",
    );
  }
}
