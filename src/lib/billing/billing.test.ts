/**
 * Billing tests — Video COGS staircase + shared quote mechanics.
 * Video: exact owner staircase on TOTAL provider COGS (includes audio).
 * Face: 1 credit = $0.01. ≥$2.00 → VIDEO_COGS_TIER_UNDEFINED (no fallback).
 */
import { describe, expect, test } from "bun:test";
import {
  providerCogsToCustomerCredits,
  videoCogsStaircaseCredits,
  videoCogsToCredits,
  VIDEO_COGS_TIER_UNDEFINED,
} from "./customer-pricing";
import { DEFAULT_BILLING_CONFIG } from "./types";
import {
  createGenerationQuote,
  isInsufficientCredits,
  finalizeQuote,
  markGenerating,
  _clearQuoteStoreForTests,
} from "./quote-service";

describe("Video COGS staircase — exact boundaries", () => {
  test("$0.00 → 50 credits", () => {
    expect(videoCogsStaircaseCredits(0)).toBe(50);
    expect(videoCogsToCredits(0)).toBe(50);
  });
  test("just under $0.35 → 50 credits", () => {
    expect(videoCogsStaircaseCredits(0.349999)).toBe(50);
  });
  test("$0.35 → 80 credits", () => {
    expect(videoCogsStaircaseCredits(0.35)).toBe(80);
  });
  test("just under $0.50 → 80 credits", () => {
    expect(videoCogsStaircaseCredits(0.499999)).toBe(80);
  });
  test("$0.50 → 100 credits", () => {
    expect(videoCogsStaircaseCredits(0.5)).toBe(100);
  });
  test("just under $0.65 → 100 credits", () => {
    expect(videoCogsStaircaseCredits(0.649999)).toBe(100);
  });
  test("$0.65 → 125 credits", () => {
    expect(videoCogsStaircaseCredits(0.65)).toBe(125);
  });
  test("just under $1.00 → 125 credits", () => {
    expect(videoCogsStaircaseCredits(0.999999)).toBe(125);
  });
  test("$1.00 → 180 credits", () => {
    expect(videoCogsStaircaseCredits(1.0)).toBe(180);
  });
  test("just under $1.25 → 180 credits", () => {
    expect(videoCogsStaircaseCredits(1.249999)).toBe(180);
  });
  test("$1.25 → 250 credits", () => {
    expect(videoCogsStaircaseCredits(1.25)).toBe(250);
  });
  test("just under $2.00 → 250 credits", () => {
    expect(videoCogsStaircaseCredits(1.999999)).toBe(250);
  });
  test("$2.00 → VIDEO_COGS_TIER_UNDEFINED (no fallback)", () => {
    expect(() => videoCogsStaircaseCredits(2.0)).toThrow(VIDEO_COGS_TIER_UNDEFINED);
    expect(() => videoCogsToCredits(2.0)).toThrow(VIDEO_COGS_TIER_UNDEFINED);
  });
  test("above $2.00 → VIDEO_COGS_TIER_UNDEFINED", () => {
    expect(() => videoCogsStaircaseCredits(2.01)).toThrow(VIDEO_COGS_TIER_UNDEFINED);
    expect(() => videoCogsStaircaseCredits(5)).toThrow(VIDEO_COGS_TIER_UNDEFINED);
  });
  test("providerCogsToCustomerCredits maps staircase for product=video", () => {
    const q = providerCogsToCustomerCredits(0.4, "video", DEFAULT_BILLING_CONFIG);
    expect(q.customerCredits).toBe(80);
    expect(q.providerCogsUsd).toBeCloseTo(0.4, 4);
    expect(q.creditFaceCents).toBe(1);
    expect(q.pricingVersion).toBe(DEFAULT_BILLING_CONFIG.pricingVersion);
  });
  test("providerCogsToCustomerCredits throws at $2+", () => {
    expect(() =>
      providerCogsToCustomerCredits(2.0, "video", DEFAULT_BILLING_CONFIG),
    ).toThrow(VIDEO_COGS_TIER_UNDEFINED);
  });
});

