/**
 * Quote service — in-memory generation quotes with credit reservation.
 * Reservations use deduct_credits via service_role admin client.
 * releaseReservation refunds only when a reservationTxId exists and
 * does not mark released if the refund RPC errors.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  BillingConfig,
  GenerationQuote,
  InsufficientCreditsError,
  QuoteRequest,
  QuoteStatus,
} from "./types";
import { DEFAULT_BILLING_CONFIG } from "./types";

type SupabaseAdmin = SupabaseClient<Database>;

const quoteStore = new Map<string, GenerationQuote>();
const idempotencyIndex = new Map<string, string>();

function newQuoteId(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createGenerationQuote(
  req: QuoteRequest,
  config: BillingConfig = DEFAULT_BILLING_CONFIG,
): GenerationQuote {
  if (req.idempotencyKey) {
    const existingId = idempotencyIndex.get(`${req.userId}:${req.idempotencyKey}`);
    if (existingId) {
      const existing = quoteStore.get(existingId);
      if (existing && existing.status !== "expired" && existing.status !== "failed") {
        return existing;
      }
    }
  }

  const customerCredits =
    req.customerCreditsOverride ??
    Math.max(1, Math.ceil(req.providerCogsUsd * (config.markupMultiplier ?? 1)));

  const now = Date.now();
  const quote: GenerationQuote = {
    quoteId: newQuoteId(),
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
    providerCogsUsd: req.providerCogsUsd,
    customerCredits,
    status: "quoted",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + (config.quoteTtlMs ?? 120_000)).toISOString(),
    idempotencyKey: req.idempotencyKey,
    metadata: req.metadata,
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
  availableCredits: number,
  requiredCredits: number,
  quoteId?: string,
): InsufficientCreditsError | null {
  if (availableCredits >= requiredCredits) return null;
  return {
    code: "INSUFFICIENT_CREDITS",
    requiredCredits,
    availableCredits,
    shortfall: Math.max(0, requiredCredits - availableCredits),
    quoteId,
  };
}

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
  // Idempotent: already terminal → no second refund.
  if (quote.status === "released" || quote.status === "finalized") {
    return quote;
  }
  if (quote.reservationTxId) {
    const { data, error } = await admin.rpc("refund_credits", {
      _transaction_id: quote.reservationTxId,
      _user_id: quote.userId,
    });
    if (error) {
      console.error("[billing] releaseReservation RPC error — not marking released", {
        quoteId: quote.quoteId,
        tx: quote.reservationTxId,
        message: error.message,
      });
      // Do not mark released: caller may retry or escalate reconciliation.
      throw new Error(`RELEASE_REFUND_FAILED:${error.message}`);
    }
    const refunded =
      data && typeof data === "object" && (data as { refunded?: unknown }).refunded === true;
    if (!refunded) {
      // { refunded: false } = already refunded or no matching debit (idempotent OK).
      console.warn("[billing] releaseReservation refund not newly applied", {
        quoteId: quote.quoteId,
        tx: quote.reservationTxId,
        reason: "already_refunded_or_missing",
        data,
      });
    }
  }
  quote.status = "released";
  quoteStore.set(quote.quoteId, quote);
  return quote;
}

export function markGenerating(quote: GenerationQuote): GenerationQuote {
  if (quote.status === "generating") {
    return quote;
  }
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
  // Idempotent: already finalized → return as-is (no second charge).
  if (quote.status === "finalized") {
    return quote;
  }
  if (quote.status !== "generating" && quote.status !== "reserved" && quote.status !== "succeeded") {
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

/**
 * Mark expired quoted/reserved quotes. Does not auto-refund without admin —
 * caller must releaseReservation when a reservationTxId is present.
 */
export function expireStaleQuotes(nowMs: number = Date.now()): GenerationQuote[] {
  const expired: GenerationQuote[] = [];
  for (const q of quoteStore.values()) {
    if (q.status === "quoted" || q.status === "reserved") {
      if (new Date(q.expiresAt).getTime() < nowMs) {
        q.status = "expired";
        quoteStore.set(q.quoteId, q);
        expired.push(q);
      }
    }
  }
  return expired;
}
