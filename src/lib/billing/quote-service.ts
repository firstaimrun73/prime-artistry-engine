/**
 * Generation quote + reservation lifecycle.
 *
 * Flow:
 *   quote → check balance → reserve (atomic debit) → generate → finalize
 *   OR on failure → release (refund)
 *
 * Uses existing deduct_credits / refund_credits RPCs (service_role).
 * No schema migration required for Phase C scaffold.
 *
 * Idempotency: same idempotencyKey returns the same in-flight quote.
 */

import { randomUUID } from "node:crypto";
import {
  DEFAULT_BILLING_CONFIG,
  type GenerationQuote,
  type QuoteRequest,
  type QuoteStatus,
  type InsufficientCreditsError,
  type BillingConfig,
} from "./types";
import { providerCogsToCustomerCredits } from "./customer-pricing";

const quoteStore = new Map<string, GenerationQuote>();
const idempotencyIndex = new Map<string, string>();

function nowIso() {
  return new Date().toISOString();
}

function expiresAt(ttlSec: number) {
  return new Date(Date.now() + ttlSec * 1000).toISOString();
}

export function createGenerationQuote(
  req: QuoteRequest,
  config: BillingConfig = DEFAULT_BILLING_CONFIG,
): GenerationQuote {
  if (req.idempotencyKey) {
    const existingId = idempotencyIndex.get(`${req.userId}:${req.idempotencyKey}`);
    if (existingId) {
      const existing = quoteStore.get(existingId);
      if (existing && existing.status !== "expired" && existing.status !== "released") {
        return existing;
      }
    }
  }

  const pricing = providerCogsToCustomerCredits(
    req.providerCogsUsd,
    req.product,
    config,
  );

  const quote: GenerationQuote = {
    quoteId: randomUUID(),
    userId: req.userId,
    product: req.product,
    operation: req.operation,
    provider: req.provider,
    modelId: req.modelId,
    endpoint: req.endpoint,
    mode: req.mode,
    durationSec: req.durationSec,
    resolution: req.resolution,
    aspectRatio: req.aspectRatio,
    audio: req.audio,
    providerCogsUsd: pricing.providerCogsUsd,
    customerCredits: pricing.customerCredits,
    pricingVersion: pricing.pricingVersion,
    createdAt: nowIso(),
    expiresAt: expiresAt(config.quoteTtlSeconds),
    status: "quoted",
    idempotencyKey: req.idempotencyKey,
    metadata: {
      ...req.metadata,
      pricingBreakdown: pricing.breakdown,
    },
  };

  quoteStore.set(quote.quoteId, quote);
  if (req.idempotencyKey) {
    idempotencyIndex.set(`${req.userId}:${req.idempotencyKey}`, quote.quoteId);
  }
  return quote;
}

export function getQuote(quoteId: string): GenerationQuote | undefined {
  const q = quoteStore.get(quoteId);
  if (!q) return undefined;
  if (q.status === "quoted" && new Date(q.expiresAt).getTime() < Date.now()) {
    q.status = "expired";
  }
  return q;
}

export function assertQuoteOwned(quote: GenerationQuote, userId: string): void {
  if (quote.userId !== userId) {
    throw new Error("QUOTE_FORBIDDEN");
  }
}

export function isInsufficientCredits(
  available: number,
  required: number,
  quoteId?: string,
): InsufficientCreditsError | null {
  if (available >= required) return null;
  return {
    code: "INSUFFICIENT_CREDITS",
    requiredCredits: required,
    availableCredits: available,
    shortfall: required - available,
    quoteId,
  };
}

