/**
 * Image debit/refund response parsing — zero network.
 * Run: npx tsx --test src/lib/billing/image-debit-refund.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseDeductCreditsResponse,
  parseRefundCreditsResponse,
  shouldRefundOnExit,
  buildUnconfirmedRefundLog,
  buildUntraceableDebitLog,
  isUuid,
  IMAGE_BILLING_DURABLE_RECOVERY_STATUS,
} from "./image-debit-refund";

const TX = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

describe("isUuid", () => {
  it("accepts uuid v4-shaped strings", () => {
    assert.equal(isUuid(TX), true);
  });
  it("rejects empty and non-uuid", () => {
    assert.equal(isUuid(""), false);
    assert.equal(isUuid("not-a-uuid"), false);
    assert.equal(isUuid(null), false);
  });
});

describe("parseDeductCreditsResponse", () => {
  it("ok with transaction_id and credits", () => {
    const r = parseDeductCreditsResponse({ transaction_id: TX, credits: 90 }, null);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.transactionId, TX);
      assert.equal(r.credits, 90);
    }
  });

  it("fails on RPC error without marking untraceable", () => {
    const r = parseDeductCreditsResponse(null, { message: "INSUFFICIENT_CREDITS" });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.untraceableDebit, false);
      assert.match(r.reason, /INSUFFICIENT_CREDITS/);
    }
  });

  it("fails untraceable when payload null", () => {
    const r = parseDeductCreditsResponse(null, null);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.untraceableDebit, true);
  });

  it("fails untraceable when transaction_id missing", () => {
    const r = parseDeductCreditsResponse({ credits: 10 }, null);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.untraceableDebit, true);
      assert.match(r.reason, /transaction_id/);
    }
  });

  it("fails untraceable when transaction_id malformed", () => {
    const r = parseDeductCreditsResponse({ transaction_id: "abc", credits: 1 }, null);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.untraceableDebit, true);
  });
});

describe("parseRefundCreditsResponse", () => {
  it("ok only when refunded true", () => {
    const r = parseRefundCreditsResponse({ refunded: true, credits: 100 }, null);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.credits, 100);
  });

  it("fails on refunded false", () => {
    const r = parseRefundCreditsResponse({ refunded: false }, null);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.reason, /refunded: false/);
  });

  it("fails on RPC error", () => {
    const r = parseRefundCreditsResponse(null, { message: "NOT_AUTHENTICATED" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.reason, /NOT_AUTHENTICATED/);
  });

  it("fails when payload missing refunded", () => {
    const r = parseRefundCreditsResponse({ credits: 1 }, null);
    assert.equal(r.ok, false);
  });

  it("fails on null payload", () => {
    const r = parseRefundCreditsResponse(null, null);
    assert.equal(r.ok, false);
  });
});

describe("shouldRefundOnExit", () => {
  it("does not refund after successful generation", () => {
    assert.equal(
      shouldRefundOnExit({ generationSucceeded: true, reservationTxId: TX }),
      false,
    );
  });

  it("refunds on failure when reservation present", () => {
    assert.equal(
      shouldRefundOnExit({ generationSucceeded: false, reservationTxId: TX }),
      true,
    );
  });

  it("does not refund when no reservation", () => {
    assert.equal(
      shouldRefundOnExit({ generationSucceeded: false, reservationTxId: null }),
      false,
    );
  });
});

describe("critical log builders", () => {
  it("unconfirmed refund log includes ids and reason", () => {
    const log = buildUnconfirmedRefundLog(
      { transactionId: TX, userId: "u1", amount: 25, genType: "image_standard" },
      { ok: false, reason: "refunded: false" },
    );
    assert.equal(log.event, "image_credit_refund_unconfirmed");
    assert.equal(log.transaction_id, TX);
    assert.equal(log.user_id, "u1");
  });

  it("untraceable debit log includes amount", () => {
    const log = buildUntraceableDebitLog({
      userId: "u1",
      amount: 25,
      genType: "image",
      reason: "missing tx",
    });
    assert.equal(log.event, "image_credit_debit_untraceable");
    assert.equal(log.amount, 25);
  });
});

describe("durable recovery status", () => {
  it("is explicitly not implemented", () => {
    assert.equal(IMAGE_BILLING_DURABLE_RECOVERY_STATUS, "proposed_not_implemented");
  });
});
