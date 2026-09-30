/**
 * Server functions for private media delivery.
 * Authenticated callers only; ownership + expiry + History entitlement enforced server-side.
 * Never trusts client-supplied ownership/plan/expiry.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  resolveGenerationsMediaBatch,
  resolvePrivateMediaDelivery,
  loadMediaCallerContext,
  MediaAccessError,
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
  /** Ignored for authorization — ownership always loaded from DB when generationId is set. */
  ownerUserId: z.string().uuid().optional(),
  requireHistoryEntitlement: z.boolean().optional(),
});

export const resolveHistoryMediaUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => batchSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { plan, isAdmin } = await loadMediaCallerContext(supabase, userId);

    const rows = await resolveGenerationsMediaBatch({
      supabase,
      userId,
      isAdmin,
      plan,
      generationIds: data.generationIds,
      limit: data.limit ?? 100,
    });

    const urls: Record<string, string | null> = {};
    for (const r of rows) urls[r.id] = r.deliveryUrl;
    return { urls, rows };
  });

export const resolvePrivateMediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => singleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { plan, isAdmin } = await loadMediaCallerContext(supabase, userId);
    const requireHistory = data.requireHistoryEntitlement !== false;

    // Ownership always from DB when generationId present — never trust client ownerUserId.
    let ownerUserId = userId;
    let r2ObjectKey: string | null = null;
    let outputUrl: string | null = null;
    let storageProvider: string | null = null;
    let deletedAt: string | null = null;
    let expiresAt: string | null = null;

    if (data.generationId) {
      let row: Record<string, unknown> | null = null;
      const full = await supabase
        .from("generations")
        .select(
          "user_id, output_url, r2_object_key, storage_provider, deleted_at, expires_at, retained_as_history",
        )
        .eq("id", data.generationId)
        .maybeSingle();

      if (full.error && /column|expires_at|deleted_at|retained_as_history/i.test(full.error.message)) {
        const core = await supabase
          .from("generations")
          .select("user_id, output_url, r2_object_key, storage_provider")
          .eq("id", data.generationId)
          .maybeSingle();
        if (core.error || !core.data) {
          throw new Error("Not authorized to access this media.");
        }
        row = core.data as Record<string, unknown>;
      } else if (full.error || !full.data) {
        throw new Error("Not authorized to access this media.");
      } else {
        row = full.data as Record<string, unknown>;
      }

      ownerUserId = row.user_id as string;
      r2ObjectKey = (row.r2_object_key as string | null) ?? null;
      outputUrl = (row.output_url as string | null) ?? null;
      storageProvider = (row.storage_provider as string | null) ?? null;
      deletedAt = (row.deleted_at as string | null) ?? null;
      expiresAt = (row.expires_at as string | null) ?? null;
    } else {
      r2ObjectKey = data.r2ObjectKey ?? null;
      outputUrl = data.outputUrl ?? null;
      storageProvider = data.storageProvider ?? null;
      ownerUserId = userId;
    }

    try {
      const resolved = await resolvePrivateMediaDelivery({
        userId,
        ownerUserId,
        isAdmin,
        plan,
        r2ObjectKey,
        outputUrl,
        storageProvider,
        generationId: data.generationId,
        deletedAt,
        expiresAt,
        requireHistoryEntitlement: requireHistory,
      });

      return {
        deliveryUrl: resolved.deliveryUrl,
        objectKey: resolved.objectKey,
        source: resolved.source,
      };
    } catch (e) {
      if (e instanceof MediaAccessError) {
        throw new Error(e.message);
      }
      throw e;
    }
  });
