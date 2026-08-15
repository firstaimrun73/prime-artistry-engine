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

/** Chat: all paid plans (including Lite). Free never. */
export function canAccessChat(opts: {
  plan: string | null | undefined;
  email?: string | null | undefined;
  isAdmin?: boolean;
}): boolean {
  if (opts.isAdmin === true || isAdminEmail(opts.email)) return true;
  return isPaidPlan(opts.plan);
}

/**
 * Video: all paid plans including Lite. Free never.
 * Aligns product matrix; keep plans.ts lite.video in sync so editor plan.video gate matches.
 */
export function canAccessVideo(opts: {
  plan: string | null | undefined;
  email?: string | null | undefined;
  isAdmin?: boolean;
}): boolean {
  if (opts.isAdmin === true || isAdminEmail(opts.email)) return true;
  return isPaidPlan(opts.plan);
}

/** Music: all paid plans (Lite includes music). Free never. */
export function canAccessMusic(opts: {
  plan: string | null | undefined;
  email?: string | null | undefined;
  isAdmin?: boolean;
}): boolean {
  if (opts.isAdmin === true || isAdminEmail(opts.email)) return true;
  return isPaidPlan(opts.plan);
}

export function shouldShowAds(opts: {
  plan: string | null | undefined;
  email?: string | null | undefined;
  isAdmin?: boolean;
}): boolean {
  const admin = opts.isAdmin === true || isAdminEmail(opts.email);
  if (admin) return false;
  if (isPaidPlan(opts.plan)) return false;
  return true;
}

export function getWatermarkMode(opts: {
  plan: string | null | undefined;
  email?: string | null | undefined;
  isAdmin?: boolean;
  keepWatermark?: boolean;
  forDownload?: boolean;
}): WatermarkMode {
  const admin = opts.isAdmin === true || isAdminEmail(opts.email);
  if (admin) return "none";
  if (isFreePlan(opts.plan)) {
    return "primary+secondary";
  }
  if (opts.keepWatermark) return "primary";
  return "none";
}

export function shouldApplyWatermark(opts: {
  plan: string | null | undefined;
  email?: string | null | undefined;
  isAdmin?: boolean;
  keepWatermark?: boolean;
}): boolean {
  return getWatermarkMode(opts) !== "none";
}

export function shouldApplySecondaryWatermark(opts: {
  plan: string | null | undefined;
  email?: string | null | undefined;
  isAdmin?: boolean;
}): boolean {
  const admin = opts.isAdmin === true || isAdminEmail(opts.email);
  if (admin) return false;
  return isFreePlan(opts.plan);
}
