/**
 * Server functions for private media delivery.
 * Authenticated callers only; ownership enforced server-side.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  resolveGenerationsMediaBatch,
  resolvePrivateMediaDelivery,
} from "@/lib/private-media.server";

const batchSchema = z.object({
  generationIds: z.array(z.string().uuid()).max(100).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const singleSchema = z.object({
  generationId: z.string().uuid().optional(),
  r2ObjectKey: z.string().max(1024).optional(),
  outputUrl: z.string().url().max(15_000).optional(),
  storageProvider: z.string().max(32).optional(),
  ownerUserId: z.string().uuid().optional(),
});

export const resolveHistoryMediaUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => batchSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const isAdmin =
      !!profile?.email &&
      profile.email.trim().toLowerCase() === "firstaimrun89@gmail.com";

    const rows = await resolveGenerationsMediaBatch({
      supabase,
      userId,
      isAdmin,
      generationIds: data.generationIds,
      limit: data.limit ?? 100,
    });

    // Map id → deliveryUrl for easy client merge
    const urls: Record<string, string | null> = {};
    for (const r of rows) urls[r.id] = r.deliveryUrl;
    return { urls, rows };
  });

/**
 * Resolve a single media URL (Output panel, download recovery).
 * If generationId is provided, ownership is loaded from DB.
 */
export const resolvePrivateMediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => singleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const isAdmin =
      !!profile?.email &&
      profile.email.trim().toLowerCase() === "firstaimrun89@gmail.com";

    let ownerUserId = data.ownerUserId ?? userId;
    let r2ObjectKey = data.r2ObjectKey ?? null;
    let outputUrl = data.outputUrl ?? null;
    let storageProvider = data.storageProvider ?? null;

    if (data.generationId) {
      const { data: row, error } = await supabase
        .from("generations")
        .select("user_id, output_url, r2_object_key, storage_provider")
        .eq("id", data.generationId)
        .maybeSingle();
      if (error || !row) throw new Error("Generation not found.");
      if (!isAdmin && row.user_id !== userId) {
        throw new Error("Not authorized to access this media.");
      }
      ownerUserId = row.user_id;
      r2ObjectKey = row.r2_object_key ?? r2ObjectKey;
      outputUrl = row.output_url ?? outputUrl;
      storageProvider = row.storage_provider ?? storageProvider;
    }

    const resolved = await resolvePrivateMediaDelivery({
      userId,
      ownerUserId,
      isAdmin,
      r2ObjectKey,
      outputUrl,
      storageProvider,
      generationId: data.generationId,
    });

    return {
      deliveryUrl: resolved.deliveryUrl,
      objectKey: resolved.objectKey,
      source: resolved.source,
    };
  });
