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
