/**
 * Product-level quote adapters.
 *
 * Each product supplies:
 *   - known/estimated provider COGS (internal)
 *   - OR a legacy customer-credit amount (until final economics review)
 *
 * Customer-facing credits always go through createGenerationQuote / lifecycle.
 * Do NOT invent final Motio2edit plan prices here.
 *
 * FINAL ECONOMICS TO BE DESIGNED AFTER CROSS-REVIEW BY CHATGPT + GROK + CLAUDE.
 */

import { createGenerationQuote } from "./quote-service";
import { createFreeGenerationQuote } from "./lifecycle";
import type { BillingProduct, GenerationQuote } from "./types";
import { DEFAULT_BILLING_CONFIG } from "./types";
import { providerCogsToCustomerCredits } from "./customer-pricing";

export type ProductQuoteInput = {
  userId: string;
  product: BillingProduct;
  operation: string;
  provider: string;
  modelId: string;
  endpoint: string;
  /** Internal provider COGS USD — required for audit even when free. */
  providerCogsUsd: number;
  /**
   * When set, use this exact customer credit charge (legacy product tables).
   * When omitted, derive from providerCogsUsd via MotioCreditPricingEngine scaffold.
   * Never accept this from an untrusted client body without server recompute.
   */
  legacyCustomerCredits?: number;
  free?: boolean;
  idempotencyKey?: string;
  mode?: string;
  durationSec?: number;
  resolution?: string;
  aspectRatio?: string;
  audio?: boolean;
  metadata?: Record<string, unknown>;
};

/**
 * Build a GenerationQuote for any product.
 * Prefer provider COGS → pricing engine; allow legacyCustomerCredits only
 * as a temporary bridge until economics are finalized.
 */
export function quoteForProduct(input: ProductQuoteInput): GenerationQuote {
  if (input.free) {
    return createFreeGenerationQuote({
      userId: input.userId,
      product: input.product,
      operation: input.operation,
      provider: input.provider,
      modelId: input.modelId,
      endpoint: input.endpoint,
      providerCogsUsd: input.providerCogsUsd,
      mode: input.mode,
      durationSec: input.durationSec,
      resolution: input.resolution,
      aspectRatio: input.aspectRatio,
      audio: input.audio,
      idempotencyKey: input.idempotencyKey,
      metadata: { ...input.metadata, legacyBridge: false },
    });
  }

  if (input.legacyCustomerCredits != null) {
    const quote = createGenerationQuote(
      {
        userId: input.userId,
        product: input.product,
        operation: input.operation,
        provider: input.provider,
        modelId: input.modelId,
        endpoint: input.endpoint,
        providerCogsUsd: input.providerCogsUsd,
        mode: input.mode,
        durationSec: input.durationSec,
        resolution: input.resolution,
        aspectRatio: input.aspectRatio,
        audio: input.audio,
        idempotencyKey: input.idempotencyKey,
        metadata: {
          ...input.metadata,
          legacyCustomerCredits: input.legacyCustomerCredits,
          pricingMode: "legacy_product_table",
        },
      },
      DEFAULT_BILLING_CONFIG,
    );
    quote.customerCredits = Math.max(0, Math.floor(input.legacyCustomerCredits));
    return quote;
  }

  return createGenerationQuote(
    {
      userId: input.userId,
      product: input.product,
      operation: input.operation,
      provider: input.provider,
      modelId: input.modelId,
      endpoint: input.endpoint,
      providerCogsUsd: input.providerCogsUsd,
      mode: input.mode,
      durationSec: input.durationSec,
      resolution: input.resolution,
      aspectRatio: input.aspectRatio,
      audio: input.audio,
      idempotencyKey: input.idempotencyKey,
      metadata: { ...input.metadata, pricingMode: "cogs_engine" },
    },
    DEFAULT_BILLING_CONFIG,
  );
}

/**
 * Preview customer credits from provider COGS without creating a stored quote.
 * For UI "what will this cost?" — server-side only.
 */
export function previewCustomerCreditsFromCogs(
  providerCogsUsd: number,
  product: BillingProduct,
): { customerCredits: number; pricingVersion: string; providerCogsUsd: number } {
  const q = providerCogsToCustomerCredits(providerCogsUsd, product, DEFAULT_BILLING_CONFIG);
  return {
    customerCredits: q.customerCredits,
    pricingVersion: q.pricingVersion,
    providerCogsUsd: q.providerCogsUsd,
  };
}
