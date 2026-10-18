/**
 * Image reservation lifecycle: reserve → finalize | release once.
 * Uses quote-service in-memory store + mocked Supabase RPC.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createGenerationQuote,
  reserveCreditsForQuote,
  releaseReservation,
  finalizeQuote,
  markGenerating,
  markFailed,
  _clearQuoteStoreForTests,
} from "./quote-service";

function mockAdmin(opts?: {
  deductOk?: boolean;
  deductTx?: string;
  refundOk?: boolean;
  refundCalls?: { n: number };
}) {
  const refundCalls = opts?.refundCalls ?? { n: 0 };
  return {
    refundCalls,
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === "deduct_credits") {
        if (opts?.deductOk === false) {
          return { data: null, error: { message: "INSUFFICIENT_CREDITS" } };
        }
        return {
          data: { transaction_id: opts?.deductTx ?? "tx-img-1", credits: 100 },
          error: null,
        };
      }
      if (fn === "refund_credits") {
        refundCalls.n += 1;
        if (opts?.refundOk === false) {
          return { data: null, error: { message: "REFUND_FAILED" } };
        }
        return { data: { ok: true }, error: null };
      }
      return { data: null, error: { message: `unknown ${fn}` } };
    },
  };
}

function baseQuote(userId = "user-1") {
  const q = createGenerationQuote({
    userId,
    product: "image_standard",
    operation: "image_generate",
    provider: "fal",
    modelId: "standard",
    endpoint: "fal.image",
    providerCogsUsd: 0.01,
  });
  q.customerCredits = 25;
  return q;
}

describe("image reservation lifecycle", () => {
  beforeEach(() => _clearQuoteStoreForTests());

  it("reserves then finalizes on success (no release)", async () => {
    const admin = mockAdmin();
    const q = baseQuote();
    await reserveCreditsForQuote(admin as any, q, 100);
    assert.equal(q.status, "reserved");
    assert.equal(q.reservationTxId, "tx-img-1");
    markGenerating(q);
    finalizeQuote(q, { finalCredits: 25 });
    assert.equal(q.status, "finalized");
    finalizeQuote(q);
    assert.equal(q.status, "finalized");
    assert.equal(admin.refundCalls.n, 0);
  });

  it("releases once on provider failure", async () => {
    const admin = mockAdmin();
    const q = baseQuote();
    await reserveCreditsForQuote(admin as any, q, 100);
    markGenerating(q);
    await releaseReservation(admin as any, q);
    assert.equal(q.status, "released");
    assert.equal(q.reservationTxId, undefined);
    assert.equal(admin.refundCalls.n, 1);
    await releaseReservation(admin as any, q);
    assert.equal(admin.refundCalls.n, 1);
  });

  it("release after markFailed still refunds at most once", async () => {
    const admin = mockAdmin();
    const q = baseQuote();
    await reserveCreditsForQuote(admin as any, q, 100);
    markGenerating(q);
    await releaseReservation(admin as any, q);
    markFailed(q);
    await releaseReservation(admin as any, q);
    assert.equal(admin.refundCalls.n, 1);
  });

  it("insufficient credits before reserve throws without refund", async () => {
    const admin = mockAdmin({ deductOk: false });
    const q = baseQuote();
    await assert.rejects(
      () => reserveCreditsForQuote(admin as any, q, 5),
      (err: Error) => err.message === "INSUFFICIENT_CREDITS",
    );
    assert.equal(admin.refundCalls.n, 0);
  });

  it("re-reserve on already reserved returns same quote", async () => {
    const admin = mockAdmin();
    const q = baseQuote();
    await reserveCreditsForQuote(admin as any, q, 100);
    const again = await reserveCreditsForQuote(admin as any, q, 100);
    assert.equal(again.quoteId, q.quoteId);
    assert.equal(again.reservationTxId, "tx-img-1");
  });
});
