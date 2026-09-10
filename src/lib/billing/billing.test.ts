/**
 * Billing scaffold tests — provider COGS → Motio credits conversion.
 * FINAL ECONOMICS TO BE DESIGNED AFTER CROSS-REVIEW BY CHATGPT + GROK + CLAUDE.
 * These assert mechanics, not final business prices.
 */
import { describe, expect, test } from "bun:test";
import { providerCogsToCustomerCredits } from "./customer-pricing";
import { DEFAULT_BILLING_CONFIG } from "./types";
import {
  createGenerationQuote,
  isInsufficientCredits,
  _clearQuoteStoreForTests,
} from "./quote-service";

describe("MotioCreditPricingEngine scaffold", () => {
  test("zero COGS yields product minimum or rounding floor (video min is 0)", () => {
    const q = providerCogsToCustomerCredits(0, "video", DEFAULT_BILLING_CONFIG);
    expect(q.customerCredits).toBeGreaterThanOrEqual(0);
    expect(q.appliedMinimum).toBe(false);
  });

  test("higher COGS yields higher credits", () => {
    const low = providerCogsToCustomerCredits(0.05, "video");
    const high = providerCogsToCustomerCredits(0.5, "video");
    expect(high.customerCredits).toBeGreaterThan(low.customerCredits);
  });

  test("credits are rounded to step", () => {
    const q = providerCogsToCustomerCredits(0.123, "video");
    expect(q.customerCredits % DEFAULT_BILLING_CONFIG.roundingStep).toBe(0);
  });

  test("providerCogsUsd is recorded, not exposed as customer currency", () => {
    const q = providerCogsToCustomerCredits(0.25, "video");
    expect(q.providerCogsUsd).toBeCloseTo(0.25, 4);
    expect(q.customerCredits).not.toBe(q.providerCogsUsd);
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

describe("quote idempotency", () => {
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
  });
});
