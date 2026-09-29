/**
 * Shared server-side History persistence for new generations.
 * Calls should_retain_as_history RPC; sets retained_as_history + storage fields.
 * Does NOT migrate existing rows. Does NOT hard-delete.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  uploadPrivateHistoryMedia,
  isPrivateR2Configured,
  isPrivateBlobConfigured,
  type HistoryStorageProvider,
} from "@/lib/private-history-storage.server";

export type RetainDecision = {
  retain: boolean;
  storage_provider: HistoryStorageProvider | null;
};

/**
 * Call live RPC should_retain_as_history(p_user_id, p_is_private).
 * Accepts boolean or { retain, storage_provider } / jsonb shapes.
 */
export async function callShouldRetainAsHistory(
  supabaseAdmin: SupabaseClient,
  userId: string,
  isPrivate: boolean,
): Promise<RetainDecision> {
  try {
    const { data, error } = await supabaseAdmin.rpc("should_retain_as_history", {
      p_user_id: userId,
      p_is_private: isPrivate,
    });
    if (error) {
      console.warn("[history-persist] should_retain_as_history:", error.message);
      // Fail open for job tracking: retain with supabase until storage is ready
      return { retain: true, storage_provider: "supabase" };
    }
    if (data === false || data === true) {
      if (!data) return { retain: false, storage_provider: null };
      // Boolean true: choose provider from plan heuristics via env availability
      return chooseProviderFallback(isPrivate);
    }
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      const retain =
        o.retain === true ||
        o.should_retain === true ||
        o.retained_as_history === true ||
        (typeof o.retain === "undefined" && o.storage_provider != null);
      if (!retain && o.retain === false) {
        return { retain: false, storage_provider: null };
      }
      const sp = String(o.storage_provider ?? o.provider ?? "").toLowerCase();
      if (sp === "blob" || sp === "r2" || sp === "supabase") {
        return { retain: true, storage_provider: sp as HistoryStorageProvider };
      }
      if (retain) return chooseProviderFallback(isPrivate);
      return { retain: false, storage_provider: null };
    }
    return { retain: true, storage_provider: "supabase" };
  } catch (e) {
    console.warn("[history-persist] RPC exception:", e);
    return { retain: true, storage_provider: "supabase" };
  }
}

function chooseProviderFallback(isPrivate: boolean): RetainDecision {
  // FREE/private → Blob; PAID → R2 when configured
  if (isPrivateBlobConfigured() && !isPrivateR2Configured()) {
    return { retain: true, storage_provider: "blob" };
  }
  if (isPrivateR2Configured()) {
    return { retain: true, storage_provider: "r2" };
  }
  if (isPrivateBlobConfigured()) {
    return { retain: true, storage_provider: "blob" };
  }
  return { retain: true, storage_provider: "supabase" };
}

export type PersistGenerationInput = {
  supabaseAdmin: SupabaseClient;
  /** User-scoped client optional; admin preferred for insert */
  userId: string;
  type: "image" | "video" | "music";
  prompt: string | null;
  input_url?: string | null;
  output_url: string;
  status?: "success" | "failed" | "pending" | "processing";
  is_private?: boolean;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Optional bytes to copy into private storage when retaining */
  outputBytes?: Buffer | Uint8Array | null;
  outputContentType?: string;
  outputExt?: string;
  generationId?: string;
  /** Permanent R2 object key when already stored (e.g. finalizeMediaAsset storagePath). */
  r2ObjectKey?: string | null;
};

export type PersistGenerationResult = {
  id: string | null;
  retained_as_history: boolean;
  storage_provider: HistoryStorageProvider | null;
  r2_object_key: string | null;
  output_url: string;
  error?: string;
};

/**
 * Insert a generations row with live retention fields.
 * If retain + private provider + bytes provided, uploads to Blob/R2 first.
 */
