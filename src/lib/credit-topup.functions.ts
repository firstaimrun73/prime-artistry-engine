/**
 * Custom credit top-up (subscribers only).
 * Face: 1 credit = $0.0178 · amount $2–$1000 USD.
 * Does NOT grant credits on the client — payment + apply_payment_credits only.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CUSTOM_TOPUP_CREDIT_FACE_USD,
  CUSTOM_TOPUP_MAX_USD,
  CUSTOM_TOPUP_MIN_USD,
  customTopUpCredits,
  CREDIT_TOPUP_PACKS,
} from "@/lib/credit-topups";
import type { PlanId } from "@/lib/plans";

const PAID_PLANS: PlanId[] = ["lite", "plus", "pro", "studio", "business"];

export const listCreditTopUpPacks = createServerFn({ method: "GET" }).handler(async () => {
  return {
    packs: CREDIT_TOPUP_PACKS,
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
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();
    if (error || !profile) throw new Error("Could not load your account.");
    const plan = (profile.plan ?? "free") as PlanId;
    if (!PAID_PLANS.includes(plan)) {
      throw new Error("Custom top-up is available only for active subscribed plans.");
    }
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
