/**
 * Shared Motio2edit generation billing lifecycle.
 *
 * Flow:
 *   createQuote → reserveQuote → markGenerating → finalizeQuote
 *                              ↘ on failure → releaseQuote
 *
 * Provider COGS and customer Motio2edit credits are separate fields.
 * FINAL ECONOMICS TO BE DESIGNED AFTER CROSS-REVIEW BY CHATGPT + GROK + CLAUDE.
 *
 * Atomic balance protection relies on public.deduct_credits RPC
 * (UPDATE … WHERE credits >= amount). Concurrent overspend is rejected at the DB.
 */

import {
  createGenerationQuote,
  getQuote,
  reserveCreditsForQuote,
  releaseReservation,
  markGenerating,
  finalizeQuote,
  markFailed,
  assertQuoteOwned,
  isInsufficientCredits,
} from "./quote-service";
import type {
  BillingProduct,
  GenerationQuote,
  QuoteRequest,
  InsufficientCreditsError,
} from "./types";
import { DEFAULT_BILLING_CONFIG } from "./types";

export type SupabaseAdminLike = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

/** Customer-safe quote projection — never includes providerCogsUsd. */
export type CustomerQuoteView = {
  quoteId: string;
  product: BillingProduct;
  operation: string;
  customerCredits: number;
  pricingVersion: string;
  expiresAt: string;
  status: string;
  /** Capability/display hints only — no internal economics */
  metadata?: {
    mode?: string;
    durationSec?: number;
    resolution?: string;
    aspectRatio?: string;
    audio?: boolean;
  };
};

/** Internal accounting row (admin / reconciliation only). */
export type InternalGenerationAccounting = {
  quoteId: string;
  userId: string;
  product: BillingProduct;
  operation: string;
  provider: string;
  modelId: string;
  endpoint: string;
  providerCogsUsd: number;
  customerCreditsQuoted: number;
  customerCreditsFinal?: number;
  finalProviderCogsUsd?: number;
  pricingVersion: string;
  status: string;
  reservationTxId?: string;
  idempotencyKey?: string;
  createdAt: string;
  expiresAt: string;
};

/**
 * Ignore any client-supplied charge fields.
 * Authoritative amount always comes from a server-built GenerationQuote.
 */
export function stripClientBillingFields<T extends Record<string, unknown>>(
  body: T,
): Omit<T, "credits" | "creditCost" | "customerCredits" | "providerCost" | "providerCogsUsd" | "price" | "cost"> {
  const {
    credits: _c,
    creditCost: _cc,
    customerCredits: _qc,
    providerCost: _pc,
    providerCogsUsd: _cogs,
    price: _p,
    cost: _cost,
    ...safe
  } = body as T & Record<string, unknown>;
  return safe as Omit<
    T,
    "credits" | "creditCost" | "customerCredits" | "providerCost" | "providerCogsUsd" | "price" | "cost"
  >;
}

export function toCustomerQuoteView(quote: GenerationQuote): CustomerQuoteView {
  return {
    quoteId: quote.quoteId,
    product: quote.product,
    operation: quote.operation,
    customerCredits: quote.customerCredits,
    pricingVersion: quote.pricingVersion,
    expiresAt: quote.expiresAt,
    status: quote.status,
    metadata: {
      mode: quote.mode,
      durationSec: quote.durationSec,
      resolution: quote.resolution,
      aspectRatio: quote.aspectRatio,
      audio: quote.audio,
    },
  };
}

export function toInternalAccounting(quote: GenerationQuote): InternalGenerationAccounting {
  return {
    quoteId: quote.quoteId,
    userId: quote.userId,
    product: quote.product,
    operation: quote.operation,
    provider: quote.provider,
    modelId: quote.modelId,
    endpoint: quote.endpoint,
    providerCogsUsd: quote.providerCogsUsd,
    customerCreditsQuoted: quote.customerCredits,
    customerCreditsFinal: quote.finalCredits,
    finalProviderCogsUsd: quote.finalProviderCogsUsd,
    pricingVersion: quote.pricingVersion,
    status: quote.status,
    reservationTxId: quote.reservationTxId,
    idempotencyKey: quote.idempotencyKey,
    createdAt: quote.createdAt,
    expiresAt: quote.expiresAt,
  };
}

export function createQuote(req: QuoteRequest): GenerationQuote {
  return createGenerationQuote(req, DEFAULT_BILLING_CONFIG);
}

/**
 * Free / welcome generation: customer charge is 0, provider COGS still recorded.
 * Does not call deduct_credits. Entitlement must be checked by the caller.
 */
export function createFreeGenerationQuote(
  req: Omit<QuoteRequest, "providerCogsUsd"> & { providerCogsUsd: number },
): GenerationQuote {
  // Build a normal quote for audit fields, then force customer charge to 0.
  // providerCogsUsd remains the real internal cost (free ≠ free for Motio2edit).
  const quote = createGenerationQuote(
    { ...req, providerCogsUsd: req.providerCogsUsd },
    DEFAULT_BILLING_CONFIG,
  );
  quote.customerCredits = 0;
  quote.metadata = {
    ...quote.metadata,
    freeGeneration: true,
    providerCogsStillRecorded: true,
  };
  return quote;
}

export async function reserveQuote(
  admin: SupabaseAdminLike,
  quote: GenerationQuote,
  availableCredits: number,
): Promise<GenerationQuote> {
  // Free generations: no debit.
  if (quote.customerCredits <= 0) {
    quote.status = "reserved";
    return quote;
  }
  return reserveCreditsForQuote(admin, quote, availableCredits);
}

export async function releaseQuote(
  admin: SupabaseAdminLike,
  quote: GenerationQuote,
): Promise<GenerationQuote> {
  if (quote.customerCredits <= 0 && !quote.reservationTxId) {
    if (quote.status !== "finalized") quote.status = "released";
    return quote;
  }
  return releaseReservation(admin, quote);
}

export {
  getQuote,
  markGenerating,
  finalizeQuote,
  markFailed,
  assertQuoteOwned,
  isInsufficientCredits,
};

/**
 * Run a provider operation under the shared billing lifecycle.
 * On success: finalize. On failure: release reservation exactly once.
 */
export async function runWithBillingLifecycle<T>(opts: {
  admin: SupabaseAdminLike;
  quote: GenerationQuote;
  availableCredits: number;
  isAdmin?: boolean;
  execute: () => Promise<T>;
}): Promise<{ result: T; quote: GenerationQuote; creditsCharged: number }> {
  const { admin, availableCredits, isAdmin, execute } = opts;
  let quote = opts.quote;

  if (!isAdmin) {
    const insuff = isInsufficientCredits(availableCredits, quote.customerCredits, quote.quoteId);
    if (insuff) {
      const err = new Error("INSUFFICIENT_CREDITS") as Error & { details: InsufficientCreditsError };
      err.details = insuff;
      throw err;
    }
    quote = await reserveQuote(admin, quote, availableCredits);
    markGenerating(quote);
  } else {
    quote.status = "generating";
  }

  try {
    const result = await execute();
    quote = finalizeQuote(quote, {
      finalProviderCogsUsd: quote.providerCogsUsd,
      finalCredits: isAdmin ? 0 : quote.customerCredits,
    });
    return {
      result,
      quote,
      creditsCharged: isAdmin ? 0 : quote.finalCredits ?? quote.customerCredits,
    };
  } catch (err) {
    markFailed(quote);
    if (!isAdmin) {
      await releaseQuote(admin, quote);
    }
    throw err;
  }
}
