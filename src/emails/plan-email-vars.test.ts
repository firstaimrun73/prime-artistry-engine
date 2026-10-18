import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDefaultPlanEmailVars, welcomeEmail, DEFAULT_PLAN_EMAIL_VARS } from "./templates";
import { DISPLAY_PRICES, PLAN_CREDITS, FREE_SIGNUP_CREDITS } from "@/lib/plans";

describe("plan email vars", () => {
  it("matches DISPLAY_PRICES and PLAN_CREDITS for all paid tiers", () => {
    const v = buildDefaultPlanEmailVars();
    assert.equal(v.price_lite, `$${DISPLAY_PRICES.lite.USD}`);
    assert.equal(v.price_plus, `$${DISPLAY_PRICES.plus.USD}`);
    assert.equal(v.price_pro, `$${DISPLAY_PRICES.pro.USD}`);
    assert.equal(v.price_studio, `$${DISPLAY_PRICES.studio.USD}`);
    assert.equal(v.price_business, `$${DISPLAY_PRICES.business.USD}`);
    assert.equal(v.credits_lite, PLAN_CREDITS.lite.toLocaleString("en-US"));
    assert.equal(v.credits_plus, PLAN_CREDITS.plus.toLocaleString("en-US"));
    assert.equal(v.credits_pro, PLAN_CREDITS.pro.toLocaleString("en-US"));
    assert.equal(v.credits_studio, PLAN_CREDITS.studio.toLocaleString("en-US"));
    assert.equal(v.credits_business, PLAN_CREDITS.business.toLocaleString("en-US"));
    assert.equal(v.credits_free, FREE_SIGNUP_CREDITS.toLocaleString("en-US"));
    assert.notEqual(v.price_lite, "$9");
    assert.notEqual(v.credits_lite, "500");
  });
  it("welcome HTML includes all six plan cards and current prices", () => {
    const { html } = welcomeEmail();
    for (const label of ["Free", "Lite", "Plus", "Pro", "AI Studio", "Master Studio"]) {
      assert.match(html, new RegExp(label));
    }
    assert.match(html, /\$4\.99/);
    assert.match(html, /\$9\.99/);
    assert.match(html, /\$29\.99/);
    assert.match(html, /\$55/);
    assert.match(html, /\$110/);
    assert.match(html, /350/);
    assert.match(html, /10,000/);
  });
  it("DEFAULT_PLAN_EMAIL_VARS stays in sync", () => {
    assert.deepEqual(DEFAULT_PLAN_EMAIL_VARS, buildDefaultPlanEmailVars());
  });
});
