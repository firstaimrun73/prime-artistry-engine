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
  /** Includes 8k_max (backend + plan-gated UI). */
  imageQuality: z
    .enum(["sd", "hd", "2k", "4k", "8k", "8k_max"])
    .default("hd"),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
});

/** Profile fields needed for Auto Edit (incl. free-limit counter). */
type AutoEditProfileRow = {
  plan: string;
  credits: number;
  email: string | null;
  /** Live DB column; may be missing from generated Supabase types until regen. */
  auto_edit_used_count?: number | null;
};

export const runStandaloneAutoEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Select includes auto_edit_used_count (migration applied on live DB).
    // Cast through unknown: generated Database types may lag the live schema.
    const { data: profileRaw, error: pErr } = await supabase
      .from("profiles")
      .select("plan, credits, email, auto_edit_used_count")
      .eq("id", userId)
      .single();

    if (pErr || !profileRaw) {
      throw new Error("Could not load your account.");
    }

    const profile = profileRaw as unknown as AutoEditProfileRow;

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
          typeof profile.auto_edit_used_count === "number"
            ? profile.auto_edit_used_count
            : 0,
      },
      isAdmin,
    });
  });
