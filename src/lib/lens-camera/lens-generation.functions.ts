/**
 * Lens generation billing + AI+ attempt entitlement.
 * Normal optical: 20 credits per successful Apply (creditCost > 0, tier normal).
 * AI+: paid plan entitlement, limited attempts via generation_history — no credit charge.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminClaims } from "@/lib/admin-guard.server";
import {
  getCameraLensById,
  isAiLens,
  LENS_AI_PLUS_ATTEMPT_LIMIT,
} from "@/lib/lens-camera/roster";
import { isPaidPlan } from "@/lib/policy";

const chargeSchema = z.object({
  lensId: z.string().min(1).max(64),
  generationId: z.string().min(8).max(80),
});

const aiPlusSchema = z.object({
  lensId: z.string().min(1).max(64),
  generationId: z.string().min(8).max(80),
});

/** Normal-tier credit charge. AI+ lenses must NOT use this path. */
export const chargeLensGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => chargeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const lens = getCameraLensById(data.lensId);
    if (!lens) throw new Error("Unknown lens.");
    if (lens.status === "coming-soon") throw new Error("This lens is not available yet.");

    // AI+ never charges credits here
    if (isAiLens(lens) || lens.creditCost <= 0) {
      return {
        ok: true as const,
        credits: 0,
        charged: 0,
        generationId: data.generationId,
        lensName: lens.name,
        cost: 0,
      };
    }

    const cost = lens.creditCost;

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan, credits, email")
      .eq("id", userId)
      .single();
    if (pErr || !profile) throw new Error("Could not load your account.");

    const isAdmin = isAdminClaims({ email: profile.email ?? undefined });

    if (!isAdmin && (profile.credits as number) < cost) {
      throw new Error(`Not enough credits. ${lens.name} costs ${cost} credits.`);
    }

    let newCredits = profile.credits as number;
    let charged = 0;

    if (!isAdmin) {
      const { data: deduction, error: dErr } = await supabaseAdmin.rpc("deduct_credits", {
        _amount: cost,
        _gen_type: "image",
        _user_id: userId,
      });
      if (dErr || !deduction) {
        if (dErr?.message?.includes("INSUFFICIENT_CREDITS")) {
          throw new Error(`Not enough credits. ${lens.name} costs ${cost} credits.`);
        }
        throw new Error("Could not charge credits. Please try again.");
      }
      newCredits = (deduction as { credits: number }).credits;
      charged = cost;
    }

    return {
      ok: true as const,
      credits: newCredits,
      charged,
      generationId: data.generationId,
      lensName: lens.name,
      cost,
    };
  });

/**
 * Server-side AI+ entitlement check + attempt consume.
 * - Free users: blocked
 * - Paid users: up to LENS_AI_PLUS_ATTEMPT_LIMIT successful attempts
 * - Admin: unlimited
 * Consumed only when this function succeeds (call only after validation, before/with apply).
 */
export const consumeAiPlusAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => aiPlusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const lens = getCameraLensById(data.lensId);
    if (!lens) throw new Error("Unknown lens.");
    if (!isAiLens(lens)) throw new Error("This lens is not AI+.");

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan, email")
      .eq("id", userId)
      .single();
    if (pErr || !profile) throw new Error("Could not load your account.");

    const isAdmin = isAdminClaims({ email: profile.email ?? undefined });
    const paid = isAdmin || isPaidPlan(profile.plan);

    if (!paid) {
      throw new Error("AI+ lenses require a paid plan. Upgrade to unlock.");
    }

    // Count successful AI+ lens attempts from generation_history
    const { count, error: cErr } = await supabaseAdmin
      .from("generation_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "lens_ai_plus")
      .eq("status", "success");

    if (cErr) throw new Error("Could not verify AI+ allowance.");

    const used = count ?? 0;
    const limit = LENS_AI_PLUS_ATTEMPT_LIMIT;

    if (!isAdmin && used >= limit) {
      throw new Error(
        `AI+ allowance used (${used}/${limit}). Higher-plan limits can be added later.`,
      );
    }

    // Record attempt (consume)
    const { error: iErr } = await supabaseAdmin.from("generation_history").insert({
      user_id: userId,
      type: "lens_ai_plus",
      status: "success",
      prompt: `${lens.id}:${data.generationId}`,
    });
    if (iErr) throw new Error("Could not record AI+ attempt.");

    return {
      ok: true as const,
      used: used + 1,
      limit: isAdmin ? null : limit,
      remaining: isAdmin ? null : Math.max(0, limit - used - 1),
      lensName: lens.name,
      generationId: data.generationId,
    };
  });

/** Read-only AI+ allowance status for UI. */
export const getAiPlusStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, email")
      .eq("id", userId)
      .single();

    const isAdmin = isAdminClaims({ email: profile?.email ?? undefined });
    const paid = isAdmin || isPaidPlan(profile?.plan);

    if (!paid) {
      return { paid: false, used: 0, limit: LENS_AI_PLUS_ATTEMPT_LIMIT, remaining: 0 };
    }

    const { count } = await supabaseAdmin
      .from("generation_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "lens_ai_plus")
      .eq("status", "success");

    const used = count ?? 0;
    const limit = LENS_AI_PLUS_ATTEMPT_LIMIT;
    return {
      paid: true,
      used,
      limit: isAdmin ? null : limit,
      remaining: isAdmin ? null : Math.max(0, limit - used),
    };
  });
