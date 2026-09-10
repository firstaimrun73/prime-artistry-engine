/**
 * Server-authoritative Frames quote + charge.
 * Composition runs on the client; server validates IDs and deducts credits once on success.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminClaims } from "@/lib/admin-guard.server";
import { getFrameById } from "./frame-registry";
import { getGlassById } from "./glass-registry";
import { isValidRatioId } from "./ratios";
import { quoteFramesExport } from "./pricing";

const quoteSchema = z.object({
  frameId: z.string().min(1).max(40),
  glassId: z.string().min(1).max(40),
  ratioId: z.string().min(1).max(20),
  longEdge: z.number().int().min(64).max(8192),
});

const finalizeSchema = quoteSchema.extend({
  outputFormat: z.enum(["image/png", "image/jpeg", "image/webp"]),
  resultNote: z.string().max(200).optional(),
});

export const quoteFrames = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => quoteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    if (!getFrameById(data.frameId)) throw new Error("Invalid frame selection.");
    if (!getGlassById(data.glassId)) throw new Error("Invalid glass selection.");
    if (!isValidRatioId(data.ratioId)) throw new Error("Invalid aspect ratio.");

    const quote = quoteFramesExport({ longEdge: data.longEdge });
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, email")
      .eq("id", userId)
      .single();
    const credits = profile?.credits ?? 0;
    const isAdmin = isAdminClaims({ email: profile?.email ?? undefined });
    return {
      ok: true as const,
      credits: quote.credits,
      free: quote.free,
      label: quote.label,
      balance: credits,
      canAfford: isAdmin || credits >= quote.credits,
    };
  });

export const finalizeFramesExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => finalizeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    if (!getFrameById(data.frameId)) throw new Error("Invalid frame selection.");
    if (!getGlassById(data.glassId)) throw new Error("Invalid glass selection.");
    if (!isValidRatioId(data.ratioId)) throw new Error("Invalid aspect ratio.");

    const quote = quoteFramesExport({ longEdge: data.longEdge });
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("credits, email, plan")
      .eq("id", userId)
      .single();
    if (pErr || !profile) throw new Error("Could not load your account.");

    const isAdmin = isAdminClaims({ email: profile.email ?? undefined });
    let newCredits = profile.credits;

    if (!isAdmin && quote.credits > 0) {
      if (profile.credits < quote.credits) {
        throw new Error(`Not enough credits for this export. Needs ${quote.credits} credits.`);
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: deduction, error: dErr } = await supabaseAdmin.rpc("deduct_credits", {
        _amount: quote.credits,
        _gen_type: "image",
        _user_id: userId,
      });
      if (dErr || !deduction) {
        if (dErr?.message?.includes("INSUFFICIENT_CREDITS")) {
          throw new Error(`Not enough credits for this export. Needs ${quote.credits} credits.`);
        }
        throw new Error("Could not complete export charge. No credits were charged.");
      }
      newCredits = (deduction as { credits: number }).credits;
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const frame = getFrameById(data.frameId);
      const glass = getGlassById(data.glassId);
      await supabaseAdmin.from("generations").insert({
        user_id: userId,
        type: "image",
        prompt: `Frames · ${frame?.name ?? data.frameId} · ${glass?.name ?? data.glassId} · ${data.ratioId}`,
        output_url: null,
        credits_used: isAdmin ? 0 : quote.credits,
        metadata: {
          source: "frames",
          experience: "frames",
          frame_id: data.frameId,
          glass_id: data.glassId,
          ratio_id: data.ratioId,
          output_format: data.outputFormat,
          long_edge: data.longEdge,
          credits_charged: isAdmin ? 0 : quote.credits,
        },
      });
    } catch (e) {
      console.error("[frames] history insert failed", e);
    }

    return {
      ok: true as const,
      creditsCharged: isAdmin ? 0 : quote.credits,
      credits: newCredits,
    };
  });
