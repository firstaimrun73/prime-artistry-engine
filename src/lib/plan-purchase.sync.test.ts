import { describe, expect, it } from "vitest";
import { DISPLAY_PRICES, PLAN_CREDITS, PRICING_SHOW_PLAN_IDS } from "./plans";
import { PLAN_PURCHASE, planFromCredits, isPurchasablePlan } from "./payments.server";

/**
 * Server checkout amounts/credits must stay locked to plans.ts.
 * Never charge a client-submitted price.
 */
describe("PLAN_PURCHASE sync with plans.ts", () => {
  it("covers every paid plan id shown on pricing", () => {
    for (const id of PRICING_SHOW_PLAN_IDS) {
      expect(isPurchasablePlan(id)).toBe(true);
      expect(PLAN_PURCHASE[id]).toBeDefined();
    }
  });

  it("matches PLAN_CREDITS and DISPLAY_PRICES USD/INR for each plan", () => {
    const expected = {
      lite: { credits: 350, amountUSD: 4.99, amountINR: 449 },
      plus: { credits: 800, amountUSD: 9.99, amountINR: 899 },
      pro: { credits: 2500, amountUSD: 29.99, amountINR: 2699 },
      studio: { credits: 5000, amountUSD: 55, amountINR: 4999 },
      business: { credits: 10000, amountUSD: 110, amountINR: 9999 },
    } as const;

    for (const id of Object.keys(expected) as (keyof typeof expected)[]) {
      const pkg = PLAN_PURCHASE[id];
      expect(pkg.credits).toBe(expected[id].credits);
      expect(pkg.amountUSD).toBe(expected[id].amountUSD);
      expect(pkg.amountINR).toBe(expected[id].amountINR);
      expect(pkg.credits).toBe(PLAN_CREDITS[id]);
      expect(pkg.amountUSD).toBe(DISPLAY_PRICES[id].USD);
      expect(pkg.amountINR).toBe(DISPLAY_PRICES[id].INR);
    }
  });

  it("planFromCredits maps unique monthly allocations to plan ids", () => {
    expect(planFromCredits(350)).toBe("lite");
    expect(planFromCredits(800)).toBe("plus");
    expect(planFromCredits(2500)).toBe("pro");
    expect(planFromCredits(5000)).toBe("studio");
    expect(planFromCredits(10000)).toBe("business");
    expect(planFromCredits(999)).toBeNull();
  });

  it("does not include free as purchasable", () => {
    expect(isPurchasablePlan("free")).toBe(false);
    expect("free" in PLAN_PURCHASE).toBe(false);
  });
});
