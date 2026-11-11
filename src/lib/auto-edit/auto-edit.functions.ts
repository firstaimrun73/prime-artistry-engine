import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { executeStandaloneAutoEdit } from "./auto-edit.executor.server";

type AutoEditProfileRow = {
  plan: string;
  credits: number;
  email: string | null;
  complimentary_expires_at?: string | null;
  complimentary_tools?: string[] | null;
  auto_edit_used_count?: number | null;
};

const inputSchema = z.object({
  imageUrl: z.string().url().max(15_000_000),
  imageQuality: z.enum(["sd", "hd", "2k", "4k", "8k", "8k_max"]).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const runAutoEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profileRaw, error: pErr } = await supabase
      .from("profiles")
      .select("plan, credits, email, complimentary_expires_at, complimentary_tools, auto_edit_used_count")
      .eq("id", userId)
      .single();

    // Fallback if complimentary columns not migrated yet
    let profile = profileRaw as unknown as AutoEditProfileRow | null;
    if (pErr || !profile) {
      const fallback = await supabase
        .from("profiles")
        .select("plan, credits, email")
        .eq("id", userId)
        .single();
      if (fallback.error || !fallback.data) throw new Error("Could not load your account.");
      profile = fallback.data as unknown as AutoEditProfileRow;
    }

    const { isAdminClaims } = await import("@/lib/admin-guard.server");
    const isAdmin = isAdminClaims({ email: profile.email ?? undefined });

    return executeStandaloneAutoEdit({
      imageUrl: data.imageUrl,
      imageQuality: data.imageQuality ?? "hd",
      width: data.width,
      height: data.height,
      supabase,
      supabaseAdmin,
      userId,
      profile: {
        plan: profile.plan,
        credits: profile.credits,
        email: profile.email,
        complimentary_expires_at: profile.complimentary_expires_at ?? null,
        complimentary_tools: profile.complimentary_tools ?? null,
        auto_edit_used_count: profile.auto_edit_used_count ?? 0,
      },
      isAdmin,
    });
  });

export const runStandaloneAutoEdit = runAutoEdit;
