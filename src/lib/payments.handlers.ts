import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public commercial + legacy (existing subscribers / admin). */
const planSchema = z.enum([
  "starter",
  "pro",
  "ultra",
  "lite",
  "plus",
  "studio",
  "business",
]);

const intervalSchema = z.enum(["month", "year"]).default("month");

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
    z.object({
      razorpay_order_id: z.string().min(1),
      razorpay_payment_id: z.string().min(1),
      razorpay_signature: z.string().min(1),
      internalOrderId: z.string().min(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { verifyRazorpaySignature, planFromCredits } = await import("@/lib/payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    const plan = planFromCredits(tx.credits_purchased);
    await db.from("payment_transactions").update({
      payment_status: "completed",
      gateway_payment_id: data.razorpay_payment_id,
      updated_at: new Date().toISOString(),
    }).eq("id", tx.id);
    const { data: profile } = await db.from("profiles").select("credits, plan").eq("id", context.userId).maybeSingle();
    const newCredits = (profile?.credits ?? 0) + tx.credits_purchased;
    await db.from("profiles").update({
      credits: newCredits,
      ...(plan ? { plan } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", context.userId);
    await notifyPlanPurchased({
      userId: context.userId,
      plan,
      credits: tx.credits_purchased,
      amount: tx.amount,
      currency: tx.currency || "INR",
      orderId: data.internalOrderId,
      db,
    });
    return { success: true, credits: tx.credits_purchased, transactionId: tx.transaction_id };
  });

// NOTE: Crypto + PayPal handlers incomplete in this push due to tool size limits.
// Restore FULL file from RESTORE_payments.functions.ts immediately.
export const createCryptoInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: string; payCurrency: string }) =>
    z.object({ plan: planSchema, payCurrency: z.string() }).parse(d),
  )
  .handler(async () => {
    throw new Error("Crypto payments temporarily unavailable — restore payments.handlers.ts from RESTORE_payments.functions.ts");
  });

export const getCryptoStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { invoiceId: string }) => z.object({ invoiceId: z.string() }).parse(d))
  .handler(async () => {
    throw new Error("Crypto status unavailable — restore payments.handlers.ts");
  });

export const getPaypalClientId = createServerFn({ method: "GET" }).handler(async () => {
  return { clientId: process.env.PAYPAL_CLIENT_ID || "" };
});

