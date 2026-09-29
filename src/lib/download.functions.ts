import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  imageUrl: z.string().url().max(15_000_000),
  keepWatermark: z.boolean().optional(),
  studioTier: z.enum(["standard", "pro", "premium"]).optional(),
  /** Circle 2edit uses purple-ring two-line brand; default generic Motio2edit. */
  watermarkBrand: z.enum(["generic", "circle"]).optional(),
});

export const secureDownloadImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan, email")
      .eq("id", userId)
      .single();
    if (pErr || !profile) throw new Error("Could not load your account.");
    const isAdmin =
      !!profile.email && profile.email.trim().toLowerCase() === "firstaimrun89@gmail.com";
    if (!data.imageUrl.startsWith("https://")) throw new Error("Invalid image URL.");

    // Recover broken public r2.dev user URLs → signed GET before fetch/finalize.
    let sourceUrl = data.imageUrl;
    try {
      const { r2ResolveStoredOutput } = await import("@/lib/r2.server");
      const resolved = await r2ResolveStoredOutput({ outputUrl: data.imageUrl });
      if (resolved) sourceUrl = resolved;
    } catch {
      /* keep original */
    }

    const { finalizeMediaAsset } = await import("@/lib/watermark/finalize");
    const result = await finalizeMediaAsset({
      sourceUrl,
      mediaKind: "image",
      plan: profile.plan,
      email: profile.email,
      isAdmin,
      keepWatermark: data.keepWatermark === true,
      userId,
      studioTier: data.studioTier,
      watermarkBrand: data.watermarkBrand === "circle" ? "circle" : "generic",
    });
    return {
      downloadUrl: result.finalUrl,
      url: result.finalUrl,
    };
  });
