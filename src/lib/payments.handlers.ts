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

function amountForPlan(
  pkg: { amountUSD: number; amountINR: number; amountAnnualUSD?: number },
  interval: "month" | "year",
  currency: "USD" | "INR",
): number {
  if (interval === "year") {
    if (currency === "USD") return pkg.amountAnnualUSD ?? pkg.amountUSD * 10;
    // INR annual: 10x monthly face (matches pricing display convention)
    return Math.round(pkg.amountINR * 10);
  }
  return currency === "INR" ? pkg.amountINR : pkg.amountUSD;
}

async function notifyPlanPurchased(args: {
  userId: string;
  plan: string | null;
  credits: number;
  amount: number | string;
  currency: string;
  orderId: string;
  expiryLabel: string;
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
      expiry: args.expiryLabel,
      orderId: args.orderId,
    });
  } catch (e) {
    console.error("[email] notifyPlanPurchased failed:", e);
  }
}

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: string; interval?: string }) =>
    z.object({ plan: planSchema, interval: intervalSchema.optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { PLAN_PURCHASE, createRazorpayOrder: createOrder, isPublicPurchasablePlan } = await import(
      "@/lib/payments.server"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await enforcePaymentRateLimit(supabaseAdmin as any, context.userId, "razorpay");
    const pkg = PLAN_PURCHASE[data.plan as keyof typeof PLAN_PURCHASE];
    if (!pkg) throw new Error("Selected plan is not available for purchase.");
    const interval = data.interval === "year" ? "year" : "month";
    // Annual only for public plans
    if (interval === "year" && !isPublicPurchasablePlan(data.plan)) {
      throw new Error("Annual billing is only available for Starter, Pro, and Ultra.");
    }
    const amountINR = amountForPlan(pkg, interval, "INR");
    const internalOrderId = `rzp_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const order = await createOrder({
      amountPaise: amountINR * 100,
      receipt: internalOrderId,
      notes: {
        user_id: context.userId,
        plan: data.plan,
        credits: pkg.credits,
        interval,
        billing_model: "one_time",
      },
    });
    const { error } = await (supabaseAdmin as any).from("payment_transactions").insert({
      user_id: context.userId,
      payment_method: "razorpay",
      amount: amountINR,
      currency: "INR",
      credits_purchased: pkg.credits,
      transaction_id: internalOrderId,
      gateway_order_id: order.id,
      payment_status: "pending",
      metadata: {
        plan: data.plan,
        interval,
        billing_model: "one_time",
        kind: "plan_purchase",
      },
    });
    if (error) throw new Error(error.message);
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      internalOrderId,
      credits: pkg.credits,
      interval,
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
    const { verifyRazorpaySignature, planFromCredits, isPublicPurchasablePlan } = await import(
      "@/lib/payments.server"
    );
    const { activateOneTimePlan } = await import("@/lib/plan-lifecycle.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (
      !verifyRazorpaySignature(
        data.razorpay_order_id,
        data.razorpay_payment_id,
        data.razorpay_signature,
      )
    ) {
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
      return { success: true, credits: tx.credits_purchased, alreadyCompleted: true };
    }
    await db.rpc("apply_payment_credits", {
      _user_id: context.userId,
      _transaction_id: tx.transaction_id,
      _credits: tx.credits_purchased,
      _reason: "razorpay_capture",
    });
    await db
      .from("payment_transactions")
      .update({
        payment_status: "completed",
        gateway_payment_id: data.razorpay_payment_id,
        gateway_response: data,
      })
      .eq("transaction_id", data.internalOrderId);

    const meta = (tx.metadata || {}) as { plan?: string; interval?: string };
    const plan =
      (meta.plan && isPublicPurchasablePlan(meta.plan) ? meta.plan : null) ||
      planFromCredits(tx.credits_purchased);
    const interval = meta.interval === "year" ? "year" : "month";
    let expiryLabel = "Valid 30 days · renew manually";
    if (plan) {
      const { expiresAt } = await activateOneTimePlan(db, {
        userId: context.userId,
        plan: plan as any,
        interval,
        provider: "razorpay",
        transactionId: data.internalOrderId,
      });
      expiryLabel =
        interval === "year"
          ? `Valid until ${new Date(expiresAt).toUTCString()} · credits monthly · renew manually`
          : `Valid until ${new Date(expiresAt).toUTCString()} · renew manually`;
    }
    await notifyPlanPurchased({
      userId: context.userId,
      plan,
      credits: tx.credits_purchased,
      amount: tx.amount,
      currency: tx.currency || "INR",
      orderId: data.internalOrderId,
      expiryLabel,
      db,
    });
    return { success: true, credits: tx.credits_purchased };
  });

/** Crypto removed from product — stubs so old imports do not crash. */
export const createCryptoInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    throw new Error("Crypto payments are no longer available.");
  });

export const getCryptoStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ status: "unavailable" as const }));

export const getPaypalClientId = createServerFn({ method: "GET" }).handler(async () => {
  return { clientId: process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID || "" };
});

/**
 * Public plans always use one-time Orders API (manual renewal).
 * Legacy non-public plans may still report subscription if PAYPAL_PLAN_* is set
 * (should not be offered on public pricing).
 */
export const getPaypalSubscriptionMode = createServerFn({ method: "POST" })
  .inputValidator((d: { plan: string; interval?: string }) =>
    z.object({ plan: z.string(), interval: intervalSchema.optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { isPublicPurchasablePlan } = await import("@/lib/payments.server");
    if (isPublicPurchasablePlan(data.plan)) {
      return {
        mode: "order" as const,
        billingModel: "one_time" as const,
        message: "One-time payment · plan valid until expiry · renew manually",
      };
    }
    // Legacy: do not open public recurring for lite/plus/etc. from new UI
    return { mode: "order" as const, billingModel: "one_time" as const };
  });

/**
 * Block new PayPal Billing Subscriptions for public plans.
 * Kept export so old clients get a clear error instead of missing handler.
 */
export const createPaypalSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: string; interval?: string }) =>
    z.object({ plan: planSchema, interval: intervalSchema.optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { isPublicPurchasablePlan } = await import("@/lib/payments.server");
    if (isPublicPurchasablePlan(data.plan)) {
      throw new Error(
        "Motio2edit uses one-time payments for Starter, Pro, and Ultra. " +
          "Please use PayPal Checkout (one-time). Automatic renewals are not available for new purchases.",
      );
    }
    throw new Error(
      "Recurring PayPal subscriptions are not available for new checkouts. Use one-time PayPal payment.",
    );
  });

export const createPaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: string; interval?: string }) =>
    z.object({ plan: planSchema, interval: intervalSchema.optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const {
      PLAN_PURCHASE,
      createPaypalOrder: createOrder,
      isPublicPurchasablePlan,
    } = await import("@/lib/payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await enforcePaymentRateLimit(supabaseAdmin as any, context.userId, "paypal");
    const pkg = PLAN_PURCHASE[data.plan as keyof typeof PLAN_PURCHASE];
    if (!pkg) throw new Error("Selected plan is not available for purchase.");
    const interval = data.interval === "year" ? "year" : "month";
    if (interval === "year" && !isPublicPurchasablePlan(data.plan)) {
      throw new Error("Annual billing is only available for Starter, Pro, and Ultra.");
    }
    const amountUSD = amountForPlan(pkg, interval, "USD");
    const internalOrderId = `pp_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const order = await createOrder({
      amountUSD,
      referenceId: internalOrderId,
      description: `Motio2edit ${data.plan} (${interval}) — one-time`,
    });
    const { error } = await (supabaseAdmin as any).from("payment_transactions").insert({
      user_id: context.userId,
      payment_method: "paypal",
      amount: amountUSD,
      currency: "USD",
      credits_purchased: pkg.credits,
      transaction_id: internalOrderId,
      gateway_order_id: order.id,
      payment_status: "pending",
      metadata: {
        plan: data.plan,
        interval,
        billing_model: "one_time",
        kind: "plan_purchase",
      },
    });
    if (error) throw new Error(error.message);
    return {
      orderId: order.id,
      internalOrderId,
      credits: pkg.credits,
      amountUSD,
      interval,
    };
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
    const {
      capturePaypalOrder: captureOrder,
      planFromCredits,
      isPublicPurchasablePlan,
      extractPaypalCaptureId,
    } = await import("@/lib/payments.server");
    const { activateOneTimePlan } = await import("@/lib/plan-lifecycle.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
      return { success: true, credits: tx.credits_purchased, alreadyCompleted: true };
    }

    // Server-side capture + status verification — never trust client alone
    const captured = await captureOrder(data.orderId);
    const status = (captured?.status || "").toUpperCase();
    if (status !== "COMPLETED") {
      await db
        .from("payment_transactions")
        .update({ payment_status: "failed", gateway_response: captured })
        .eq("transaction_id", data.internalOrderId);
      throw new Error(`PayPal payment not completed (status: ${status || "unknown"})`);
    }

    // Verify amount matches server-recorded amount (anti-tamper)
    try {
      const paid = Number(
        captured?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? 0,
      );
      if (paid > 0 && Math.abs(paid - Number(tx.amount)) > 0.02) {
        throw new Error("Paid amount does not match order.");
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("match")) throw e;
    }

    const captureId = extractPaypalCaptureId(captured);

    await db.rpc("apply_payment_credits", {
      _user_id: context.userId,
      _transaction_id: tx.transaction_id,
      _credits: tx.credits_purchased,
      _reason: "paypal_capture",
    });

    await db
      .from("payment_transactions")
      .update({
        payment_status: "completed",
        gateway_payment_id: captureId,
        gateway_response: captured,
      })
      .eq("transaction_id", data.internalOrderId);

    const meta = (tx.metadata || {}) as { plan?: string; interval?: string };
    const plan =
      (meta.plan && isPublicPurchasablePlan(meta.plan) ? meta.plan : null) ||
      planFromCredits(tx.credits_purchased);
    const interval = meta.interval === "year" ? "year" : "month";
    let expiryLabel = "Valid 30 days · renew manually";
    if (plan) {
      const { expiresAt } = await activateOneTimePlan(db, {
        userId: context.userId,
        plan: plan as any,
        interval,
        provider: "paypal",
        transactionId: data.internalOrderId,
      });
      expiryLabel =
        interval === "year"
          ? `Valid until ${new Date(expiresAt).toUTCString()} · credits monthly · renew manually`
          : `Valid until ${new Date(expiresAt).toUTCString()} · renew manually`;
    }

    await notifyPlanPurchased({
      userId: context.userId,
      plan,
      credits: tx.credits_purchased,
      amount: tx.amount,
      currency: tx.currency || "USD",
      orderId: data.internalOrderId,
      expiryLabel,
      db,
    });

    return { success: true, credits: tx.credits_purchased };
  });