describe("MotioCreditPricingEngine scaffold", () => {
  test("zero COGS yields staircase 50 (not product minimum override)", () => {
    const q = providerCogsToCustomerCredits(0, "video", DEFAULT_BILLING_CONFIG);
    expect(q.customerCredits).toBe(50);
    expect(q.appliedMinimum).toBe(false);
  });
  test("higher COGS yields higher credits", () => {
    const low = providerCogsToCustomerCredits(0.05, "video");
    const high = providerCogsToCustomerCredits(0.5, "video");
    expect(high.customerCredits).toBeGreaterThan(low.customerCredits);
    expect(low.customerCredits).toBe(50);
    expect(high.customerCredits).toBe(100);
  });
  test("providerCogsUsd is recorded, not exposed as customer currency", () => {
    const q = providerCogsToCustomerCredits(0.25, "video");
    expect(q.providerCogsUsd).toBeCloseTo(0.25, 4);
    expect(q.customerCredits).not.toBe(q.providerCogsUsd);
    expect(q.customerCredits).toBe(50);
  });
});

describe("insufficient credits guard", () => {
  test("blocks when available < required", () => {
    const err = isInsufficientCredits(40, 55, "q1");
    expect(err).not.toBeNull();
    expect(err!.code).toBe("INSUFFICIENT_CREDITS");
    expect(err!.shortfall).toBe(15);
  });
  test("allows exact balance", () => {
    expect(isInsufficientCredits(55, 55)).toBeNull();
  });
  test("allows surplus", () => {
    expect(isInsufficientCredits(100, 55)).toBeNull();
  });
});

describe("quote idempotency + finalizeQuote signature", () => {
  test("same idempotencyKey returns same quote", () => {
    _clearQuoteStoreForTests();
    const a = createGenerationQuote({
      userId: "u1",
      product: "video",
      operation: "text",
      provider: "fal",
      modelId: "h3-max-turbo",
      endpoint: "fal-ai/hunyuan-video",
      providerCogsUsd: 0.125,
      idempotencyKey: "idem-1",
    });
    const b = createGenerationQuote({
      userId: "u1",
      product: "video",
      operation: "text",
      provider: "fal",
      modelId: "h3-max-turbo",
      endpoint: "fal-ai/hunyuan-video",
      providerCogsUsd: 0.125,
      idempotencyKey: "idem-1",
    });
    expect(a.quoteId).toBe(b.quoteId);
    expect(a.customerCredits).toBe(b.customerCredits);
    expect(a.customerCredits).toBe(50);
  });
  test("finalizeQuote accepts (quote, { finalProviderCogsUsd, finalCredits })", () => {
    _clearQuoteStoreForTests();
    const quote = createGenerationQuote({
      userId: "u1",
      product: "video",
      operation: "text",
      provider: "fal",
      modelId: "h3-max-turbo",
      endpoint: "fal-ai/hunyuan-video",
      providerCogsUsd: 0.4,
      idempotencyKey: "idem-finalize-1",
    });
    expect(quote.customerCredits).toBe(80);
    quote.status = "reserved";
    markGenerating(quote);
    const finalized = finalizeQuote(quote, {
      finalProviderCogsUsd: quote.providerCogsUsd,
      finalCredits: quote.customerCredits,
    });
    expect(finalized.status).toBe("finalized");
    expect(finalized.finalCredits).toBe(80);
    expect(finalized.finalProviderCogsUsd).toBeCloseTo(0.4, 4);
    const again = finalizeQuote(finalized, {
      finalProviderCogsUsd: 0.4,
      finalCredits: 80,
    });
    expect(again.status).toBe("finalized");
    expect(again.finalCredits).toBe(80);
  });
});
