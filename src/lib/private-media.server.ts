/**
 * Shared private media delivery (server-only).
 *
 * New History architecture: generated media stays on fal.ai (provider URL).
 * storage_provider=fal|provider → passthrough stored source URL after ownership check.
 *
 * Legacy rows may still use r2/blob keys — signed delivery retained for those only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type MediaResolveInput = {
  generationId?: string;
  r2ObjectKey?: string | null;
  outputUrl?: string | null;
  storageProvider?: string | null;
  userId: string;
  ownerUserId: string;
};

export type MediaResolveResult = {
  deliveryUrl: string | null;
  objectKey: string | null;
  source: "signed_private_r2" | "blob" | "passthrough" | "unavailable";
};

function assertOwner(ownerUserId: string, requesterId: string, isAdmin: boolean): void {
  if (ownerUserId !== requesterId) {
    throw new Error("Not authorized to access this media.");
  }
  void isAdmin;
}

function keyLooksLikeUserMedia(key: string | null | undefined): boolean {
  if (!key) return false;
  return key.replace(/^\//, "").startsWith("users/");
}

function looksLikeProviderUrl(url: string): boolean {
  return /fal\.media|fal\.ai|fal\.run|cdn\.fal|media\.fal/i.test(url);
}

export async function resolvePrivateMediaDelivery(
  input: MediaResolveInput & { isAdmin?: boolean },
): Promise<MediaResolveResult> {
  assertOwner(input.ownerUserId, input.userId, !!input.isAdmin);

  const provider = (input.storageProvider ?? "").toLowerCase();

  // fal/provider link-only History: return stored source URL after ownership check
  if (
    (provider === "fal" || provider === "provider" || provider === "") &&
    input.outputUrl?.startsWith("https://")
  ) {
    if (provider === "fal" || provider === "provider" || looksLikeProviderUrl(input.outputUrl)) {
      return { deliveryUrl: input.outputUrl, objectKey: null, source: "passthrough" };
    }
  }

  let key = (input.r2ObjectKey && input.r2ObjectKey.replace(/^\//, "")) || null;

  if (!key && input.outputUrl) {
    try {
      const { extractR2ObjectKeyFromUrl } = await import("@/lib/r2.server");
      key = extractR2ObjectKeyFromUrl(input.outputUrl);
    } catch {
      /* ignore */
    }
  }

  // Legacy private R2 (old rows only)
  if ((provider === "r2" || keyLooksLikeUserMedia(key)) && key && provider !== "blob" && provider !== "fal") {
    try {
      const { isPrivateR2Configured, privateR2SignedGetUrl } = await import(
        "@/lib/private-history-storage.server"
      );
      if (isPrivateR2Configured()) {
        const url = await privateR2SignedGetUrl(key);
        return { deliveryUrl: url, objectKey: key, source: "signed_private_r2" };
      }
    } catch (e) {
      console.warn("[private-media] private R2 sign failed:", e);
    }
  }

  // Legacy Blob
  if (provider === "blob") {
    try {
      const { isPrivateBlobConfigured, privateBlobResolveDelivery } = await import(
        "@/lib/private-history-storage.server"
      );
      if (isPrivateBlobConfigured()) {
        const url = await privateBlobResolveDelivery(input.outputUrl || key);
        if (url) {
          return { deliveryUrl: url, objectKey: key, source: "blob" };
        }
      }
    } catch (e) {
      console.warn("[private-media] blob resolve failed:", e);
    }
    if (input.outputUrl?.startsWith("https://")) {
      return { deliveryUrl: input.outputUrl, objectKey: key, source: "blob" };
    }
  }

  // Safe https passthrough (provider CDN, etc.) after ownership check
  if (input.outputUrl?.startsWith("https://")) {
    return { deliveryUrl: input.outputUrl, objectKey: key, source: "passthrough" };
  }

  return { deliveryUrl: null, objectKey: key, source: "unavailable" };
}

export async function resolveGenerationsMediaBatch(opts: {
  supabase: SupabaseClient;
  userId: string;
  isAdmin?: boolean;
  generationIds?: string[];
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
    try {
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
    } catch (e) {
      console.warn("[private-media] row resolve denied/failed:", row.id, e);
      out.push({ id: row.id, deliveryUrl: null, objectKey: row.r2_object_key, type: row.type });
    }
  }
  return out;
}
