// Authoritative plan / role / ad / watermark policy.
//
// UI may read these helpers for presentation, but generation, credits,
// and download decisions must still be re-validated on the server from
// the authenticated Supabase profile (see generate.functions.ts).
// Never treat client-only React state or localStorage as authorization.

import type { PlanId } from "./plans";
import { getPlan } from "./plans";
import { isAdminEmail } from "./admin-config";

export type WatermarkMode = "none" | "primary" | "primary+secondary";

/** Plans that are considered paid (no free-tier restrictions). */
export const PAID_PLANS: readonly PlanId[] = [
  "lite",
  "plus",
  "pro",
  "studio",
  "business",
] as const;

export function isPaidPlan(plan: string | null | undefined): boolean {
  if (!plan) return false;
  return (PAID_PLANS as readonly string[]).includes(plan);
}

export function isFreePlan(plan: string | null | undefined): boolean {
  return !isPaidPlan(plan);
}

/**
 * Chatbot: Master Studio (internal plan id "business") + admin only.
 * Free / Lite / Plus / Pro / Studio must not access Chatbot (UI + server both enforce).
 */
export function canAccessChat(opts: {
  plan: string | null | undefined;
  email?: string | null | undefined;
  isAdmin?: boolean;
}): boolean {
  if (opts.isAdmin === true || isAdminEmail(opts.email)) return true;
  const id = (opts.plan ?? "").toLowerCase();
  return id === "business";
}