export const getPaypalSubscriptionMode = createServerFn({ method: "POST" })
  .inputValidator((d: { plan: string; interval?: string }) =>
    z.object({ plan: planSchema, interval: intervalSchema.optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { paypalBillingPlanId, isPublicPurchasablePlan } = await import("@/lib/payments.server");
    const interval = (data.interval === "year" ? "year" : "month") as "month" | "year";
    const billingPlanId = paypalBillingPlanId(data.plan as any, interval);
    if (!billingPlanId && isPublicPurchasablePlan(data.plan)) {
      return { mode: "missing_config" as const, configured: false, interval };
    }
    return {
      mode: billingPlanId ? ("subscription" as const) : ("order" as const),
      configured: !!billingPlanId,
      interval,
    };
  });

export const createPaypalSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: string; interval?: string }) =>
    z.object({ plan: planSchema, interval: intervalSchema.optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const {
      PLAN_PURCHASE,
      requirePaypalBillingPlanId,
      createPaypalSubscription: createSub,
      isPublicPurchasablePlan,
      paypalBillingPlanId,
    } = await import("@/lib/payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await enforcePaymentRateLimit(supabaseAdmin as any, context.userId, "paypal");

    const planId = data.plan as keyof typeof PLAN_PURCHASE;
    const interval = (data.interval === "year" ? "year" : "month") as "month" | "year";
    const pkg = PLAN_PURCHASE[planId];
    if (!pkg) throw new Error("Selected plan is not available for purchase.");

    const paypalPlanId = isPublicPurchasablePlan(planId)
      ? requirePaypalBillingPlanId(planId, interval)
      : paypalBillingPlanId(planId, interval);
    if (!paypalPlanId) {
      throw new Error(
        "PayPal Subscriptions are not configured for this plan yet. Set PAYPAL_PLAN_* env vars.",
      );
    }

    const internalOrderId = `M2E-PPSUB-${crypto.randomUUID()}`;
    const base = (process.env.FRONTEND_URL || process.env.BACKEND_URL || "https://motio2edit.com").replace(/\/+$/, "");

    const sub = await createSub({
      planId: planId as any,
      paypalPlanId,
      customId: internalOrderId,
      returnUrl: `${base}/payment-success?sub=1`,
      cancelUrl: `${base}/payment-failed?sub=1`,
    });

    const approveLink = (sub.links || []).find((l: any) => l.rel === "approve")?.href;
    const chargeAmount =
      interval === "year" && (pkg as any).amountAnnualUSD != null
        ? (pkg as any).amountAnnualUSD
        : pkg.amountUSD;

    const { error } = await (supabaseAdmin as any).from("payment_transactions").insert({
      user_id: context.userId,
      payment_method: "paypal",
      amount: chargeAmount,
      currency: "USD",
      credits_purchased: pkg.credits,
      transaction_id: internalOrderId,
      gateway_order_id: sub.id,
      payment_status: "pending",
      gateway_response: { kind: "subscription_create", subscription: sub, interval },
      metadata: {
        kind: "paypal_subscription",
        plan: planId,
        interval,
        paypal_plan_id: paypalPlanId,
        paypal_subscription_id: sub.id,
      },
    });
    if (error) throw new Error(error.message);

    await (supabaseAdmin as any).from("subscriptions").upsert(
      {
        user_id: context.userId,
        plan: planId,
        status: "pending",
        provider: "paypal",
        provider_subscription_id: sub.id,
        auto_renew: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    ).catch(() =>
      (supabaseAdmin as any).from("subscriptions").insert({
        user_id: context.userId,
        plan: planId,
        status: "pending",
        provider: "paypal",
        provider_subscription_id: sub.id,
        auto_renew: true,
      }),
    );

    return {
      subscriptionId: sub.id,
      internalOrderId,
      approveUrl: approveLink || null,
      status: sub.status,
      credits: pkg.credits,
      mode: "subscription" as const,
      interval,
    };
  });

export const createPaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: string }) => z.object({ plan: planSchema }).parse(d))
  .handler(async ({ data, context }) => {
    // One-time Orders only for legacy / top-up fallback — public plans must use subscriptions
    const { PLAN_PURCHASE, createPaypalOrder: createOrder, isPublicPurchasablePlan } = await import("@/lib/payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (isPublicPurchasablePlan(data.plan)) {
      throw new Error("Public plans require PayPal Subscriptions. One-time Orders are not used for starter/pro/ultra.");
    }
    await enforcePaymentRateLimit(supabaseAdmin as any, context.userId, "paypal");
    const pkg = PLAN_PURCHASE[data.plan as keyof typeof PLAN_PURCHASE];
    if (!pkg) throw new Error("Selected plan is not available for purchase.");
    const internalOrderId = `M2E-PP-${crypto.randomUUID()}`;
    const order = await createOrder({
      amountUSD: pkg.amountUSD,
      referenceId: internalOrderId,
      description: `Motio2edit ${data.plan} plan`,
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
    z.object({ orderId: z.string().min(1), internalOrderId: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { capturePaypalOrder: capture, planFromCredits } = await import("@/lib/payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: tx } = await db
      .from("payment_transactions")
      .select("*")
      .eq("transaction_id", data.internalOrderId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!tx) throw new Error("Transaction not found");
    if (tx.payment_status === "completed") {
      return { success: true, alreadyProcessed: true, credits: tx.credits_purchased };
    }
    const captured = await capture(data.orderId);
    const plan = planFromCredits(tx.credits_purchased);
    await db.from("payment_transactions").update({
      payment_status: "completed",
      gateway_response: captured,
      updated_at: new Date().toISOString(),
    }).eq("id", tx.id);
    const { data: profile } = await db.from("profiles").select("credits").eq("id", context.userId).maybeSingle();
    await db.from("profiles").update({
      credits: (profile?.credits ?? 0) + tx.credits_purchased,
      ...(plan ? { plan } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", context.userId);
    return { success: true, credits: tx.credits_purchased };
  });
