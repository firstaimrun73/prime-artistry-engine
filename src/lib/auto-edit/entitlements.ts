/**
 * Auto Edit plan entitlements (server-side source of truth).
 * Maluto AI product surface is HD-capped (sd + hd).
 * Higher tiers remain in type system for compatibility but are not offered in Maluto UI.
 */
import type { PlanId } from "@/lib/plans";
import type { AutoEditQuality } from "./constants";

/** Qualities each plan may request. Maluto UI only surfaces sd/hd. */
export const AUTO_EDIT_QUALITIES_BY_PLAN: Record<PlanId, readonly AutoEditQuality[]> = {
  free: [],
  lite: ["sd", "hd"],
  plus: ["sd", "hd"],
  pro: ["sd", "hd"],
  studio: ["sd", "hd"],
  business: ["sd", "hd"],
};

export const FREE_AUTO_EDIT_LIMIT = 0;

export function planAllowsAutoEditQuality(
  plan: string | null | undefined,
  quality: AutoEditQuality,
): boolean {
  const id = (plan ?? "free") as PlanId;
  const list = AUTO_EDIT_QUALITIES_BY_PLAN[id] ?? AUTO_EDIT_QUALITIES_BY_PLAN.free;
  // Product hard-cap: only sd/hd
  if (quality !== "sd" && quality !== "hd") return false;
  return list.includes(quality);
}

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
      "Maluto AI Restore is a paid feature. Upgrade your plan to unlock — just upload a photo.",
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
      "Maluto AI is not free. Upgrade to a paid plan to restore photos with one upload.",
    );
  }
}
