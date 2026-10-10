/**
 * Plan price / credit consistency — payment config must match public plans.
 * Run: npx tsx --test src/lib/payments.plan-consistency.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DISPLAY_PRICES, PLAN_CREDITS, PLANS, type PlanId } from "./plans";
import { PLAN_PURCHASE, planFromCredits, isPurchasablePlan } from "./payments.server";
import { LITE_PROMO, assertPromoMatchesRegularLite } from "./promo/lite-offer";

const PAID: PlanId[] = ["lite", "plus", "pro", "studio", "business"];

describe("PLAN_PURCHASE matches plans.ts", () => {
  for (const id of PAID) {
    it(`${id}: credits and USD/INR match DISPLAY_PRICES + PLAN_CREDITS`, () => {
      const pkg = PLAN_PURCHASE[id as keyof typeof PLAN_PURCHASE];
      assert.ok(pkg, `missing PLAN_PURCHASE.${id}`);
      assert.equal(pkg.credits, PLAN_CREDITS[id], `${id} credits`);
      assert.equal(pkg.amountUSD, DISPLAY_PRICES[id].USD, `${id} USD`);
      assert.equal(pkg.amountINR, DISPLAY_PRICES[id].INR, `${id} INR`);
    });
  }

  it("Lite is $4.99 / 350 (authoritative public price)", () => {
    assert.equal(PLAN_PURCHASE.lite.amountUSD, 4.99);
    assert.equal(PLAN_PURCHASE.lite.credits, 350);
    assert.equal(DISPLAY_PRICES.lite.USD, 4.99);
    assert.equal(PLAN_CREDITS.lite, 350);
  });

  it("stale $9 / 500 Lite must not appear", () => {
    assert.notEqual(PLAN_PURCHASE.lite.amountUSD, 9);
    assert.notEqual(PLAN_PURCHASE.lite.credits, 500);
  });

  it("PLANS array matches PLAN_CREDITS for paid plans", () => {
    for (const id of PAID) {
      const p = PLANS.find((x) => x.id === id);
      assert.ok(p);
      assert.equal(p!.credits, PLAN_CREDITS[id]);
      assert.equal(p!.price.USD, DISPLAY_PRICES[id].USD);
    }
  });
});

describe("planFromCredits / isPurchasablePlan", () => {
  it("resolves unique credit counts", () => {
    assert.equal(planFromCredits(350), "lite");
    assert.equal(planFromCredits(800), "plus");
    assert.equal(planFromCredits(99999), null);
  });

  it("isPurchasablePlan", () => {
    assert.equal(isPurchasablePlan("lite"), true);
    assert.equal(isPurchasablePlan("free"), false);
    assert.equal(isPurchasablePlan(null), false);
  });
});

describe("Lite promo config", () => {
  it("promo price is below regular Lite and credits match", () => {
    assertPromoMatchesRegularLite();
    assert.equal(LITE_PROMO.planId, "lite");
    assert.equal(LITE_PROMO.promoPriceUSD, 2.99);
    assert.equal(LITE_PROMO.regularPriceUSD, PLAN_PURCHASE.lite.amountUSD);
    assert.equal(LITE_PROMO.credits, PLAN_PURCHASE.lite.credits);
  });
});
