/**
 * Auto Edit plan entitlements (server-side source of truth).
 * Complimentary access (approved Access Assistance) may unlock Maluto for free plans
 * when complimentary_expires_at is in the future and tools include "maluto".
 */

import type { PlanId } from "@/lib/plans";
import type { AutoEditQuality } from "./constants";
import { hasComplimentaryTool, type ComplimentaryProfileFields } from "@/lib/complimentary-access";

export const AUTO_EDIT_QUALITIES_BY_PLAN: Record<PlanId, readonly AutoEditQuality[]> = {
  free: [],
  lite: ["sd", "hd"],
  plus: ["sd", "hd", "2k"],
  pro: ["sd", "hd", "2k", "4k"],
  studio: ["sd", "hd", "2k", "4k", "8k"],
  business: ["sd", "hd", "2k", "4k", "8k", "8k_max"],
};

export const FREE_AUTO_EDIT_LIMIT = 0;

export function planAllowsAutoEditQuality(
  plan: string | null | undefined,
  quality: AutoEditQuality,
): boolean {
  const id = (plan ?? "free") as PlanId;
  if (id === "free") {
    // Complimentary users get SD/HD only unless on a paid plan.
    return quality === "sd" || quality === "hd";
  }
  const list = AUTO_EDIT_QUALITIES_BY_PLAN[id] ?? AUTO_EDIT_QUALITIES_BY_PLAN.free;
  return list.includes(quality);
}

/** Paid plan unlock. For complimentary, use canUseMalutoAI. */
export function planAllowsMalutoAI(plan: string | null | undefined): boolean {
  const id = (plan ?? "free") as PlanId;
  if (id === "free") return false;
  return (AUTO_EDIT_QUALITIES_BY_PLAN[id] ?? []).length > 0;
}

export function canUseMalutoAI(opts: {
  plan: string | null | undefined;
  isAdmin?: boolean;
  profile?: ComplimentaryProfileFields | null;
}): boolean {
  if (opts.isAdmin) return true;
  if (planAllowsMalutoAI(opts.plan)) return true;
  return hasComplimentaryTool(opts.profile, "maluto");
}

export function assertAutoEditQualityEntitlement(
  plan: string | null | undefined,
  quality: AutoEditQuality,
  profile?: ComplimentaryProfileFields | null,
  isAdmin?: boolean,
): void {
  if (!canUseMalutoAI({ plan, isAdmin, profile })) {
    throw new Error(
      "Maluto AI Restore is a paid feature. Upgrade your plan to unlock — just upload a photo.",
    );
  }
  if (planAllowsMalutoAI(plan)) {
    const id = (plan ?? "free") as PlanId;
    const list = AUTO_EDIT_QUALITIES_BY_PLAN[id] ?? [];
    if (!list.includes(quality)) {
      throw new Error(
        `Your plan does not include Auto Edit at ${quality.toUpperCase()}. Upgrade to unlock this quality.`,
      );
    }
    return;
  }
  // Complimentary: SD/HD only
  if (quality !== "sd" && quality !== "hd") {
    throw new Error("Complimentary Maluto access includes SD and HD only.");
  }
}

export function assertFreeAutoEditAllowance(opts: {
  plan: string | null | undefined;
  isAdmin: boolean;
  autoEditUsedCount: number;
  profile?: ComplimentaryProfileFields | null;
}): void {
  if (opts.isAdmin) return;
  if (canUseMalutoAI({ plan: opts.plan, profile: opts.profile })) return;
  if ((opts.plan ?? "free") === "free") {
    throw new Error(
      "Maluto AI is not free. Upgrade to a paid plan to restore photos with one upload.",
    );
  }
}
