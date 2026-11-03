/**
 * Checkout URL search validation — single source of truth.
 * Never fall back to "lite" for unknown plan IDs.
 */
import type { Currency, PlanId } from "@/lib/plans";

export const VALID_CHECKOUT_PLANS = [
  "starter",
  "pro",
  "ultra",
  // Legacy (existing links / admin)
  "lite",
  "plus",
  "studio",
  "business",
] as const;

export type CheckoutPlanId = (typeof VALID_CHECKOUT_PLANS)[number];
export type CheckoutInterval = "month" | "year";

export type CheckoutSearch = {
  plan: PlanId;
  currency: Currency;
  interval: CheckoutInterval;
};

export function parseCheckoutSearch(
  s: Record<string, unknown>,
): CheckoutSearch {
  const planRaw = typeof s.plan === "string" ? s.plan : "";
  const plan = (
    (VALID_CHECKOUT_PLANS as readonly string[]).includes(planRaw)
      ? planRaw
      : "starter"
  ) as PlanId;

  const currency = (
    ["USD", "EUR", "INR"].includes(s.currency as string)
      ? s.currency
      : "USD"
  ) as Currency;

  const interval: CheckoutInterval =
    s.interval === "year" ? "year" : "month";

  return { plan, currency, interval };
}
