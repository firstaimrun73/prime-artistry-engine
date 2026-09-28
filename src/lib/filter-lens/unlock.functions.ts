/**
 * Server-authoritative unlock for Filters and Lenses.
 * One-time credit charge; free items never charge.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminClaims } from "@/lib/admin-guard.server";
import { getFilterById } from "@/lib/filter-lens/filters/filter-registry";
import { getLensById } from "@/lib/filter-lens/lenses/lens-registry";

const inputSchema = z.object({
  kind: z.enum(["filter", "lens"]),
  itemId: z.string().min(1).max(40),
});

export const unlockFilterOrLens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan, credits, email")
      .eq("id", userId)
      .single();
    if (pErr || !profile) throw new Error("Could not load your account.");
    const isAdmin = isAdminClaims({ email: profile.email ?? undefined });

    let unlockCost = 0;
    let isFree = false;
    let name = data.itemId;

    if (data.kind === "filter") {
      const f = getFilterById(data.itemId);
      if (!f) throw new Error(`Unknown filter: ${data.itemId}`);
      isFree = f.unlock.isFree;
      unlockCost = f.unlock.unlockCost;
      name = f.name;
    } else {
      const l = getLensById(data.itemId);
      if (!l) throw new Error(`Unknown lens: ${data.itemId}`);
      isFree = l.unlock.isFree;
      unlockCost = l.unlock.unlockCost;
      name = l.name;
    }

    if (isFree || unlockCost <= 0) {
      return { ok: true as const, alreadyFree: true, credits: profile.credits, name };
    }

    if (!isAdmin && profile.credits < unlockCost) {
      throw new Error(`Not enough credits. Unlock costs ${unlockCost} credits.`);
    }

    let newCredits = profile.credits;
    if (!isAdmin) {
      const { data: deduction, error: dErr } = await supabaseAdmin.rpc("deduct_credits", {
        _amount: unlockCost,
        _gen_type: "image",
        _user_id: userId,
      });
      if (dErr || !deduction) {
        if (dErr?.message?.includes("INSUFFICIENT_CREDITS")) {
          throw new Error(`Not enough credits. Unlock costs ${unlockCost} credits.`);
        }
        throw new Error(`Could not charge credits: ${dErr?.message || "unknown"}`);
      }
      newCredits = (deduction as { credits: number }).credits;
    }

    try {
      const { persistGenerationHistory } = await import("@/lib/history-persist.server");
      // Unlock is a purchase ledger row, not generated media — no private bytes.
      await persistGenerationHistory({
        supabaseAdmin,
        userId,
        type: "image",
        prompt: `Unlock ${data.kind}: ${name}`,
        output_url: "",
        status: "success",
        is_private: true,
        metadata: {
          operation: data.kind === "filter" ? "filter_unlock" : "lens_unlock",
          item_id: data.itemId,
          item_name: name,
          credits_charged: isAdmin ? 0 : unlockCost,
        },
      });
    } catch {
      /* ignore */
    }

    return {
      ok: true as const,
      alreadyFree: false,
      credits: newCredits,
      name,
      charged: isAdmin ? 0 : unlockCost,
    };
  });

/** Alias used by EffectStudioPage (same server fn as unlockFilterOrLens). */
export const chargeFilterUnlock = unlockFilterOrLens;
