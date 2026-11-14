import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { executeStandaloneAutoEdit } from "./auto-edit.executor.server";
import { autoEditCreditCost, type AutoEditQuality } from "./constants";
import {
  planAllowsAutoEditQuality,
  planAllowsMalutoAI,
} from "./entitlements";

type AutoEditProfileRow = {
  plan: string;
  credits: number;
  email: string | null;
};

const inputSchema = z.object({
  imageUrl: z.string().url().max(15_000_000),
  imageQuality: z.enum(["sd", "hd", "2k", "4k", "8k", "8k_max"]).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const preflightSchema = z.object({
  imageQuality: z.enum(["sd", "hd", "2k", "4k", "8k", "8k_max"]).optional(),
});

export type AutoEditPreflightResult =
  | {
      ok: true;
      credits: number;
      cost: number;
      plan: string;
      quality: AutoEditQuality;
    }
  | {
      ok: false;
      reason: "plan" | "quality" | "credits" | "auth" | "error";
      message: string;
      credits: number;
      cost: number;
      plan: string;
      quality: AutoEditQuality;
    };

/**
 * Lightweight server preflight — live profile balance + plan entitlement.
 * No upload, no Gemini, no fal, no charge.
 * Client MUST call this before setBusy / upload / animation.
 */
export const preflightAutoEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => preflightSchema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<AutoEditPreflightResult> => {
    const { supabase, userId } = context;
    const quality = (data.imageQuality ?? "hd") as AutoEditQuality;
    const cost = autoEditCreditCost(quality);

    const { data: profileRaw, error: pErr } = await supabase
      .from("profiles")
      .select("plan, credits, email")
      .eq("id", userId)
      .single();

    if (pErr || !profileRaw) {
      return {
        ok: false,
        reason: "error",
        message: "Could not load your account. Please try again.",
        credits: 0,
        cost,
        plan: "free",
        quality,
      };
    }

    const profile = profileRaw as unknown as AutoEditProfileRow;
    const plan = profile.plan ?? "free";
    const credits = typeof profile.credits === "number" ? profile.credits : 0;

    const { isAdminClaims } = await import("@/lib/admin-guard.server");
    const isAdmin = isAdminClaims({ email: profile.email ?? undefined });

    if (!isAdmin && !planAllowsMalutoAI(plan)) {
      return {
        ok: false,
        reason: "plan",
        message:
          "Maluto AI Restore is a paid feature. Upgrade your plan to unlock — just upload a photo.",
        credits,
        cost,
        plan,
        quality,
      };
    }

    if (!isAdmin && !planAllowsAutoEditQuality(plan, quality)) {
      return {
        ok: false,
        reason: "quality",
        message: `Your plan does not include Auto Edit at ${quality.toUpperCase()}. Upgrade to unlock this quality.`,
        credits,
        cost,
        plan,
        quality,
      };
    }

    if (!isAdmin && credits < cost) {
      return {
        ok: false,
        reason: "credits",
        message: `You're out of credits! This enhancement requires ${cost} credits. Your available balance is ${credits} credits.`,
        credits,
        cost,
        plan,
        quality,
      };
    }

    return { ok: true, credits, cost, plan, quality };
  });

export const runAutoEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profileRaw, error: pErr } = await supabase
      .from("profiles")
      .select("plan, credits, email")
      .eq("id", userId)
      .single();

    if (pErr || !profileRaw) {
      throw new Error("Could not load your account.");
    }

    const profile = profileRaw as unknown as AutoEditProfileRow;

    const { isAdminClaims } = await import("@/lib/admin-guard.server");
    const isAdmin = isAdminClaims({ email: profile.email ?? undefined });

    // Re-check live balance at job creation (prevents race after preflight).
    const quality = (data.imageQuality ?? "hd") as AutoEditQuality;
    const cost = autoEditCreditCost(quality);
    if (!isAdmin && (profile.credits ?? 0) < cost) {
      throw new Error(
        `INSUFFICIENT_CREDITS: need ${cost} credits (you have ${profile.credits ?? 0}). Generation not started.`,
      );
    }

    return executeStandaloneAutoEdit({
      imageUrl: data.imageUrl,
      imageQuality: quality,
      width: data.width,
      height: data.height,
      supabase,
      supabaseAdmin,
      userId,
      profile: {
        plan: profile.plan,
        credits: profile.credits,
        email: profile.email,
      },
      isAdmin,
    });
  });

/** Alias expected by Auto Edit studio route. */
export const runStandaloneAutoEdit = runAutoEdit;
