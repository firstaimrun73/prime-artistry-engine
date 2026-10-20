/**
 * reserveCreditsForQuote / releaseReservation — mocked admin RPC (zero network).
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  createGenerationQuote,
  reserveCreditsForQuote,
  releaseReservation,
  finalizeQuote,
  markGenerating,
  _clearQuoteStoreForTests,
} from "./quote-service";

const TX = "a1b2c3d4-e5f6-4789-8abc-def012345678";

function mockAdmin(handlers: {
  deduct?: (args: Record<string, unknown>) => { data: unknown; error: { message: string } | null };
  refund?: (args: Record<string, unknown>) => { data: unknown; error: { message: string } | null };
}) {
  return {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === "deduct_credits") {
        return (handlers.deduct ?? (() => ({ data: { transaction_id: TX, credits: 50 }, error: null })))(args);
      }
      if (fn === "refund_credits") {
        return (handlers.refund ?? (() => ({ data: { refunded: true, credits: 100 }, error: null })))(args);
      }
      return { data: null, error: { message: `unknown rpc ${fn}` } };
    },
  };
}

function sampleQuote() {
  return createGenerationQuote({
    userId: "11111111-1111-4111-8111-111111111111",
    product: "video",
    operation: "text-to-video",
    provider: "fal",
    modelId: "test",
    endpoint: "test",
    providerCogsUsd: 0.05,
  });
}

beforeEach(() => _clearQuoteStoreForTests());

describe("reserveCreditsForQuote", () => {
  it("requires three args path: admin + availableCredits and stores transaction_id", async () => {
    const quote = sampleQuote();
    const admin = mockAdmin({});
    const reserved = await reserveCreditsForQuote(admin, quote, 999);
    assert.equal(reserved.status, "reserved");
    assert.equal(reserved.reservationTxId, TX);
  });

  it("rejects missing transaction_id as untraceable", async () => {
    const quote = sampleQuote();
    const admin = mockAdmin({
      deduct: () => ({ data: { credits: 10 }, error: null }),
    });
    await assert.rejects(
      () => reserveCreditsForQuote(admin, quote, 999),
      /RESERVE_UNTRACEABLE|transaction_id/,
    );
  });

  it("finalizeQuote does not take a supabase client", () => {
    const quote = sampleQuote();
    quote.status = "reserved";
    quote.reservationTxId = TX;
    markGenerating(quote);
    const fin = finalizeQuote(quote, { finalCredits: quote.customerCredits });
    assert.equal(fin.status, "finalized");
  });
});

describe("releaseReservation", () => {
  it("requires refunded:true", async () => {
    const quote = sampleQuote();
    quote.status = "reserved";
    quote.reservationTxId = TX;
    const admin = mockAdmin({
      refund: () => ({ data: { refunded: false }, error: null }),
    });
    await assert.rejects(() => releaseReservation(admin, quote), /REFUND_UNCONFIRMED/);
    assert.notEqual(quote.status, "released");
  });

  it("marks released only after confirmed refund", async () => {
    const quote = sampleQuote();
    quote.status = "reserved";
    quote.reservationTxId = TX;
    const admin = mockAdmin({});
    const out = await releaseReservation(admin, quote);
    assert.equal(out.status, "released");
  });
});
