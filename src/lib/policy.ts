// Authoritative plan / role / ad / watermark policy.
//
// UI may read these helpers for presentation, but generation, credits,
// and download decisions must still be re-validated on the server from
// the authenticated Supabase profile (see generate.functions.ts).
// Never treat client-only React state or localStorage as authorization.

import type { PlanId } from "./plans";
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
 * Authoritative ad decision.
 *
 *   ADMIN  → never show ads / never load Monetag or vignette scripts
 *   PAID   → never show ads
 *   FREE   → ads allowed (outside editor/studio excluded routes)
 *
 * Prefer not initializing ad scripts at all for admin/paid rather than
 * loading them and only hiding the container.
 */
export function shouldShowAds(opts: {
  plan: string | null | undefined;
  email?: string | null | undefined;
  isAdmin?: boolean;
}): boolean {
  const admin =
    opts.isAdmin === true || isAdminEmail(opts.email);
  if (admin) return false;
  if (isPaidPlan(opts.plan)) return false;
  return true; // free (or unknown → treat as free for safety of ad display only)
}

/**
 * Watermark composition mode for a given user + optional paid toggle.
 *
 * FREE:
 *   - primary always on (preview + download)
 *   - secondary (diagonal grid) always on for download; strong on preview
 *   - cannot disable
 *
 * PAID:
 *   - primary only when user opts in (keepWatermark === true)
 *   - secondary NEVER
 *
 * ADMIN:
 *   - none
 */
export function getWatermarkMode(opts: {
  plan: string | null | undefined;
  email?: string | null | undefined;
  isAdmin?: boolean;
  /** Paid-user preference only; ignored for free/admin. */
  keepWatermark?: boolean;
  /** When true, include secondary layer (download path for free). */
  forDownload?: boolean;
}): WatermarkMode {
  const admin =
    opts.isAdmin === true || isAdminEmail(opts.email);
  if (admin) return "none";

  if (isFreePlan(opts.plan)) {
    // Free always gets primary; secondary on download (and we also use
    // strong primary path for preview so free users never see a clean URL).
    return opts.forDownload ? "primary+secondary" : "primary+secondary";
  }

  // Paid: primary only if they opted in
  if (opts.keepWatermark) return "primary";
  return "none";
}

/** Convenience: should the client apply any watermark at all? */
export function shouldApplyWatermark(opts: {
  plan: string | null | undefined;
  email?: string | null | undefined;
  isAdmin?: boolean;
  keepWatermark?: boolean;
}): boolean {
  return getWatermarkMode(opts) !== "none";
}

/** Convenience: strong (secondary grid) only for free users. */
export function shouldApplySecondaryWatermark(opts: {
  plan: string | null | undefined;
  email?: string | null | undefined;
  isAdmin?: boolean;
}): boolean {
  const admin =
    opts.isAdmin === true || isAdminEmail(opts.email);
  if (admin) return false;
  return isFreePlan(opts.plan);
}
