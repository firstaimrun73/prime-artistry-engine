/**
 * Shared History retention preference helpers.
 *
 * Live contract (Claude SQL applied):
 *   should_retain_as_history(p_user_id, p_is_private)
 *   history_user_delete(p_generation_id)
 *   music_history_user_delete(p_track_id)
 *   generations.retained_as_history, deleted_at, storage_provider, …
 *
 * Prefs UI still reads/writes user_settings.history_enabled when present;
 * localStorage is a non-authoritative cache only.
 */

import { supabase } from "@/integrations/supabase/client";

export const HISTORY_PREFS_KEY = "motio2edit-history-prefs";

export type HistoryPrefs = {
  history_enabled: boolean;
  sensitive_mode: boolean;
};

export const DEFAULT_HISTORY_PREFS: HistoryPrefs = {
  history_enabled: true,
  sensitive_mode: false,
};

export function readLocalHistoryPrefs(): HistoryPrefs {
  try {
    const raw = localStorage.getItem(HISTORY_PREFS_KEY);
    if (!raw) return { ...DEFAULT_HISTORY_PREFS };
    return { ...DEFAULT_HISTORY_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_HISTORY_PREFS };
  }
}

export function writeLocalHistoryPrefs(prefs: HistoryPrefs): void {
  try {
    localStorage.setItem(HISTORY_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / private mode
  }
}

/** Client: load prefs — prefer user_settings when columns exist. */
export async function loadHistoryPrefs(userId: string): Promise<HistoryPrefs> {
  const local = readLocalHistoryPrefs();
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("history_enabled, sensitive_mode")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return local;
    return {
      history_enabled:
        typeof (data as { history_enabled?: unknown }).history_enabled === "boolean"
          ? Boolean((data as { history_enabled: boolean }).history_enabled)
          : local.history_enabled,
      sensitive_mode:
        typeof (data as { sensitive_mode?: unknown }).sensitive_mode === "boolean"
          ? Boolean((data as { sensitive_mode: boolean }).sensitive_mode)
          : local.sensitive_mode,
    };
  } catch {
    return local;
  }
}

/**
 * Client: persist prefs.
 * Writes localStorage always; upserts user_settings when columns exist.
 */
export async function saveHistoryPrefs(
  userId: string,
  prefs: HistoryPrefs,
): Promise<{ ok: boolean; backend: boolean; message?: string }> {
  writeLocalHistoryPrefs(prefs);
  try {
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        history_enabled: prefs.history_enabled,
        sensitive_mode: prefs.sensitive_mode,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>,
      { onConflict: "user_id" },
    );
    if (error) {
      console.warn("[history-retention] backend write:", error.message);
      return { ok: true, backend: false, message: error.message };
    }
    return { ok: true, backend: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: true, backend: false, message: msg };
  }
}

/**
 * Whether a generations row should appear in History UI.
 * Live: retained_as_history === true && deleted_at IS NULL.
 * Legacy rows (no new columns): treat as visible if not soft-hidden in metadata.
 */
export function isVisibleInHistory(row: {
  retained_as_history?: boolean | null;
  deleted_at?: string | null;
  metadata?: unknown;
}): boolean {
  if (row.deleted_at) return false;
  if (typeof row.retained_as_history === "boolean") {
    return row.retained_as_history === true;
  }
  // Legacy fallback until all rows have the column populated
  if (row.metadata && typeof row.metadata === "object") {
    const m = row.metadata as Record<string, unknown>;
    if (m.history_hidden === true) return false;
    if (m.retained_as_history === false) return false;
  }
  return true;
}

/**
 * History delete via RPC — queues media deletion; does not hard-delete from browser.
 */
export async function historyUserDelete(
  generationId: string,
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.rpc("history_user_delete", {
    p_generation_id: generationId,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function musicHistoryUserDelete(
  trackId: string,
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.rpc("music_history_user_delete", {
    p_track_id: trackId,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * @deprecated Use historyUserDelete. Kept as alias for any residual callers.
 */
export async function softHideFromHistory(
  generationId: string,
  _existingMetadata?: unknown,
): Promise<{ ok: boolean; message?: string }> {
  return historyUserDelete(generationId);
}

/**
 * Server-side decision — prefer RPC when available.
 */
export async function shouldRetainAsHistoryServer(args: {
  supabaseAdmin: { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
  userId: string;
  isPrivate?: boolean;
}): Promise<boolean> {
  try {
    const { data, error } = await args.supabaseAdmin.rpc("should_retain_as_history", {
      p_user_id: args.userId,
      p_is_private: args.isPrivate !== false,
    });
    if (error) {
      console.warn("[history-retention] should_retain_as_history:", error.message);
      return true;
    }
    if (data === false) return false;
    if (data === true) return true;
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      if (o.retain === false || o.should_retain === false) return false;
      return true;
    }
    return true;
  } catch {
    return true;
  }
}