export async function persistGenerationHistory(
  input: PersistGenerationInput,
): Promise<PersistGenerationResult> {
  const isPrivate = input.is_private !== false;
  const decision = await callShouldRetainAsHistory(
    input.supabaseAdmin,
    input.userId,
    isPrivate,
  );

  let outputUrl = input.output_url;
  let r2Key: string | null = input.r2ObjectKey?.replace(/^\//, "") ?? null;
  let storageProvider: HistoryStorageProvider | null = decision.retain
    ? decision.storage_provider
    : null;

  const genId = input.generationId ?? crypto.randomUUID();

  // If finalize already wrote to private user-media R2, capture permanent key and re-sign.
  try {
    const { extractR2ObjectKeyFromUrl, isPrivateUserObjectKey } = await import("@/lib/r2.server");
    const { isPrivateR2Configured, privateR2SignedGetUrl } = await import(
      "@/lib/private-history-storage.server"
    );
    const extracted =
      r2Key ||
      (outputUrl ? extractR2ObjectKeyFromUrl(outputUrl) : null);
    if (extracted && isPrivateUserObjectKey(extracted) && isPrivateR2Configured()) {
      r2Key = extracted;
      if (!storageProvider || storageProvider === "supabase") {
        storageProvider = "r2";
      }
      const signed = await privateR2SignedGetUrl(extracted);
      if (signed) outputUrl = signed;
    }
  } catch (e) {
    console.warn("[history-persist] private R2 key extract/sign skipped:", e);
  }

  if (
    decision.retain &&
    input.outputBytes &&
    (decision.storage_provider === "blob" || decision.storage_provider === "r2")
  ) {
    try {
      const up = await uploadPrivateHistoryMedia({
        provider: decision.storage_provider,
        userId: input.userId,
        generationId: genId,
        kind: "output",
        ext: input.outputExt || (input.type === "video" ? "mp4" : input.type === "music" ? "mp3" : "jpg"),
        body: input.outputBytes,
        contentType:
          input.outputContentType ||
          (input.type === "video"
            ? "video/mp4"
            : input.type === "music"
              ? "audio/mpeg"
              : "image/jpeg"),
      });
      storageProvider = up.storage_provider;
      r2Key = up.object_key;
      if (up.delivery_url) outputUrl = up.delivery_url;
    } catch (e) {
      console.error("[history-persist] private upload failed, keeping source URL:", e);
      storageProvider = "supabase";
      r2Key = null;
    }
  }

  const row: Record<string, unknown> = {
    id: genId,
    user_id: input.userId,
    type: input.type,
    prompt: input.prompt,
    input_url: input.input_url ?? null,
    output_url: outputUrl,
    status: input.status ?? "success",
    retained_as_history: decision.retain,
    is_private: isPrivate,
    storage_provider: storageProvider ?? "supabase",
    r2_object_key: r2Key,
    thumbnail_key: null,
    deleted_at: null,
  };
  if (input.title != null) row.title = input.title;
  if (input.metadata != null) row.metadata = input.metadata;

  const { data, error } = await input.supabaseAdmin
    .from("generations")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (error) {
    // Retry without new columns if schema cache lag
    if (/column|schema|retained_as_history|storage_provider/i.test(error.message)) {
      const legacy: Record<string, unknown> = {
        user_id: input.userId,
        type: input.type,
        prompt: input.prompt,
        input_url: input.input_url ?? null,
        output_url: outputUrl,
        status: input.status ?? "success",
      };
      if (input.title != null) legacy.title = input.title;
      if (input.metadata != null) legacy.metadata = input.metadata;
      const retry = await input.supabaseAdmin.from("generations").insert(legacy).select("id").maybeSingle();
      return {
        id: (retry.data as { id?: string } | null)?.id ?? null,
        retained_as_history: decision.retain,
        storage_provider: storageProvider,
        r2_object_key: r2Key,
        output_url: outputUrl,
        error: retry.error?.message ?? error.message,
      };
    }
    return {
      id: null,
      retained_as_history: decision.retain,
      storage_provider: storageProvider,
      r2_object_key: r2Key,
      output_url: outputUrl,
      error: error.message,
    };
  }

  return {
    id: (data as { id?: string } | null)?.id ?? genId,
    retained_as_history: decision.retain,
    storage_provider: storageProvider,
    r2_object_key: r2Key,
    output_url: outputUrl,
  };
}