type SupabaseAdmin = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export async function reserveCreditsForQuote(
  admin: SupabaseAdmin,
  quote: GenerationQuote,
  availableCredits: number,
): Promise<GenerationQuote> {
  if (quote.status !== "quoted" && quote.status !== "reserved") {
    throw new Error(`QUOTE_INVALID_STATUS:${quote.status}`);
  }
  if (new Date(quote.expiresAt).getTime() < Date.now()) {
    quote.status = "expired";
    throw new Error("QUOTE_EXPIRED");
  }

  const insufficient = isInsufficientCredits(
    availableCredits,
    quote.customerCredits,
    quote.quoteId,
  );
  if (insufficient) {
    const err = new Error("INSUFFICIENT_CREDITS") as Error & {
      details: InsufficientCreditsError;
    };
    err.details = insufficient;
    throw err;
  }

  if (quote.status === "reserved" && quote.reservationTxId) {
    return quote;
  }

  const { data, error } = await admin.rpc("deduct_credits", {
    _amount: quote.customerCredits,
    _gen_type: `${quote.product}_reservation`,
    _user_id: quote.userId,
  });

  if (error) {
    if (error.message?.includes("INSUFFICIENT_CREDITS")) {
      const err = new Error("INSUFFICIENT_CREDITS") as Error & {
        details: InsufficientCreditsError;
      };
      err.details = {
        code: "INSUFFICIENT_CREDITS",
        requiredCredits: quote.customerCredits,
        availableCredits,
        shortfall: Math.max(0, quote.customerCredits - availableCredits),
        quoteId: quote.quoteId,
      };
      throw err;
    }
    throw new Error(`RESERVE_FAILED:${error.message}`);
  }

  const result = data as { transaction_id?: string; credits?: number } | null;
  quote.status = "reserved";
  quote.reservationTxId = result?.transaction_id;
  quoteStore.set(quote.quoteId, quote);
  return quote;
}

export async function releaseReservation(
  admin: SupabaseAdmin,
  quote: GenerationQuote,
): Promise<GenerationQuote> {
  if (quote.status === "released" || quote.status === "finalized") {
    return quote;
  }
  if (quote.reservationTxId) {
    const { error } = await admin.rpc("refund_credits", {
      _transaction_id: quote.reservationTxId,
      _user_id: quote.userId,
    });
    if (error) {
      console.error("[billing] releaseReservation failed", quote.quoteId, error.message);
    }
  }
  quote.status = "released";
  quoteStore.set(quote.quoteId, quote);
  return quote;
}

export function markGenerating(quote: GenerationQuote): GenerationQuote {
  if (quote.status !== "reserved") {
    throw new Error(`QUOTE_INVALID_STATUS:${quote.status}`);
  }
  quote.status = "generating";
  quoteStore.set(quote.quoteId, quote);
  return quote;
}

export function finalizeQuote(
  quote: GenerationQuote,
  opts?: { finalProviderCogsUsd?: number; finalCredits?: number },
): GenerationQuote {
  if (quote.status !== "generating" && quote.status !== "reserved") {
    throw new Error(`QUOTE_INVALID_STATUS:${quote.status}`);
  }
  quote.status = "finalized";
  quote.finalProviderCogsUsd = opts?.finalProviderCogsUsd ?? quote.providerCogsUsd;
  quote.finalCredits = opts?.finalCredits ?? quote.customerCredits;
  if (quote.finalCredits > quote.customerCredits) {
    console.warn(
      "[billing] finalCredits > reserved; clamping to reserved (no silent debt)",
      quote.quoteId,
    );
    quote.finalCredits = quote.customerCredits;
  }
  quoteStore.set(quote.quoteId, quote);
  return quote;
}

export function markFailed(quote: GenerationQuote): GenerationQuote {
  quote.status = "failed";
  quoteStore.set(quote.quoteId, quote);
  return quote;
}

export function setQuoteStatus(quoteId: string, status: QuoteStatus): void {
  const q = quoteStore.get(quoteId);
  if (q) {
    q.status = status;
    quoteStore.set(quoteId, q);
  }
}

export function _clearQuoteStoreForTests(): void {
  quoteStore.clear();
  idempotencyIndex.clear();
}
