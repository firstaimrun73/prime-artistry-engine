/**
 * Shared server-side payment verification helpers (no network side effects except optional fetches).
 * Used by payments.handlers and unit tests.
 */

export function amountsMatch(
  expected: number,
  actual: number,
  currency: string,
): boolean {
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) return false;
  if (expected <= 0 && currency !== "USD" && currency !== "INR") return false;
  // Major units: allow 1 cent / 1 paise tolerance only for float noise
  const tol = currency === "INR" || currency === "USD" ? 0.009 : 0.01;
  return Math.abs(expected - actual) <= tol;
}

export function paypalCaptureChecks(args: {
  tx: {
    gateway_order_id?: string | null;
    amount: number;
    currency?: string | null;
    payment_status?: string | null;
    user_id?: string;
    transaction_id?: string;
  };
  orderId: string;
  userId: string;
  captured: any;
}): { ok: true } | { ok: false; reason: string } {
  const { tx, orderId, userId, captured } = args;
  if (!tx) return { ok: false, reason: "transaction_missing" };
  if (tx.user_id && tx.user_id !== userId) return { ok: false, reason: "user_mismatch" };
  if (tx.payment_status === "completed") return { ok: false, reason: "already_completed" };
  if (!tx.gateway_order_id || tx.gateway_order_id !== orderId) {
    return { ok: false, reason: "order_id_mismatch" };
  }
  const status = String(captured?.status || "").toUpperCase();
  if (status !== "COMPLETED") return { ok: false, reason: `status_${status || "unknown"}` };

  const pu = captured?.purchase_units?.[0];
  const cap = pu?.payments?.captures?.[0];
  const paidRaw = cap?.amount?.value ?? pu?.amount?.value;
  if (paidRaw === undefined || paidRaw === null || paidRaw === "") {
    return { ok: false, reason: "amount_missing" };
  }
  const paid = Number(paidRaw);
  if (!Number.isFinite(paid) || paid <= 0) return { ok: false, reason: "amount_invalid" };

  const currency = String(cap?.amount?.currency_code || pu?.amount?.currency_code || "toUpperCase();
  const expectedCurrency = String(tx.currency || "USD").toUpperCase();
  if (currency && currency !== expectedCurrency) return { ok: false, reason: "currency_mismatch" };

  if (!amountsMatch(Number(tx.amount), paid, expectedCurrency)) {
    return { ok: false, reason: "amount_mismatch" };
  }

  const customId = pu?.custom_id || pu?.reference_id;
  if (tx.transaction_id && customId && customId !== tx.transaction_id) {
    return { ok: false, reason: "reference_mismatch" };
  }

  return { ok: true };
}

export function razorpayVerifyChecks(args: {
  tx: {
    gateway_order_id?: string | null;
    amount: number;
    currency?: string | null;
    payment_status?: string | null;
    user_id?: string;
  };
  userId: string;
  razorpayOrderId: string;
  /** Amount in major units (INR rupees) from gateway if available */
  paidMajor?: number | null;
  /** Payment status from Razorpay API if fetched */
  paymentStatus?: string | null;
}): { ok: true } | { ok: false; reason: string } {
  const { tx, userId, razorpayOrderId, paidMajor, paymentStatus } = args;
  if (!tx) return { ok: false, reason: "transaction_missing" };
  if (tx.user_id && tx.user_id !== userId) return { ok: false, reason: "user_mismatch" };
  if (tx.payment_status === "completed") return { ok: false, reason: "already_completed" };
  if (!tx.gateway_order_id || tx.gateway_order_id !== razorpayOrderId) {
    return { ok: false, reason: "order_id_mismatch" };
  }
  if (paymentStatus) {
    const st = paymentStatus.toLowerCase();
    if (st !== "captured" && st !== "authorized") {
      // Require captured for plan activation
      if (st !== "captured") return { ok: false, reason: `status_${st}` };
    }
    if (st !== "captured") return { ok: false, reason: "not_captured" };
  }
  if (paidMajor !== undefined && paidMajor !== null) {
    if (!amountsMatch(Number(tx.amount), Number(paidMajor), "INR")) {
      return { ok: false, reason: "amount_mismatch" };
    }
  }
  const cur = String(tx.currency || "INR").toUpperCase();
  if (cur !== "INR") return { ok: false, reason: "currency_mismatch" };
  return { ok: true };
}

/** Inspect Supabase rpc result shape */
export function rpcSucceeded(
  result: { data?: any; error?: { message?: string } | null } | null | undefined,
): { ok: true; data: any } | { ok: false; reason: string } {
  if (!result) return { ok: false, reason: "rpc_empty" };
  if (result.error) return { ok: false, reason: result.error.message || "rpc_error" };
  return { ok: true, data: result.data };
}
