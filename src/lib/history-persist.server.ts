/**
 * Shared server-side History persistence for new generations.
 *
 * retained_as_history is driven by user_settings.history_enabled
 * (missing row = History ON). is_private is orthogonal (private R2/Blob).
 *
 * Permanent media identity = storage_provider + r2_object_key.
 * output_url may be a short-lived delivery URL for immediate UI only.
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
 * Authoritative History toggle for a user.
 * Missing user_settings row → true (History ON).
 * Only explicit history_enabled === false turns History OFF.
 */
export async function readHistoryEnabled(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_settings")
      .select("history_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.warn("[history-persist] user_settings read:", error.message);
      return true;
    }
    if (!data) return true;
    if ((data as { history_enabled?: unknown }).history_enabled === false) {
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[history-persist] user_settings exception:", e);
    return true;
  }
}

function parseRetainFlag(value: unknown): boolean | null {
  if (value === true || value === 1 || value === "true" || value === "t") return true;
  if (value === false || value === 0 || value === "false" || value === "f") return false;
  return null;
}

/**
 * Decide whether to retain + which storage_provider to prefer.
 *
 * Primary retain source: user_settings.history_enabled (default ON).
 * RPC should_retain_as_history is used for storage_provider hints only when retain=true.
 * is_private NEVER forces retain=false.
 */
export async function callShouldRetainAsHistory(
  supabaseAdmin: SupabaseClient,
  userId: string,
  isPrivate: boolean,
): Promise<RetainDecision> {
  const historyEnabled = await readHistoryEnabled(supabaseAdmin, userId);
  if (!historyEnabled) {
    return { retain: false, storage_provider: null };
  }

  // History ON — pick storage provider (plan / RPC / env)
  try {
    const { data, error } = await supabaseAdmin.rpc("should_retain_as_history", {
      p_user_id: userId,
      p_is_private: isPrivate,
    });
    if (!error && data != null) {
      // Boolean-only legacy
      if (data === true) return chooseProviderFallback(isPrivate);
      if (data === false) {
        // RPC said false but our authoritative toggle is ON — do not drop History
        // solely because of a private-media flag in an old RPC revision.
        console.warn(
          "[history-persist] RPC returned false while history_enabled=ON; retaining with fallback provider",
        );
        return chooseProviderFallback(isPrivate);
      }
      if (typeof data === "object") {
        const o = data as Record<string, unknown>;
        const rpcRetain = parseRetainFlag(o.retain ?? o.should_retain ?? o.retained_as_history);
        // If RPC explicitly says do not retain AND we already checked toggle ON,
        // still retain (toggle is source of truth). Use RPC only for provider.
        const sp = String(o.storage_provider ?? o.provider ?? "").toLowerCase();
        if (sp === "blob" || sp === "r2" || sp === "supabase") {
          return { retain: true, storage_provider: sp as HistoryStorageProvider };
        }
        if (rpcRetain === false) {
          console.warn(
            "[history-persist] RPC retain=false with history_enabled=ON; using fallback provider",
          );
        }
        return chooseProviderFallback(isPrivate);
      }
    } else if (error) {
      console.warn("[history-persist] should_retain_as_history:", error.message);
    }
  } catch (e) {
    console.warn("[history-persist] RPC exception:", e);
  }

  return chooseProviderFallback(isPrivate);
}

function chooseProviderFallback(_isPrivate: boolean): RetainDecision {
  // Prefer R2 when configured (paid/admin path typically); Blob when only Blob is set.
  // Actual Free vs Paid routing for *bytes* is also enforced at ingest/finalize.
  if (isPrivateR2Configured() && isPrivateBlobConfigured()) {
    // Both available — prefer R2 for durable paid path; Free ingest still uses Blob upstream.
    return { retain: true, storage_provider: "r2" };
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
  userId: string;
  type: "image" | "video" | "music";
  prompt: string | null;
  input_url?: string | null;
  output_url: string;
  status?: "success" | "failed" | "pending" | "processing";
  /** Private media flag — independent of History retention. */
  is_private?: boolean;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
  outputBytes?: Buffer | Uint8Array | null;
  outputContentType?: string;
  outputExt?: string;
  generationId?: string;
  /** Permanent object key (R2 or Blob pathname). */
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

  // Capture permanent private-user key; refresh short-lived delivery URL for immediate UI only.
  try {
    const { extractR2ObjectKeyFromUrl, isPrivateUserObjectKey } = await import("@/lib/r2.server");
    const { isPrivateR2Configured, privateR2SignedGetUrl } = await import(
      "@/lib/private-history-storage.server"
    );
    const extracted =
      r2Key || (outputUrl ? extractR2ObjectKeyFromUrl(outputUrl) : null);
    if (extracted && isPrivateUserObjectKey(extracted) && isPrivateR2Configured()) {
      r2Key = extracted;
      if (!storageProvider || storageProvider === "supabase") {
        storageProvider = "r2";
      }
      // Short-lived signed URL for the generate response / first paint only.
      // Permanent identity remains r2_object_key; History re-signs on load.
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
        ext:
          input.outputExt ||
          (input.type === "video" ? "mp4" : input.type === "music" ? "mp3" : "jpg"),
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

  // When History is OFF we still insert a job row for tracking, but not retained.
  // When History is ON, retained_as_history=true even if is_private=true.
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
    storage_provider: storageProvider ?? (decision.retain ? "supabase" : null),
    r2_object_key: r2Key,
    thumbnail_key: null,
    deleted_at: null,
  };
  if (input.title != null) row.title = input.title;
  if (input.metadata != null) {
    row.metadata = {
      ...input.metadata,
      history_saved: decision.retain,
    };
  }

  const { data, error } = await input.supabaseAdmin
    .from("generations")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (error) {
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
      const retry = await input.supabaseAdmin
        .from("generations")
        .insert(legacy)
        .select("id")
        .maybeSingle();
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

  console.log(
    "[history-persist] saved id=%s retain=%s provider=%s key=%s private=%s",
    (data as { id?: string } | null)?.id ?? genId,
    decision.retain,
    storageProvider,
    r2Key ? "yes" : "no",
    isPrivate,
  );

  return {
    id: (data as { id?: string } | null)?.id ?? genId,
    retained_as_history: decision.retain,
    storage_provider: storageProvider,
    r2_object_key: r2Key,
    output_url: outputUrl,
  };
}
