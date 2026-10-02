/**
 * Credit top-up server functions.
 * Face: 1 purchased credit = $0.0178.
 * Credits always server-computed. PayPal capture + apply_payment_credits only.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CUSTOM_TOPUP_CREDIT_FACE_USD,
  CUSTOM_TOPUP_MAX_USD,
  CUSTOM_TOPUP_MIN_USD,
  CREDIT_TOPUP_PACKS,
  creditsFromUsd,
  customTopUpCredits,
  getTopUpPack,
} from "@/lib/credit-topups";
import type { PlanId } from "@/lib/plans";

const PAID_PLANS: PlanId[] = ["lite", "plus", "pro", "studio", "business"];

async function assertSubscribed(supabase: any, userId: string): Promise<PlanId> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  if (error || !profile) throw new Error("Could not load your account.");
  const plan = (profile.plan ?? "free") as PlanId;
  if (!PAID_PLANS.includes(plan)) {
    throw new Error("Credit top-up is available only for active subscribed plans.");
  }
  return plan;
}

export const listCreditTopUpPacks = createServerFn({ method: "GET" }).handler(async () => {
  return {
    packs: CREDIT_TOPUP_PACKS.map((p) => ({
      ...p,
      credits: creditsFromUsd(p.priceUsd),
    })),
    custom: {
      minUsd: CUSTOM_TOPUP_MIN_USD,
      maxUsd: CUSTOM_TOPUP_MAX_USD,
      creditFaceUsd: CUSTOM_TOPUP_CREDIT_FACE_USD,
      subscribersOnly: true,
    },
  };
});

export const quoteCustomTopUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        usd: z.number().min(CUSTOM_TOPUP_MIN_USD).max(CUSTOM_TOPUP_MAX_USD),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const plan = await assertSubscribed(context.supabase, context.userId);
    const credits = customTopUpCredits(data.usd);
    return {
      ok: true as const,
      usd: data.usd,
      credits,
      creditFaceUsd: CUSTOM_TOPUP_CREDIT_FACE_USD,
      plan,
      message: `$${data.usd.toFixed(2)} → ${credits.toLocaleString()} credits (1 credit = $${CUSTOM_TOPUP_CREDIT_FACE_USD})`,
    };
  });

export const createTopUpPaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        packId: z.string().min(1).max(40).optional(),
        customUsd: z.number().min(CUSTOM_TOPUP_MIN_USD).max(CUSTOM_TOPUP_MAX_USD).optional(),
      })
      .refine((v) => !!v.packId || typeof v.customUsd === "number", {
        message: "Provide packId or customUsd",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { createPaypalOrder } = await import("@/lib/payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const plan = await assertSubscribed(context.supabase, context.userId);

    let priceUsd: number;
    let credits: number;
    let label: string;
    if (data.packId) {
      const pack = getTopUpPack(data.packId);
      if (!pack) throw new Error("Unknown top-up pack.");
      priceUsd = pack.priceUsd;
      credits = creditsFromUsd(priceUsd);
      label = pack.name;
    } else {
      priceUsd = Number(data.customUsd);
      credits = creditsFromUsd(priceUsd);
      label = "Custom";
    }
    if (credits < 1) throw new Error("Amount too small for any credits.");

    const internalOrderId = `topup_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const order = await createPaypalOrder({
      amountUSD: priceUsd,
      referenceId: internalOrderId,
      description: `Motio2edit ${credits} credits (${label})`,
    });

    const { error } = await (supabaseAdmin as any).from("payment_transactions").insert({
      user_id: context.userId,
      payment_method: "paypal",
      amount: priceUsd,
      currency: "USD",
      credits_purchased: credits,
      transaction_id: internalOrderId,
      gateway_order_id: order.id,
      payment_status: "pending",
      metadata: {
        kind: "credit_topup",
        packId: data.packId ?? null,
        customUsd: data.customUsd ?? null,
        faceUsd: CUSTOM_TOPUP_CREDIT_FACE_USD,
        plan,
      },
    });
    if (error) throw new Error(error.message);

    return {
      orderId: order.id,
      internalOrderId,
      credits,
      priceUsd,
      faceUsd: CUSTOM_TOPUP_CREDIT_FACE_USD,
    };
  });

export const captureTopUpPaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        orderId: z.string().min(1),
        internalOrderId: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { capturePaypalOrder } = await import("@/lib/payments.server");
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
      return { success: true, alreadyProcessed: true, credits: tx.credits_purchased as number };
    }

    const capture = await capturePaypalOrder(data.orderId);
    const status = String(capture?.status || "").toUpperCase();
    if (status !== "COMPLETED" && status !== "APPROVED") {
      await db
        .from("payment_transactions")
        .update({ payment_status: "failed", gateway_response: capture })
        .eq("transaction_id", data.internalOrderId);
      throw new Error("Payment was not completed.");
    }

    const credits = Number(tx.credits_purchased) || 0;
    if (credits < 1) throw new Error("Invalid credit quantity on transaction.");

    await db
      .from("payment_transactions")
      .update({ payment_status: "processing", gateway_response: capture })
      .eq("transaction_id", data.internalOrderId);

    const { error: applyErr } = await db.rpc("apply_payment_credits", {
      _user_id: context.userId,
      _transaction_id: tx.transaction_id,
      _credits: credits,
      _reason: "credit_topup_paypal",
    });
    if (applyErr) throw new Error(applyErr.message || "Could not apply credits.");

    await db
      .from("payment_transactions")
      .update({ payment_status: "completed" })
      .eq("transaction_id", data.internalOrderId);

    return { success: true, credits, transactionId: tx.transaction_id as string };
  });
