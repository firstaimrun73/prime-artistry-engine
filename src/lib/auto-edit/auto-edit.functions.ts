import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { executeStandaloneAutoEdit } from "./execute";

type AutoEditProfileRow = {
  plan: string;
  credits: number;
  email: string | null;
};

const inputSchema = z.object({
  imageUrl: z.string().url().max(15_000_000),
  imageQuality: z.enum(["sd", "hd", "2k", "4k"]).optional(),
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
      .select("plan, credits, email")
      .eq("id", userId)
      .single();

    if (pErr || !profileRaw) {
      throw new Error("Could not load your account.");
    }

    const profile = profileRaw as unknown as AutoEditProfileRow;

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
      },
      isAdmin,
    });
  });
