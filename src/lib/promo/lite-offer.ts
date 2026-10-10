/**
 * Targeted Lite $2.99 promotional offer — config + pure helpers only.
 *
 * IMPORTANT:
 * - Does NOT change public pricing (plans.ts / PLAN_PURCHASE).
 * - Does NOT send email. Wire-up requires explicit product approval.
 * - Checkout must validate entitlement server-side before charging $2.99.
 */

import { PLAN_PURCHASE } from "@/lib/payments.server";
import { DISPLAY_PRICES, PLAN_CREDITS } from "@/lib/plans";

export const LITE_PROMO = {
  campaignId: "lite-299-2026q4",
  planId: "lite" as const,
  /** Charged amount when offer is valid — USD only. */
  promoPriceUSD: 2.99,
  /** Must equal public Lite price at campaign design time. */
  regularPriceUSD: DISPLAY_PRICES.lite.USD,
  /** Same credits as regular Lite — not a reduced pack. */
  credits: PLAN_CREDITS.lite,
  /** Max one initial promotional email per user for this campaign. */
  maxEmailsPerUser: 1,
  /** Offer link TTL after issue (days). */
  offerTtlDays: 7,
} as const;

/** Fail hard if public Lite drifted away from the assumed $4.99 — do not invent discounts. */
export function assertPromoMatchesRegularLite(): void {
  const regular = PLAN_PURCHASE.lite.amountUSD;
  if (regular !== 4.99) {
    throw new Error(
      `Lite promo blocked: public Lite is $${regular}, expected $4.99. Do not invent a discount amount.`,
    );
  }
  if (LITE_PROMO.credits !== PLAN_PURCHASE.lite.credits) {
    throw new Error("Lite promo credits must match PLAN_PURCHASE.lite.credits");
  }
  if (LITE_PROMO.promoPriceUSD >= regular) {
    throw new Error("Promo price must be strictly below regular Lite price");
  }
}

export type PromoEligibilitySignals = {
  /** Authenticated user id (required for secure offer). */
  userId: string;
  email: string | null;
  /** Opted out of marketing. */
  marketingUnsubscribed: boolean;
  /** Already on a paid plan. */
  currentPlan: string;
  /** Completed any paid purchase during campaign window. */
  hasPaidPurchaseInCampaign: boolean;
  /** Already received this campaign email. */
  alreadyEmailed: boolean;
  /** Already redeemed this campaign offer. */
  alreadyRedeemed: boolean;
  /** Pricing page sessions ≥ 45s (first-party analytics). */
  pricingDwellSecondsMax: number;
  /** Distinct pricing page visits in last 7 days. */
  pricingVisitsLast7d: number;
  /** Started checkout without completing. */
  abandonedCheckout: boolean;
  /** Returned to pricing after viewing a plan. */
  returnedToPricingAfterPlanView: boolean;
};

export type PromoEligibilityResult =
  | { ok: true; reason: string }
  | { ok: false; reason: string };

/**
 * Pure eligibility gate for the Lite $2.99 campaign.
 * Prefer authenticated users with confirmed email + marketing opt-in.
 */
export function evaluateLitePromoEligibility(s: PromoEligibilitySignals): PromoEligibilityResult {
  if (!s.userId) return { ok: false, reason: "not_authenticated" };
  if (!s.email) return { ok: false, reason: "no_email" };
  if (s.marketingUnsubscribed) return { ok: false, reason: "unsubscribed" };
  if (s.currentPlan && s.currentPlan !== "free") {
    return { ok: false, reason: "already_paid_plan" };
  }
  if (s.hasPaidPurchaseInCampaign) return { ok: false, reason: "already_purchased" };
  if (s.alreadyRedeemed) return { ok: false, reason: "already_redeemed" };
  if (s.alreadyEmailed) return { ok: false, reason: "already_emailed" };

  const interest =
    s.pricingDwellSecondsMax >= 45 ||
    s.pricingVisitsLast7d >= 2 ||
    s.abandonedCheckout ||
    s.returnedToPricingAfterPlanView;

  if (!interest) return { ok: false, reason: "no_interest_signal" };

  return { ok: true, reason: "eligible" };
}

export const LITE_PROMO_EMAIL = {
  subject: "A special offer to try Motio2edit for $2.99",
  bodyPlain: (
    "Still thinking about trying Motio2edit? Here's a special offer to help you get started.\n\n" +
    "Get our Lite plan for just $2.99 instead of $4.99 and explore AI-powered photo editing and creative tools.\n\n" +
    "Ready to create something? Use your personal offer link below.\n\n" +
    "Try Motio2edit for $2.99\n\n" +
    "You're receiving this promotional email because you opted in to product updates and offers. You can unsubscribe at any time."
  ),
} as const;
