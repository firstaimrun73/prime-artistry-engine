/**
 * Lens generation billing — AI tier = 20 credits per successful apply.
 * Normal (on-device) tier = 0 credits, never charged.
 * Single server deduction via existing deduct_credits RPC.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminClaims } from "@/lib/admin-guard.server";
import { getCameraLensById, isAiLens } from "@/lib/lens-camera/roster";

const chargeSchema = z.object({
  lensId: z.string().min(1).max(64),
  generationId: z.string().min(8).max(80),
});

export const chargeLensGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => chargeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const lens = getCameraLensById(data.lensId);
    if (!lens) throw new Error("Unknown lens.");
    if (lens.status === "coming-soon") throw new Error("This lens is not available yet.");

    // Normal tier is free — no charge path.
    if (!isAiLens(lens) || lens.creditCost <= 0) {
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
