/**
 * Frame Studio — server entitlement. Client tier/cost are NEVER authority.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminClaims } from "@/lib/admin-guard.server";
import { FRAME_CREDIT_COST, getFrameById, type FrameTier } from "./catalog";

const PLAN_RANK: Record<string, number> = {
  free: 0, aiplus: 1, plus: 1, lite: 1, pro: 2, premium: 2, studio: 2, business: 2,
};
const TIER_NEED: Record<FrameTier, string> = {
  common: "free", aiplus: "aiplus", premium: "premium",
};
function mapAppPlanToFramePlan(plan: string | null | undefined): "free" | "aiplus" | "premium" {
  const p = String(plan || "free").toLowerCase();
  if (p === "free") return "free";
  if (p === "plus" || p === "aiplus" || p === "lite") return "aiplus";
  return "premium";
}

const bodySchema = z.object({
  frameId: z.string().min(1).max(80),
  tier: z.enum(["common", "aiplus", "premium"]).optional(),
  cost: z.number().int().min(0).max(100).optional(),
});

export type FrameApplyResult =
  | { ok: true; admin: boolean; credits: number; plan: "free" | "aiplus" | "premium"; charged: number; tier: FrameTier; frameId: string }
  | { ok: false; reason: "auth" | "plan" | "credits" | "error" | "unknown_frame"; message: string; plan?: string; credits?: number };

export const chargeFrameStudioApply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bodySchema.parse(data))
  .handler(async ({ data, context }): Promise<FrameApplyResult> => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    if (!userId) return { ok: false, reason: "auth", message: "Sign in required" };

    const frame = getFrameById(data.frameId);
    if (!frame) return { ok: false, reason: "unknown_frame", message: "Unknown frame" };
    const tier = frame.tier;
    const expectedCost = FRAME_CREDIT_COST[tier];

    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("id, plan, credits, email").eq("id", userId).maybeSingle();
    if (pErr || !profile) {
      return { ok: false, reason: "error", message: "Could not load account" };
    }

    const admin = isAdminClaims({ email: profile.email ?? undefined });
    const framePlan = mapAppPlanToFramePlan(profile.plan);
    if (admin) {
      return { ok: true, admin: true, credits: profile.credits ?? 0, plan: framePlan, charged: 0, tier, frameId: frame.id };
    }

    const needRank = PLAN_RANK[TIER_NEED[tier]] ?? 0;
    const haveRank = PLAN_RANK[framePlan] ?? 0;
    if (haveRank < needRank) {
      return { ok: false, reason: "plan", message: `Requires ${TIER_NEED[tier]} plan`, plan: framePlan, credits: profile.credits ?? 0 };
    }
    if ((profile.credits ?? 0) < expectedCost) {
      return { ok: false, reason: "credits", message: `Need ${expectedCost} credits`, plan: framePlan, credits: profile.credits ?? 0 };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error: uErr } = await supabaseAdmin
      .from("profiles")
      .update({ credits: (profile.credits as number) - expectedCost })
      .eq("id", userId)
      .gte("credits", expectedCost)
      .select("credits")
      .maybeSingle();

    if (uErr || !updated) {
      return { ok: false, reason: "credits", message: "Insufficient credits", plan: framePlan, credits: profile.credits ?? 0 };
    }

    const { error: ledErr } = await supabaseAdmin.from("frame_studio_ledger").insert({
      user_id: userId, frame_id: frame.id, tier, cost: expectedCost,
    });
    if (ledErr) {
      console.error("[frame-studio] ledger failed — refunding", ledErr);
      await supabaseAdmin.from("profiles")
        .update({ credits: (updated.credits as number) + expectedCost })
        .eq("id", userId);
      return { ok: false, reason: "error", message: "Could not record transaction", plan: framePlan, credits: (updated.credits as number) + expectedCost };
    }

    return { ok: true, admin: false, credits: updated.credits as number, plan: framePlan, charged: expectedCost, tier, frameId: frame.id };
  });
