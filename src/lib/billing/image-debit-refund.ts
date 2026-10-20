/**
 * Image-path debit / refund helpers for public.deduct_credits / public.refund_credits.
 *
 * Contract (repo migration 20260630163331_* — Claude must confirm production matches):
 *   deduct_credits(_amount, _gen_type, _user_id) → jsonb { transaction_id: uuid, credits: int }
 *   refund_credits(_transaction_id, _user_id)    → jsonb { refunded: bool, credits?: int }
 *   EXECUTE granted to service_role only.
 *
 * These helpers do not claim durable idempotency or cross-process recovery.
 * They only make success/failure of a single debit or refund explicit and testable.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export type DeductParseOk = {
  ok: true;
  transactionId: string;
  credits?: number;
};

export type DeductParseFail = {
  ok: false;
  reason: string;
  /** True when the RPC may already have debited without a usable refund key. */
  untraceableDebit: boolean;
  raw?: unknown;
};

export type DeductParseResult = DeductParseOk | DeductParseFail;

/**
 * Parse deduct_credits RPC result.
 * A successful debit without a valid transaction_id is treated as failure (untraceable).
 */
export function parseDeductCreditsResponse(
  data: unknown,
  error: { message?: string } | null | undefined,
): DeductParseResult {
  if (error) {
    return {
      ok: false,
      reason: error.message || "Credit debit failed",
      untraceableDebit: false,
    };
  }
  if (data == null || typeof data !== "object") {
    return {
      ok: false,
      reason: "Credit debit returned no payload (missing transaction_id)",
      untraceableDebit: true,
      raw: data,
    };
  }
  const row = data as Record<string, unknown>;
  const tx = row.transaction_id;
  if (!isUuid(tx)) {
    return {
      ok: false,
      reason: "Credit debit missing or invalid transaction_id — cannot refund safely",
      untraceableDebit: true,
      raw: data,
    };
  }
  const credits = typeof row.credits === "number" ? row.credits : undefined;
  return { ok: true, transactionId: tx, credits };
}

export type RefundParseOk = { ok: true; credits?: number };
export type RefundParseFail = { ok: false; reason: string; raw?: unknown };
export type RefundParseResult = RefundParseOk | RefundParseFail;

/**
 * Parse refund_credits RPC result.
 * Requires refunded === true. RPC errors and refunded:false are failures.
 */
export function parseRefundCreditsResponse(
  data: unknown,
  error: { message?: string } | null | undefined,
): RefundParseResult {
  if (error) {
    return {
      ok: false,
      reason: error.message || "Credit refund RPC error",
      raw: data,
    };
  }
  if (data == null || typeof data !== "object") {
    return {
      ok: false,
      reason: "Credit refund returned no payload",
      raw: data,
    };
  }
  const row = data as Record<string, unknown>;
  if (row.refunded === true) {
    const credits = typeof row.credits === "number" ? row.credits : undefined;
    return { ok: true, credits };
  }
  if (row.refunded === false) {
    return {
      ok: false,
      reason: "Credit refund declined (refunded: false) — already refunded or not owned",
      raw: data,
    };
  }
  return {
    ok: false,
    reason: "Credit refund response missing refunded:true",
    raw: data,
  };
}

export type ImageRefundAttempt = {
  transactionId: string;
  userId: string;
  amount?: number;
  genType?: string;
};

/**
 * Structured log payload when refund cannot be confirmed.
 * Does not claim recovery occurred — ops must reconcile.
 */
export function buildUnconfirmedRefundLog(
  attempt: ImageRefundAttempt,
  parse: RefundParseFail,
): Record<string, unknown> {
  return {
    level: "critical",
    event: "image_credit_refund_unconfirmed",
    transaction_id: attempt.transactionId,
    user_id: attempt.userId,
    amount: attempt.amount ?? null,
    gen_type: attempt.genType ?? null,
    reason: parse.reason,
    response_keys:
      parse.raw && typeof parse.raw === "object" && parse.raw !== null
        ? Object.keys(parse.raw as object)
        : [],
  };
}

/**
 * Structured log when debit cannot be refunded later (no transaction_id).
 */
export function buildUntraceableDebitLog(opts: {
  userId: string;
  amount: number;
  genType: string;
  reason: string;
}): Record<string, unknown> {
  return {
    level: "critical",
    event: "image_credit_debit_untraceable",
    user_id: opts.userId,
    amount: opts.amount,
    gen_type: opts.genType,
    reason: opts.reason,
  };
}

/**
 * Lifecycle decision: after a successful generation, reservation must be released
 * (cleared) so catch does not refund. Pure helper for tests.
 */
export function shouldRefundOnExit(opts: {
  generationSucceeded: boolean;
  reservationTxId: string | null;
}): boolean {
  if (opts.generationSucceeded) return false;
  return typeof opts.reservationTxId === "string" && isUuid(opts.reservationTxId);
}

/**
 * Design note (not implemented): durable recovery + request idempotency require
 * a persisted reservation/request row with a unique request key and status
 * transitions (reserved → finalized | refunded) under one DB transaction or
 * equivalent advisory lock. A non-atomic check-then-insert race is not acceptable.
 * Coordinate schema with Claude before shipping that layer.
 */
export const IMAGE_BILLING_DURABLE_RECOVERY_STATUS =
  "proposed_not_implemented" as const;
