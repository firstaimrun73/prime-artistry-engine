/**
 * Shared private media delivery (server-only).
 *
 * PAID/ADMIN (storage_provider=r2):
 *   motio2edit-user-media via private-history-storage (CLOUDFLARE_R2_USER_*)
 * FREE (storage_provider=blob):
 *   private Vercel Blob (BLOB_READ_WRITE_TOKEN)
 *
 * Never signs paid user keys with the primary public/sample R2 (motio2edit-media).
 * Never returns public r2.dev URLs for users/**.
 * Admin is NOT a cross-user media bypass.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type MediaResolveInput = {
  generationId?: string;
  r2ObjectKey?: string | null;
  outputUrl?: string | null;
  storageProvider?: string | null;
  userId: string;
  /** Row owner — must match authenticated user. */
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

/**
 * Resolve a browser-loadable temporary URL for private user media.
 */
export async function resolvePrivateMediaDelivery(
  input: MediaResolveInput & { isAdmin?: boolean },
): Promise<MediaResolveResult> {
  assertOwner(input.ownerUserId, input.userId, !!input.isAdmin);

  const provider = (input.storageProvider ?? "").toLowerCase();
  let key = (input.r2ObjectKey && input.r2ObjectKey.replace(/^\//, "")) || null;

  if (!key && input.outputUrl) {
    try {
      const { extractR2ObjectKeyFromUrl } = await import("@/lib/r2.server");
      key = extractR2ObjectKeyFromUrl(input.outputUrl);
    } catch {
      /* ignore */
    }
  }

  // ── Private user-media R2 (paid/admin) ────────────────────────────────────
  if ((provider === "r2" || keyLooksLikeUserMedia(key)) && key && provider !== "blob") {
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

  // ── Private Blob (free History) ───────────────────────────────────────────
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
    // Owner-scoped fallback: return stored https URL only after ownership assert
    if (input.outputUrl?.startsWith("https://")) {
      return { deliveryUrl: input.outputUrl, objectKey: key, source: "blob" };
    }
  }

  // ── Safe passthrough: temporary provider/CDN URLs only ────────────────────
  if (input.outputUrl?.startsWith("https://")) {
    try {
      const { extractR2ObjectKeyFromUrl } = await import("@/lib/r2.server");
      const extracted = extractR2ObjectKeyFromUrl(input.outputUrl);
      if (extracted && keyLooksLikeUserMedia(extracted)) {
        try {
          const { isPrivateR2Configured, privateR2SignedGetUrl } = await import(
            "@/lib/private-history-storage.server"
          );
          if (isPrivateR2Configured()) {
            const url = await privateR2SignedGetUrl(extracted);
            return { deliveryUrl: url, objectKey: extracted, source: "signed_private_r2" };
          }
        } catch {
          /* unavailable */
        }
        return { deliveryUrl: null, objectKey: extracted, source: "unavailable" };
      }
    } catch {
      /* ignore */
    }
    return { deliveryUrl: input.outputUrl, objectKey: key, source: "passthrough" };
  }

  return { deliveryUrl: null, objectKey: key, source: "unavailable" };
}

/**
 * Batch-resolve delivery URLs for History rows owned by the requester.
 */
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
