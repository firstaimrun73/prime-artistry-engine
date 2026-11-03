import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

async function fetchRazorpayPayment(
  paymentId: string,
): Promise<{ ok: true; payment: any } | { ok: false; reason: string }> {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) return { ok: false, reason: "credentials_missing" };
  try {
    const auth = "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: auth },
    });
    if (!res.ok) return { ok: false, reason: `api_http_${res.status}` };
    const payment = await res.json();
    return { ok: true, payment };
  } catch {
    return { ok: false, reason: "api_fetch_error" };
  }
}

/** Atomic claim when RPC exists; otherwise CAS update pending/failed -> processing */
async function claimTransaction(
  db: any,
  transactionId: string,
  userId: string,
): Promise<{ ok: true; tx: any } | { ok: false; reason: string; tx?: any }> {
  try {
    const { data, error } = await db.rpc("claim_payment_transaction", {
      _transaction_id: transactionId,
      _user_id: userId,
    });
    if (!error && data) {
      if (data.ok === true && data.tx) return { ok: true, tx: data.tx };
      if (data.reason === "already_completed") {
        return { ok: false, reason: "already_completed", tx: data.tx };
      }
      return { ok: false, reason: data.reason || "claim_failed", tx: data.tx };
    }
  } catch {
    /* RPC not migrated yet — fall through */
  }

  const { data: tx } = await db
    .from("payment_transactions")
    .select("*")
    .eq("transaction_id", transactionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!tx) return { ok: false, reason: "not_found" };
  if (tx.payment_status === "completed") {
    return { ok: false, reason: "already_completed", tx };
  }
  if (tx.payment_status === "processing") {
    return { ok: false, reason: "in_progress", tx };
  }

  const { data: claimed, error: claimErr } = await db
    .from("payment_transactions")
    .update({ payment_status: "processing", updated_at: new Date().toISOString() })
    .eq("transaction_id", transactionId)
    .eq("user_id", userId)
    .in("payment_status", ["pending", "failed"])
    .select("*");

  if (claimErr || !claimed || claimed.length === 0) {
    return { ok: false, reason: "claim_lost", tx };
  }
  return { ok: true, tx: claimed[0] };
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
    const { razorpayVerifyChecks, rpcSucceeded, updateSucceeded } = await import(
      "@/lib/payment-verify.server"
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

    const claim = await claimTransaction(db, data.internalOrderId, context.userId);
    if (!claim.ok) {
      if (claim.reason === "already_completed" && claim.tx) {
        return {
          success: true,
          credits: claim.tx.credits_purchased,
          alreadyCompleted: true,
        };
      }
      throw new Error(
        claim.reason === "in_progress"
          ? "Payment is already being processed"
          : "Payment verification failed",
      );
    }
    const tx = claim.tx;
    if (tx.payment_method && tx.payment_method !== "razorpay") {
      throw new Error("Payment verification failed");
    }

    const api = await fetchRazorpayPayment(data.razorpay_payment_id);
    const paidMajor =
      api.ok && typeof api.payment.amount === "number" ? api.payment.amount / 100 : null;

    const checks = razorpayVerifyChecks({
      tx,
      userId: context.userId,
      razorpayOrderId: data.razorpay_order_id,
      razorpayPaymentId: data.razorpay_payment_id,
      paidMajor,
      paymentStatus: api.ok ? api.payment.status : null,
      apiOrderId: api.ok ? api.payment.order_id : null,
      apiPaymentId: api.ok ? api.payment.id : null,
      apiFetchOk: api.ok,
    });
    if (!checks.ok) {
      console.error("[razorpay] verify failed:", checks.reason, data.internalOrderId);
      await db
        .from("payment_transactions")
        .update({ payment_status: "pending", updated_at: new Date().toISOString() })
        .eq("transaction_id", data.internalOrderId)
        .eq("payment_status", "processing");
      throw new Error("Payment verification failed");
    }

    const rpc = await db.rpc("apply_payment_credits", {
      _user_id: context.userId,
      _transaction_id: tx.transaction_id,
      _credits: tx.credits_purchased,
      _reason: "razorpay_capture",
    });
    const rpcCheck = rpcSucceeded(rpc);
    if (!rpcCheck.ok) {
      console.error("[razorpay] apply_payment_credits failed:", rpcCheck.reason);
      await db
        .from("payment_transactions")
        .update({ payment_status: "pending", updated_at: new Date().toISOString() })
        .eq("transaction_id", data.internalOrderId)
        .eq("payment_status", "processing");
      throw new Error("Could not apply credits");
    }

    const complete = await db
      .from("payment_transactions")
      .update({
        payment_status: "completed",
        gateway_payment_id: data.razorpay_payment_id,
        gateway_response: { client: data, gateway: api.ok ? api.payment : null },
        updated_at: new Date().toISOString(),
      })
      .eq("transaction_id", data.internalOrderId)
      .eq("user_id", context.userId)
      .select("id");

    const done = updateSucceeded(complete);
    if (!done.ok) {
      console.error("[razorpay] completion update failed:", done.reason);
      // Credits may already be applied (ledger unique) — do not claim full success if we cannot record
      throw new Error("Payment recorded incompletely; contact support with your order id");
    }

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

export const getPaypalSubscriptionMode = createServerFn({ method: "POST" })
  .inputValidator((d: { plan: string; interval?: string }) =>
    z.object({ plan: z.string(), interval: intervalSchema.optional() }).parse(d),
  )
  .handler(async () => {
    return {
      mode: "order" as const,
      billingModel: "one_time" as const,
      message: "One-time payment · plan valid until expiry · renew manually",
    };
  });

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
    const { PLAN_PURCHASE, createPaypalOrder: createOrder, isPublicPurchasablePlan } = await import(
      "@/lib/payments.server"
    );
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
    const { paypalCaptureChecks, rpcSucceeded, updateSucceeded } = await import(
      "@/lib/payment-verify.server"
    );
    const { activateOneTimePlan } = await import("@/lib/plan-lifecycle.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const claim = await claimTransaction(db, data.internalOrderId, context.userId);
    if (!claim.ok) {
      if (claim.reason === "already_completed" && claim.tx) {
        return {
          success: true,
          credits: claim.tx.credits_purchased,
          alreadyCompleted: true,
        };
      }
      throw new Error(
        claim.reason === "in_progress"
          ? "Payment is already being processed"
          : "Payment verification failed",
      );
    }
    const tx = claim.tx;

    const captured = await captureOrder(data.orderId);
    const checks = paypalCaptureChecks({
      tx,
      orderId: data.orderId,
      userId: context.userId,
      captured,
    });
    if (!checks.ok) {
      console.error("[paypal] capture checks failed:", checks.reason, data.internalOrderId);
      await db
        .from("payment_transactions")
        .update({
          payment_status: checks.reason.startsWith("status_") ? "failed" : "pending",
          gateway_response: captured,
          updated_at: new Date().toISOString(),
        })
        .eq("transaction_id", data.internalOrderId)
        .eq("payment_status", "processing");
      throw new Error("Payment verification failed");
    }

    const captureId = extractPaypalCaptureId(captured);

    const rpc = await db.rpc("apply_payment_credits", {
      _user_id: context.userId,
      _transaction_id: tx.transaction_id,
      _credits: tx.credits_purchased,
      _reason: "paypal_capture",
    });
    const rpcCheck = rpcSucceeded(rpc);
    if (!rpcCheck.ok) {
      console.error("[paypal] apply_payment_credits failed:", rpcCheck.reason);
      await db
        .from("payment_transactions")
        .update({ payment_status: "pending", updated_at: new Date().toISOString() })
        .eq("transaction_id", data.internalOrderId)
        .eq("payment_status", "processing");
      throw new Error("Could not apply credits");
    }

    const complete = await db
      .from("payment_transactions")
      .update({
        payment_status: "completed",
        gateway_payment_id: captureId,
        gateway_response: captured,
        updated_at: new Date().toISOString(),
      })
      .eq("transaction_id", data.internalOrderId)
      .eq("user_id", context.userId)
      .select("id");

    const done = updateSucceeded(complete);
    if (!done.ok) {
      console.error("[paypal] completion update failed:", done.reason);
      throw new Error("Payment recorded incompletely; contact support with your order id");
    }

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
