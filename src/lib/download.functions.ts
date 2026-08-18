import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { WatermarkMode } from "@/lib/policy";

const inputSchema = z.object({
  imageUrl: z.string().url().max(8_000),
  keepWatermark: z.boolean().optional(),
});

export const secureDownloadImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("plan, email").eq("id", userId).single();
    if (pErr || !profile) throw new Error("Could not load your account.");
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = !!adminEmail && !!profile.email && profile.email.toLowerCase() === adminEmail.toLowerCase();
    if (!data.imageUrl.startsWith("https://")) throw new Error("Invalid image URL.");
    const { finalizeMediaAsset } = await import("@/lib/watermark/finalize");
    const result = await finalizeMediaAsset({
      sourceUrl: data.imageUrl, mediaKind: "image",
      plan: profile.plan, email: profile.email, isAdmin,
      keepWatermark: data.keepWatermark === true, userId,
    });
    return { downloadUrl: result.finalUrl, watermarked: result.watermarked, mode: result.mode as WatermarkMode };
  });
