import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const planSchema = z.enum(["lite", "plus", "pro", "studio", "business"]);

const MAX_PAYMENT_ATTEMPTS_PER_HOUR = 10;
async function enforcePaymentRateLimit(db: any, userId: string, method: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("payment_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_PAYMENT_ATTEMPTS_PER_HOUR) {
    throw new Error("Too many payment attempts. Please try again in an hour.");
  }
  await db.from("payment_attempts").insert({ user_id: userId, payment_method: method });
}

/** Best-effort plan-purchased email after successful credit apply. Never blocks payment. */
async function notifyPlanPurchased(args: {
  userId: string;
  plan: string | null;
  credits: number;
  amount: number | string;
  currency: string;
  orderId: string;
  db: any;
}) {
  try {
    const { sendPlanPurchasedEmail } = await import("@/lib/email.server");
    const { getPlan } = await import("@/lib/plans");
    const { data: profile } = await args.db
      .from("profiles")
      .select("email, display_name")
      .eq("id", args.userId)
      .maybeSingle();
    const email = profile?.email;
    if (!email) return;
    const planName = args.plan ? getPlan(args.plan as any).name : "Plan";
    const amountLabel =
      args.currency === "INR"
        ? `₹${args.amount}`
        : args.currency === "EUR"
          ? `€${args.amount}`
          : `$${args.amount}`;
    await sendPlanPurchasedEmail({
      to: email,
      name: profile?.display_name?.split(" ")[0] || "there",
      planName,
      amount: amountLabel,
      creditsAdded: args.credits,
      expiry: "Renews monthly",
      orderId: args.orderId,
    });
  } catch (e) {
    console.error("[email] notifyPlanPurchased failed:", e);
  }
}

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: string }) => z.object({ plan: planSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { PLAN_PURCHASE, createRazorpayOrder: createOrder } = await import("@/lib/payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await enforcePaymentRateLimit(supabaseAdmin as any, context.userId, "razorpay");
    const pkg = PLAN_PURCHASE[data.plan as keyof typeof PLAN_PURCHASE];
    if (!pkg) throw new Error("Selected plan is not available for purchase.");
    const internalOrderId = `rzp_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    const order = await createOrder({
      amountPaise: pkg.amountINR * 100,
      receipt: internalOrderId,
      notes: { user_id: context.userId, plan: data.plan, credits: pkg.credits },
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
    const { verifyRazorpaySignature, planFromCredits } = await import("@/lib/payments.server");
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

    const plan = planFromCredits(tx.credits_purchased);
    if (plan) {
      await db.from("profiles").update({ plan, updated_at: new Date().toISOString() }).eq("id", context.userId);
    }

    await notifyPlanPurchased({
      userId: context.userId,
      plan,
      credits: tx.credits_purchased,
      amount: tx.amount,
      currency: "INR",
      orderId: tx.transaction_id,
      db,
    });

    return { success: true, credits: tx.credits_purchased, transactionId: tx.transaction_id };
  });

export const createCryptoInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: string; payCurrency: string }) =>
    z
      .object({
        plan: planSchema,
        payCurrency: z.enum(["usdttrc20", "btc", "eth"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { PLAN_PURCHASE, createNowPaymentsPayment } = await import("@/lib/payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await enforcePaymentRateLimit(supabaseAdmin as any, context.userId, "nowpayments");
    const pkg = PLAN_PURCHASE[data.plan as keyof typeof PLAN_PURCHASE];
    if (!pkg) throw new Error("Selected plan is not available for purchase.");
    const internalOrderId = `M2E-CRYPTO-${crypto.randomUUID()}`;
    const backend = (process.env.BACKEND_URL || process.env.FRONTEND_URL || "https://motio2edit.com").replace(/\/+$/, "");

    const payment = await createNowPaymentsPayment({
      price_amount: pkg.amountUSD,
      price_currency: "usd",
      pay_currency: data.payCurrency,
      order_id: internalOrderId,
      order_description: `Motio2Edit ${pkg.credits} Credits`,
      ipn_callback_url: `${backend}/api/public/webhooks/nowpayments`,
    });

    const { error } = await (supabaseAdmin as any).from("payment_transactions").insert({
      user_id: context.userId,
      payment_method: "nowpayments",
      amount: pkg.amountUSD,
      currency: "USD",
      credits_purchased: pkg.credits,
      transaction_id: internalOrderId,
      gateway_order_id: payment.payment_id?.toString(),
      payment_status: "pending",
      gateway_response: payment,
    });
    if (error) throw new Error(error.message);

    return {
      paymentId: payment.payment_id?.toString(),
      payAddress: payment.pay_address,
      payAmount: payment.pay_amount,
      payCurrency: payment.pay_currency,
      priceAmount: pkg.amountUSD,
      credits: pkg.credits,
      internalOrderId,
    };
  });

export const getCryptoStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { invoiceId: string }) => z.object({ invoiceId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { getNowPaymentsPayment, NP_STATUS_MAP, planFromCredits } = await import("@/lib/payments.server");
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
        const plan = planFromCredits(tx.credits_purchased);
        if (plan) {
          await db.from("profiles").update({ plan, updated_at: new Date().toISOString() }).eq("id", context.userId);
        }
        await notifyPlanPurchased({
          userId: context.userId,
          plan,
          credits: tx.credits_purchased,
          amount: tx.amount,
          currency: tx.currency || "USD",
          orderId: tx.transaction_id,
          db,
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

export const getPaypalClientId = createServerFn({ method: "GET" }).handler(async () => {
  return { clientId: process.env.PAYPAL_CLIENT_ID || "" };
});

export const createPaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: string }) => z.object({ plan: planSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { PLAN_PURCHASE, createPaypalOrder: createOrder } = await import("@/lib/payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await enforcePaymentRateLimit(supabaseAdmin as any, context.userId, "paypal");
    const pkg = PLAN_PURCHASE[data.plan as keyof typeof PLAN_PURCHASE];
    if (!pkg) throw new Error("Selected plan is not available for purchase.");
    const internalOrderId = `M2E-PP-${crypto.randomUUID()}`;

    const order = await createOrder({
      amountUSD: pkg.amountUSD,
      referenceId: internalOrderId,
      description: `Motio2Edit ${pkg.credits} Credits`,
    });

    const { error } = await (supabaseAdmin as any).from("payment_transactions").insert({
      user_id: context.userId,
      payment_method: "paypal",
      amount: pkg.amountUSD,
      currency: "USD",
      credits_purchased: pkg.credits,
      transaction_id: internalOrderId,
      gateway_order_id: order.id,
      payment_status: "pending",
    });
    if (error) throw new Error(error.message);

    return { orderId: order.id, internalOrderId, credits: pkg.credits };
  });

export const capturePaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; internalOrderId: string }) =>
    z
      .object({
        orderId: z.string().min(1),
        internalOrderId: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { capturePaypalOrder: capture, planFromCredits } = await import("@/lib/payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPaymentErrorReport } = await import("@/lib/email.server");
    const db = supabaseAdmin as any;

    const { data: tx } = await db
      .from("payment_transactions")
      .select("*")
      .eq("transaction_id", data.internalOrderId)
      .eq("user_id", context.userId)
      .eq("payment_method", "paypal")
      .maybeSingle();
    if (!tx) throw new Error("Transaction not found");
    if (tx.payment_status === "completed") {
      return { success: true, alreadyProcessed: true, credits: tx.credits_purchased };
    }

    const result = await capture(data.orderId);
    if (result?.status !== "COMPLETED") {
      throw new Error("PayPal payment was not completed. Please try again.");
    }

    await db
      .from("payment_transactions")
      .update({ payment_status: "processing", gateway_response: result })
      .eq("transaction_id", data.internalOrderId);

    const { error: applyErr } = await db.rpc("apply_payment_credits", {
      _user_id: context.userId,
      _transaction_id: tx.transaction_id,
      _credits: tx.credits_purchased,
      _reason: "paypal_payment",
    });
    if (applyErr) {
      await sendPaymentErrorReport({
        userId: context.userId,
        transactionId: data.orderId,
        paymentMethod: "PayPal",
        error: applyErr.message,
        amount: tx.amount,
        currency: "USD",
      });
      throw new Error("Payment received but credit allocation failed. Support has been notified.");
    }

    const plan = planFromCredits(tx.credits_purchased);
    if (plan) {
      await db.from("profiles").update({ plan, updated_at: new Date().toISOString() }).eq("id", context.userId);
    }

    await notifyPlanPurchased({
      userId: context.userId,
      plan,
      credits: tx.credits_purchased,
      amount: tx.amount,
      currency: "USD",
      orderId: tx.transaction_id,
      db,
    });

    return { success: true, credits: tx.credits_purchased, transactionId: tx.transaction_id };
  });
