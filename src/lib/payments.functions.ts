import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// SECURITY: FIX 5 — max 3 payment attempts per user per hour. Logs the attempt
// and throws if the user is over the limit. Uses the service-role client.
async function enforcePaymentRateLimit(db: any, userId: string, method: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("payment_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= 3) {
    throw new Error("Too many payment attempts. Please try again in an hour.");
  }
  await db.from("payment_attempts").insert({ user_id: userId, payment_method: method });
}

// Public credit-package catalogue (safe to expose).
export const getCreditPackages = createServerFn({ method: "GET" }).handler(async () => {
  const { RAZORPAY_PACKAGES, CRYPTO_PACKAGES, ACCEPTED_COINS } = await import("@/lib/payments.server");
  return {
    razorpay: Object.entries(RAZORPAY_PACKAGES).map(([id, p]) => ({ id, ...p })),
    crypto: Object.entries(CRYPTO_PACKAGES).map(([id, p]) => ({ id, ...p })),
    acceptedCoins: ACCEPTED_COINS,
  };
});

// ── Razorpay: create order ──
export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { packageId: string }) =>
    z.object({ packageId: z.enum(["starter", "basic", "pro", "enterprise"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { RAZORPAY_PACKAGES, createRazorpayOrder: createOrder } = await import("@/lib/payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pkg = RAZORPAY_PACKAGES[data.packageId as keyof typeof RAZORPAY_PACKAGES];
    const internalOrderId = `M2E-RZP-${crypto.randomUUID()}`;

    const order = await createOrder({
      amountPaise: pkg.amountINR * 100,
      receipt: internalOrderId,
      notes: { user_id: context.userId, package_id: data.packageId, credits: pkg.credits },
    });

    const { error } = await (supabaseAdmin as any).from("payment_transactions").insert({
      user_id: context.userId,
      payment_method: "razorpay",
      amount: pkg.amountINR,
      currency: "INR",
      credits_purchased: pkg.credits,
      transaction_id: internalOrderId,
      gateway_order_id: order.id,
      payment_status: "pending",
    });
    if (error) throw new Error(error.message);

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      internalOrderId,
      credits: pkg.credits,
    };
  });

// ── Razorpay: verify payment from the browser checkout callback ──
export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    internalOrderId: string;
  }) =>
    z
      .object({
        razorpay_order_id: z.string().min(1),
        razorpay_payment_id: z.string().min(1),
        razorpay_signature: z.string().min(1),
        internalOrderId: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { verifyRazorpaySignature } = await import("@/lib/payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPaymentErrorReport } = await import("@/lib/email.server");

    if (!verifyRazorpaySignature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature)) {
      throw new Error("Payment signature verification failed");
    }

    const db = supabaseAdmin as any;
    const { data: tx } = await db
      .from("payment_transactions")
      .select("*")
      .eq("transaction_id", data.internalOrderId)
      .eq("user_id", context.userId)
      .eq("payment_method", "razorpay")
      .maybeSingle();
    if (!tx) throw new Error("Transaction not found");
    if (tx.payment_status === "completed") {
      return { success: true, alreadyProcessed: true, credits: tx.credits_purchased };
    }

    await db
      .from("payment_transactions")
      .update({
        payment_status: "processing",
        gateway_response: {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
        },
      })
      .eq("transaction_id", data.internalOrderId);

    const { error: applyErr } = await db.rpc("apply_payment_credits", {
      _user_id: context.userId,
      _transaction_id: tx.transaction_id,
      _credits: tx.credits_purchased,
      _reason: "razorpay_payment",
    });
    if (applyErr) {
      await sendPaymentErrorReport({
        userId: context.userId,
        transactionId: data.razorpay_payment_id,
        paymentMethod: "Razorpay",
        error: applyErr.message,
        amount: tx.amount,
        currency: "INR",
      });
      throw new Error("Payment received but credit allocation failed. Support has been notified.");
    }

    return { success: true, credits: tx.credits_purchased, transactionId: tx.transaction_id };
  });

// ── NOWPayments: create crypto invoice ──
export const createCryptoInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { packageId: string; payCurrency: string }) =>
    z
      .object({
        packageId: z.enum(["starter", "basic", "pro", "enterprise"]),
        payCurrency: z.enum(["usdtbsc", "btc", "eth"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { CRYPTO_PACKAGES, createNowPaymentsInvoice } = await import("@/lib/payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pkg = CRYPTO_PACKAGES[data.packageId as keyof typeof CRYPTO_PACKAGES];
    const internalOrderId = `M2E-CRYPTO-${crypto.randomUUID()}`;
    const frontend = process.env.FRONTEND_URL || "";
    const backend = process.env.BACKEND_URL || "";

    const invoice = await createNowPaymentsInvoice({
      price_amount: pkg.amountUSD,
      price_currency: "usd",
      pay_currency: data.payCurrency,
      order_id: internalOrderId,
      order_description: `Motio2Edit ${pkg.credits} Credits`,
      ipn_callback_url: `${backend}/api/public/webhooks/nowpayments`,
      success_url: `${frontend}/success`,
      cancel_url: `${frontend}/pricing`,
    });

    const { error } = await (supabaseAdmin as any).from("payment_transactions").insert({
      user_id: context.userId,
      payment_method: "nowpayments",
      amount: pkg.amountUSD,
      currency: "USD",
      credits_purchased: pkg.credits,
      transaction_id: internalOrderId,
      gateway_order_id: invoice.id?.toString(),
      payment_status: "pending",
      gateway_response: invoice,
    });
    if (error) throw new Error(error.message);

    return {
      invoiceId: invoice.id,
      invoiceUrl: invoice.invoice_url,
      priceAmount: pkg.amountUSD,
      credits: pkg.credits,
      internalOrderId,
    };
  });

// ── NOWPayments: poll status (fallback to the webhook) ──
export const getCryptoStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { invoiceId: string }) => z.object({ invoiceId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { getNowPaymentsPayment, NP_STATUS_MAP } = await import("@/lib/payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const payment = await getNowPaymentsPayment(data.invoiceId);
    await db
      .from("payment_transactions")
      .update({ payment_status: NP_STATUS_MAP[payment.payment_status] || "pending", gateway_response: payment })
      .eq("gateway_order_id", data.invoiceId.toString());

    if (payment.payment_status === "finished") {
      const { data: tx } = await db
        .from("payment_transactions")
        .select("*")
        .eq("gateway_order_id", data.invoiceId.toString())
        .eq("user_id", context.userId)
        .maybeSingle();
      if (tx && tx.payment_status !== "completed") {
        await db.rpc("apply_payment_credits", {
          _user_id: context.userId,
          _transaction_id: tx.transaction_id,
          _credits: tx.credits_purchased,
          _reason: "nowpayments_polling",
        });
      }
    }

    return {
      invoiceId: data.invoiceId,
      status: payment.payment_status,
      outcome:
        payment.payment_status === "finished"
          ? "success"
          : ["failed", "expired"].includes(payment.payment_status)
            ? "failed"
            : "pending",
    };
  });
