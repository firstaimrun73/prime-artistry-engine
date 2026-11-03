/**
 * Shared server-side payment verification helpers (fail-closed).
 */

export function amountsMatch(
  expected: number,
  actual: number,
  currency: string,
): boolean {
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) return false;
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
  if (!pu) return { ok: false, reason: "purchase_unit_missing" };

  const cap = pu?.payments?.captures?.[0];
  if (!cap) return { ok: false, reason: "capture_missing" };

  const paidRaw = cap?.amount?.value;
  if (paidRaw === undefined || paidRaw === null || paidRaw === "") {
    return { ok: false, reason: "amount_missing" };
  }
  const paid = Number(paidRaw);
  if (!Number.isFinite(paid) || paid <= 0) return { ok: false, reason: "amount_invalid" };

  const currency = String(cap?.amount?.currency_code || "").trim().toUpperCase();
  if (!currency) return { ok: false, reason: "currency_missing" };

  const expectedCurrency = String(tx.currency || "").trim().toUpperCase();
  if (!expectedCurrency) return { ok: false, reason: "tx_currency_missing" };
  if (currency !== expectedCurrency) return { ok: false, reason: "currency_mismatch" };

  if (!amountsMatch(Number(tx.amount), paid, expectedCurrency)) {
    return { ok: false, reason: "amount_mismatch" };
  }

  // Require purchase-unit association with internal transaction id
  if (tx.transaction_id) {
    const customId = pu?.custom_id || pu?.reference_id;
    if (!customId || customId !== tx.transaction_id) {
      return { ok: false, reason: "reference_mismatch" };
    }
  }

  return { ok: true };
}

/**
 * Fail-closed Razorpay checks.
 * paidMajor and paymentStatus are REQUIRED (API must succeed been fetched successfully).
 */
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
  razorpayPaymentId: string;
  /** Major units (INR). Must be provided from API. */
  paidMajor: number | null | undefined;
  paymentStatus: string | null | undefined;
  /** order_id from Razorpay payment object */
  apiOrderId?: string | null;
  apiPaymentId?: string | null;
  apiFetchOk: boolean;
}): { ok: true } | { ok: false; reason: string } {
  const {
    tx,
    userId,
    razorpayOrderId,
    razorpayPaymentId,
    paidMajor,
    paymentStatus,
    apiOrderId,
    apiPaymentId,
    apiFetchOk,
  } = args;

  if (!tx) return { ok: false, reason: "transaction_missing" };
  if (tx.user_id && tx.user_id !== userId) return { ok: false, reason: "user_mismatch" };
  if (tx.payment_status === "completed") return { ok: false, reason: "already_completed" };

  if (!apiFetchOk) return { ok: false, reason: "api_fetch_failed" };

  if (!tx.gateway_order_id || tx.gateway_order_id !== razorpayOrderId) {
    return { ok: false, reason: "order_id_mismatch" };
  }

  if (apiOrderId && apiOrderId !== tx.gateway_order_id) {
    return { ok: false, reason: "api_order_mismatch" };
  }

  if (!razorpayPaymentId) return { ok: false, reason: "payment_id_missing" };
  if (apiPaymentId && apiPaymentId !== razorpayPaymentId) {
    return { ok: false, reason: "payment_id_mismatch" };
  }

  if (paymentStatus === undefined || paymentStatus === null || paymentStatus === "") {
    return { ok: false, reason: "status_missing" };
  }
  if (String(paymentStatus).toLowerCase() !== "captured") {
    return { ok: false, reason: "not_captured" };
  }

  if (paidMajor === undefined || paidMajor === null) {
    return { ok: false, reason: "amount_missing" };
  }
  if (!Number.isFinite(Number(paidMajor)) || Number(paidMajor) <= 0) {
    return { ok: false, reason: "amount_invalid" };
  }
  if (!amountsMatch(Number(tx.amount), Number(paidMajor), "INR")) {
    return { ok: false, reason: "amount_mismatch" };
  }

  const cur = String(tx.currency || "").toUpperCase();
  if (cur !== "INR") return { ok: false, reason: "currency_mismatch" };

  return { ok: true };
}

export function rpcSucceeded(
  result: { data?: any; error?: { message?: string } | null } | null | undefined,
): { ok: true; data: any } | { ok: false; reason: string } {
  if (!result) return { ok: false, reason: "rpc_empty" };
  if (result.error) return { ok: false, reason: result.error.message || "rpc_error" };
  return { ok: true, data: result.data };
}

/** Require DB update to affect at least one row */
export function updateSucceeded(result: {
  error?: { message?: string } | null;
  data?: any[] | null;
  count?: number | null;
}): { ok: true } | { ok: false; reason: string } {
  if (result.error) return { ok: false, reason: result.error.message || "update_error" };
  if (Array.isArray(result.data) && result.data.length === 0) {
    return { ok: false, reason: "update_no_rows" };
  }
  if (typeof result.count === "number" && result.count === 0) {
    return { ok: false, reason: "update_no_rows" };
  }
  return { ok: true };
}
