/**
 * Shared private media delivery (server-only).
 *
 * Flow: private R2 object → auth + ownership → permanent key → temporary signed URL
 * Used by History, Download recovery, and any studio that needs browser-safe delivery.
 *
 * Never exposes R2 secrets. Never returns public r2.dev URLs for users/**.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type MediaResolveInput = {
  generationId?: string;
  r2ObjectKey?: string | null;
  outputUrl?: string | null;
  storageProvider?: string | null;
  userId: string;
  /** Row owner — must match authenticated user (or admin). */
  ownerUserId: string;
};

export type MediaResolveResult = {
  deliveryUrl: string | null;
  objectKey: string | null;
  source: "signed_r2" | "signed_private_r2" | "passthrough" | "unavailable";
};

function assertOwner(ownerUserId: string, requesterId: string, isAdmin: boolean): void {
  if (isAdmin) return;
  if (ownerUserId !== requesterId) {
    throw new Error("Not authorized to access this media.");
  }
}

/**
 * Resolve a browser-loadable temporary URL for private user media.
 * Prefer permanent r2_object_key; fall back to key extraction from broken public URLs.
 */
export async function resolvePrivateMediaDelivery(
  input: MediaResolveInput & { isAdmin?: boolean },
): Promise<MediaResolveResult> {
  assertOwner(input.ownerUserId, input.userId, !!input.isAdmin);

  const provider = (input.storageProvider ?? "").toLowerCase();

  // Dedicated private user bucket (history pipeline)
  if (provider === "r2" && input.r2ObjectKey) {
    try {
      const { isPrivateR2Configured, privateR2SignedGetUrl } = await import(
        "@/lib/private-history-storage.server"
      );
      if (isPrivateR2Configured()) {
        const url = await privateR2SignedGetUrl(input.r2ObjectKey);
        return { deliveryUrl: url, objectKey: input.r2ObjectKey, source: "signed_private_r2" };
      }
    } catch (e) {
      console.warn("[private-media] private R2 sign failed:", e);
    }
  }

  // Primary app R2 bucket (finalizeMediaAsset users/**/outputs)
  try {
    const {
      isR2Configured,
      r2ResolveDeliveryUrl,
      extractR2ObjectKeyFromUrl,
      isPrivateUserObjectKey,
    } = await import("@/lib/r2.server");

    let key =
      (input.r2ObjectKey && input.r2ObjectKey.replace(/^\//, "")) ||
      (input.outputUrl ? extractR2ObjectKeyFromUrl(input.outputUrl) : null);

    if (key && isPrivateUserObjectKey(key) && isR2Configured()) {
      const url = await r2ResolveDeliveryUrl(key, { preferSigned: true });
      if (url) {
        return { deliveryUrl: url, objectKey: key, source: "signed_r2" };
      }
    }

    // Non-private URL (fal CDN, supabase signed, blob): passthrough if https
    if (input.outputUrl?.startsWith("https://")) {
      // Never passthrough broken public r2.dev for users/**
      const extracted = extractR2ObjectKeyFromUrl(input.outputUrl);
      if (extracted && isPrivateUserObjectKey(extracted)) {
        return { deliveryUrl: null, objectKey: extracted, source: "unavailable" };
      }
      return { deliveryUrl: input.outputUrl, objectKey: key, source: "passthrough" };
    }
  } catch (e) {
    console.error("[private-media] resolve failed:", e);
  }

  return { deliveryUrl: null, objectKey: input.r2ObjectKey ?? null, source: "unavailable" };
}

/**
 * Batch-resolve delivery URLs for History rows owned by the requester.
 */
export async function resolveGenerationsMediaBatch(opts: {
  supabase: SupabaseClient;
  userId: string;
  isAdmin?: boolean;
  generationIds?: string[];
  /** When empty, resolve latest retained rows for user (limit). */
  limit?: number;
}): Promise<
  Array<{
    id: string;
    deliveryUrl: string | null;
    objectKey: string | null;
    type: string;
  }>
> {
  let q = opts.supabase
    .from("generations")
    .select("id, type, output_url, r2_object_key, storage_provider, user_id")
    .eq("user_id", opts.userId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);

  if (opts.generationIds && opts.generationIds.length > 0) {
    q = opts.supabase
      .from("generations")
      .select("id, type, output_url, r2_object_key, storage_provider, user_id")
      .eq("user_id", opts.userId)
      .in("id", opts.generationIds);
  }

  const { data, error } = await q;
  if (error || !data) {
    console.error("[private-media] batch load failed:", error?.message);
    return [];
  }

  const out: Array<{
    id: string;
    deliveryUrl: string | null;
    objectKey: string | null;
    type: string;
  }> = [];

  for (const row of data as Array<{
    id: string;
    type: string;
    output_url: string | null;
    r2_object_key: string | null;
    storage_provider: string | null;
    user_id: string;
  }>) {
    const resolved = await resolvePrivateMediaDelivery({
      userId: opts.userId,
      ownerUserId: row.user_id,
      isAdmin: opts.isAdmin,
      r2ObjectKey: row.r2_object_key,
      outputUrl: row.output_url,
      storageProvider: row.storage_provider,
      generationId: row.id,
    });
    out.push({
      id: row.id,
      deliveryUrl: resolved.deliveryUrl,
      objectKey: resolved.objectKey,
      type: row.type,
    });
  }
  return out;
}
