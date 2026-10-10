/**
 * Plan assignment safety — top-ups must never become paid plans.
 * Run: npx tsx --test src/lib/payments.plan-resolve.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isTopUpTransaction, resolvePlanToAssign } from "./payments.plan-resolve";
import { PLAN_PURCHASE } from "./payments.server";
import { creditsFromUsd } from "./credit-topups";

describe("isTopUpTransaction", () => {
  it("detects kind credit_topup", () => {
    assert.equal(isTopUpTransaction({ metadata: { kind: "credit_topup" } }), true);
  });
  it("detects topup_ transaction_id prefix", () => {
    assert.equal(isTopUpTransaction({ transaction_id: "topup_123_abc" }), true);
  });
  it("plan purchases are not top-ups", () => {
    assert.equal(
      isTopUpTransaction({
        transaction_id: "M2E-PP-uuid",
        metadata: { kind: "plan_purchase", plan: "lite" },
      }),
      false,
    );
  });
});

describe("resolvePlanToAssign", () => {
  it("assigns from plan_purchase metadata", () => {
    assert.equal(
      resolvePlanToAssign({
        credits_purchased: 350,
        metadata: { kind: "plan_purchase", plan: "lite" },
      }),
      "lite",
    );
  });

  it("never assigns plan for credit_topup even if credits match lite", () => {
    assert.equal(
      resolvePlanToAssign({
        transaction_id: "topup_1",
        credits_purchased: PLAN_PURCHASE.lite.credits,
        metadata: { kind: "credit_topup" },
      }),
      null,
    );
  });

  it("never assigns plan for topup_ prefix without kind", () => {
    assert.equal(
      resolvePlanToAssign({
        transaction_id: "topup_999",
        credits_purchased: 350,
        metadata: null,
      }),
      null,
    );
  });

  it("custom top-up credit sizes that equal plan packs still do not assign when top-up", () => {
    // $6.23 → 350 credits (lite pack size) — must not assign lite
    const credits = creditsFromUsd(6.23);
    assert.equal(credits, 350);
    assert.equal(
      resolvePlanToAssign({
        transaction_id: "topup_custom",
        credits_purchased: credits,
        metadata: { kind: "credit_topup", customUsd: 6.23 },
      }),
      null,
    );
  });

  it("legacy plan row without metadata uses credit fallback", () => {
    assert.equal(
      resolvePlanToAssign({
        transaction_id: "M2E-PP-legacy",
        credits_purchased: 350,
        metadata: null,
      }),
      "lite",
    );
  });

  it("fixed top-up pack sizes do not match plan packs", () => {
    for (const usd of [4.99, 10, 29.99, 55, 110]) {
      const c = creditsFromUsd(usd);
      assert.equal(
        resolvePlanToAssign({
          transaction_id: `topup_pack_${c}`,
          credits_purchased: c,
          metadata: { kind: "credit_topup" },
        }),
        null,
      );
    }
  });
});
