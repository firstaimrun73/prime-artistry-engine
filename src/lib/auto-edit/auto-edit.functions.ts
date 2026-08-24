/**
 * Public server entry for standalone MOTIO2EDIT Auto.
 * Returns only safe fields — never internal prompts or vision dumps.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { executeStandaloneAutoEdit } from "./auto-edit.executor.server";

const schema = z.object({
  imageUrl: z
    .string()
    .max(15_000_000)
    .refine((u) => u.startsWith("https://"), "Image must be a secure https URL."),
  /** 8k_max is backend-supported; UI may not expose it yet. */
  imageQuality: z
    .enum(["sd", "hd", "2k", "4k", "8k", "8k_max"])
    .default("hd"),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
});

export const runStandaloneAutoEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan, credits, email, auto_edit_used_count")
      .eq("id", userId)
      .single();

    if (pErr || !profile) {
      throw new Error("Could not load your account.");
    }

    const adminList = [
      (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(),
      ...(process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()),
      "firstaimrun89@gmail.com",
      "firstaimrun73@gmail.com",
    ].filter(Boolean);
    const isAdmin = !!profile.email && adminList.includes(profile.email.toLowerCase());

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
        auto_edit_used_count:
          typeof (profile as { auto_edit_used_count?: number }).auto_edit_used_count ===
          "number"
            ? (profile as { auto_edit_used_count: number }).auto_edit_used_count
            : 0,
      },
      isAdmin,
    });
  });
