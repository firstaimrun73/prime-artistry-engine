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
  imageQuality: z.enum(["hd", "2k", "4k"]).default("hd"),
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
      .select("plan, credits, email")
      .eq("id", userId)
      .single();

    if (pErr || !profile) {
      throw new Error("Could not load your account.");
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin =
      !!adminEmail &&
      !!profile.email &&
      profile.email.toLowerCase() === adminEmail.toLowerCase();

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
