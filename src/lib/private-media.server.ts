/**
 * Shared private media delivery (server-only).
 *
 * fal.ai remains the generated-media origin. This resolver only returns a
 * delivery reference after application-level authorization.
 *
 * Mandatory checks (service role bypasses RLS — these are required):
 * 1. Authenticated caller (enforced by server-fn middleware)
 * 2. Ownership (generation.user_id === requester, unless admin)
 * 3. Not soft-deleted (deleted_at)
 * 4. Not past expires_at (free ~6h / paid retention)
 * 5. History entitlement for History routes (paid plan or admin)
 *
 * Never trust client-supplied ownership, plan, or expiry.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { isPaidPlan } from "@/lib/policy";
import { isAdminEmail } from "@/lib/admin-config";

export type MediaResolveInput = {
  generationId?: string;
  r2ObjectKey?: string | null;
  outputUrl?: string | null;
  storageProvider?: string | null;
  userId: string;
  ownerUserId: string;
  plan?: string | null;
  isAdmin?: boolean;
  deletedAt?: string | null;
  expiresAt?: string | null;
  retainedAsHistory?: boolean | null;
  requireHistoryEntitlement?: boolean;
};

export type MediaResolveResult = {
  deliveryUrl: string | null;
  objectKey: string | null;
  source: "signed_private_r2" | "blob" | "passthrough" | "unavailable";
};

export class MediaAccessError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "MediaAccessError";
    this.status = status;
  }
}

function assertOwner(ownerUserId: string, requesterId: string, isAdmin: boolean): void {
  if (isAdmin) return;
  if (ownerUserId !== requesterId) {
    throw new MediaAccessError("Not authorized to access this media.", 403);
  }
}

function assertNotDeleted(deletedAt?: string | null): void {
  if (deletedAt) {
    throw new MediaAccessError("This media is no longer available.", 404);
  }
}

function assertNotExpired(expiresAt?: string | null): void {
  if (!expiresAt) return;
  const t = Date.parse(expiresAt);
  if (Number.isFinite(t) && Date.now() > t) {
    throw new MediaAccessError("This media reference has expired.", 404);
  }
}

function assertHistoryEntitlement(
  plan: string | null | undefined,
  isAdmin: boolean,
  requireHistoryEntitlement: boolean,
): void {
  if (!requireHistoryEntitlement) return;
  if (isAdmin) return;
  if (!isPaidPlan(plan)) {
    throw new MediaAccessError(
      "History is locked. Upgrade your plan to access generation history media.",
      403,
    );
  }
}

function keyLooksLikeUserMedia(key: string | null | undefined): boolean {
  if (!key) return false;
  return key.replace(/^\//, "").startsWith("users/");
}

function looksLikeProviderUrl(url: string): boolean {
  return /fal\.media|fal\.ai|fal\.run|cdn\.fal|media\.fal/i.test(url);
}

export async function resolvePrivateMediaDelivery(
  input: MediaResolveInput,
): Promise<MediaResolveResult> {
  const isAdmin = !!input.isAdmin;
  const requireHistory = input.requireHistoryEntitlement !== false;

  assertOwner(input.ownerUserId, input.userId, isAdmin);
  assertNotDeleted(input.deletedAt);
  assertNotExpired(input.expiresAt);
  assertHistoryEntitlement(input.plan, isAdmin, requireHistory);

  const provider = (input.storageProvider ?? "").toLowerCase();

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

  if (input.outputUrl?.startsWith("https://")) {
    return { deliveryUrl: input.outputUrl, objectKey: key, source: "passthrough" };
  }

  return { deliveryUrl: null, objectKey: key, source: "unavailable" };
}

export async function loadMediaCallerContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ plan: string | null; isAdmin: boolean; email: string | null }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, plan")
    .eq("id", userId)
    .maybeSingle();
  const email = (profile?.email as string | undefined)?.trim().toLowerCase() ?? null;
  const plan = (profile?.plan as string | undefined) ?? "free";
  const isAdmin = !!email && isAdminEmail(email);
  return { plan, isAdmin, email };
}

export async function resolveGenerationsMediaBatch(opts: {
  supabase: SupabaseClient;
  userId: string;
  isAdmin?: boolean;
  plan?: string | null;
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
  if (!opts.isAdmin && !isPaidPlan(opts.plan)) {
    return [];
  }

  const selectCols =
    "id, type, output_url, r2_object_key, storage_provider, user_id, deleted_at, retained_as_history, expires_at, created_at";

  let q = opts.supabase
    .from("generations")
    .select(selectCols)
    .eq("user_id", opts.userId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);

  if (opts.generationIds && opts.generationIds.length > 0) {
    q = opts.supabase
      .from("generations")
      .select(selectCols)
      .eq("user_id", opts.userId)
      .in("id", opts.generationIds);
  }

  let { data, error } = await q;

  if (error && /column|expires_at|deleted_at|retained_as_history/i.test(error.message)) {
    const coreSelect = "id, type, output_url, r2_object_key, storage_provider, user_id, created_at";
    const fb =
      opts.generationIds && opts.generationIds.length > 0
        ? opts.supabase
            .from("generations")
            .select(coreSelect)
            .eq("user_id", opts.userId)
            .in("id", opts.generationIds)
        : opts.supabase
            .from("generations")
            .select(coreSelect)
            .eq("user_id", opts.userId)
            .order("created_at", { ascending: false })
            .limit(opts.limit ?? 100);
    const res = await fb;
    data = res.data as typeof data;
    error = res.error;
  }

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
    deleted_at?: string | null;
    retained_as_history?: boolean | null;
    expires_at?: string | null;
  }>) {
    if (row.deleted_at) continue;
    if (row.retained_as_history === false) continue;
    if (row.expires_at) {
      const t = Date.parse(row.expires_at);
      if (Number.isFinite(t) && Date.now() > t) continue;
    }
    if (!row.output_url) continue;

    try {
      const resolved = await resolvePrivateMediaDelivery({
        userId: opts.userId,
        ownerUserId: row.user_id,
        isAdmin: opts.isAdmin,
        plan: opts.plan,
        r2ObjectKey: row.r2_object_key,
        outputUrl: row.output_url,
        storageProvider: row.storage_provider,
        generationId: row.id,
        deletedAt: row.deleted_at ?? null,
        expiresAt: row.expires_at ?? null,
        retainedAsHistory: row.retained_as_history ?? true,
        requireHistoryEntitlement: true,
      });
      out.push({
        id: row.id,
        deliveryUrl: resolved.deliveryUrl,
        objectKey: resolved.objectKey,
        type: row.type,
      });
    } catch (e) {
      console.warn(
        "[private-media] row resolve denied:",
        row.id,
        e instanceof Error ? e.message : e,
      );
      out.push({ id: row.id, deliveryUrl: null, objectKey: null, type: row.type });
    }
  }
  return out;
}
