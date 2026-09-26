/**
 * Frame Studio — server entitlement + credit spend.
 * Browser is never the source of truth for plan or credits.
 *
 * Costs (must match client CREDIT_COST):
 *   common: 5 | aiplus: 10 | premium: 25
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminClaims } from "@/lib/admin-guard.server";
import { FRAME_CREDIT_COST, type FrameTier } from "./credits";

const PLAN_RANK: Record<string, number> = {
  free: 0,
  aiplus: 1,
  plus: 1,
  lite: 1,
  pro: 2,
  premium: 2,
  studio: 2,
  business: 2,
};

const TIER_NEED: Record<FrameTier, string> = {
  common: "free",
  aiplus: "aiplus",
  premium: "premium",
};

function mapAppPlanToFramePlan(plan: string | null | undefined): "free" | "aiplus" | "premium" {
  const p = String(plan || "free").toLowerCase();
  if (p === "free") return "free";
  if (p === "plus" || p === "aiplus" || p === "lite") return "aiplus";
  return "premium";
}

const bodySchema = z.object({
  frameId: z.string().min(1).max(80),
  tier: z.enum(["common", "aiplus", "premium"]),
  cost: z.number().int().min(0).max(100).optional(),
});

export type FrameApplyResult =
  | {
      ok: true;
      admin: boolean;
      credits: number;
      plan: "free" | "aiplus" | "premium";
      charged: number;
    }
  | {
      ok: false;
      reason: "auth" | "plan" | "credits" | "error";
      message: string;
      plan?: string;
      credits?: number;
    };

export const chargeFrameStudioApply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bodySchema.parse(data))
  .handler(async ({ data, context }): Promise<FrameApplyResult> => {
    const { supabase, userId } = context as {
      supabase: any;
      userId: string;
    };

    if (!userId) {
      return { ok: false, reason: "auth", message: "Sign in required" };
    }

    const tier = data.tier as FrameTier;
    const expectedCost = FRAME_CREDIT_COST[tier];

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, plan, credits, email")
      .eq("id", userId)
      .maybeSingle();

    if (pErr || !profile) {
      console.error("[frame-studio] profile load", pErr);
      return { ok: false, reason: "error", message: "Could not load account" };
    }

    const admin = isAdminClaims({ email: profile.email ?? undefined });
    const framePlan = mapAppPlanToFramePlan(profile.plan);
    const need = TIER_NEED[tier];
    const needRank = PLAN_RANK[need] ?? 0;
    const haveRank = PLAN_RANK[framePlan] ?? 0;

    if (admin) {
      return {
        ok: true,
        admin: true,
        credits: profile.credits ?? 0,
        plan: framePlan,
        charged: 0,
      };
    }

    if (haveRank < needRank) {
      return {
        ok: false,
        reason: "plan",
        message: `Requires ${need} plan`,
        plan: framePlan,
        credits: profile.credits ?? 0,
      };
    }

    if ((profile.credits ?? 0) < expectedCost) {
      return {
        ok: false,
        reason: "credits",
        message: `Need ${expectedCost} credits`,
        plan: framePlan,
        credits: profile.credits ?? 0,
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error: uErr } = await supabaseAdmin
      .from("profiles")
      .update({ credits: (profile.credits as number) - expectedCost })
      .eq("id", userId)
      .gte("credits", expectedCost)
      .select("credits, plan")
      .maybeSingle();

    if (uErr || !updated) {
      return {
        ok: false,
        reason: "credits",
        message: "Insufficient credits",
        plan: framePlan,
        credits: profile.credits ?? 0,
      };
    }

    try {
      await supabaseAdmin.from("frame_studio_ledger").insert({
        user_id: userId,
        frame_id: data.frameId,
        tier,
        cost: expectedCost,
      });
    } catch (e) {
      console.warn("[frame-studio] ledger insert skipped", e);
    }

    return {
      ok: true,
      admin: false,
      credits: updated.credits,
      plan: mapAppPlanToFramePlan(updated.plan),
      charged: expectedCost,
    };
  });
