import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isFreePlan } from "@/lib/policy";

const inputSchema = z.object({
  /** Clean https provider/delivery URL. Preferred with generationId when available. */
  imageUrl: z.string().max(15_000_000).optional(),
  /** Preferred: resolve ownership + clean provider URL from DB. */
  generationId: z.string().uuid().optional(),
  keepWatermark: z.boolean().optional(),
  studioTier: z.enum(["standard", "pro", "premium"]).optional(),
  /** Circle 2edit uses purple-ring two-line brand; default generic Motio2edit. */
  watermarkBrand: z.enum(["generic", "circle"]).optional(),
}).refine((d) => !!(d.generationId || (d.imageUrl && d.imageUrl.length > 0)), {
  message: "imageUrl or generationId required",
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

    // Free plan: server forces watermark regardless of client keepWatermark.
    const keepWatermark =
      isAdmin
        ? data.keepWatermark === true
        : isFreePlan(profile.plan)
          ? true
          : data.keepWatermark === true;

    let sourceUrl = data.imageUrl ?? "";

    // Prefer generationId: ownership + clean fal/provider URL from DB (never trust only client URL).
    if (data.generationId) {
      const { data: row, error: gErr } = await supabase
        .from("generations")
        .select("id, user_id, output_url, storage_provider, deleted_at, expires_at, retained_as_history, metadata")
        .eq("id", data.generationId)
        .maybeSingle();
      if (gErr || !row) throw new Error("Not authorized to access this media.");
      if (!isAdmin && row.user_id !== userId) {
        throw new Error("Not authorized to access this media.");
      }
      if (row.deleted_at) throw new Error("This media is no longer available.");
      if (row.expires_at) {
        const t = Date.parse(String(row.expires_at));
        if (Number.isFinite(t) && Date.now() > t) {
          throw new Error("This media reference has expired.");
        }
      }
      const meta = (row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {}) as Record<string, unknown>;
      const fromMeta =
        typeof meta.source_media_url === "string" ? meta.source_media_url : null;
      const candidate =
        (fromMeta && fromMeta.startsWith("https://") ? fromMeta : null) ||
        (typeof row.output_url === "string" && row.output_url.startsWith("https://")
          ? row.output_url
          : null);
      if (!candidate) throw new Error("Invalid image URL.");
      sourceUrl = candidate;
    }

    if (!sourceUrl || !sourceUrl.startsWith("https://")) {
      throw new Error("Invalid image URL.");
    }

    // Recover broken public r2.dev user URLs → signed GET before fetch/finalize.
    try {
      const { r2ResolveStoredOutput } = await import("@/lib/r2.server");
      const resolved = await r2ResolveStoredOutput({ outputUrl: sourceUrl });
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
      keepWatermark,
      userId,
      studioTier: data.studioTier,
      watermarkBrand: data.watermarkBrand === "circle" ? "circle" : "generic",
    });
    return {
      downloadUrl: result.finalUrl,
      url: result.finalUrl,
      watermarked: result.watermarked,
    };
  });
