/**
 * Shared History retention preference helpers.
 *
 * Backend source of truth (when columns exist):
 *   public.user_settings.history_enabled  boolean  (default true)
 *   public.user_settings.sensitive_mode   boolean  (default false)
 *
 * Until those columns are applied in Supabase, client falls back to
 * localStorage key "motio2edit-history-prefs" so the UI remains usable.
 * Server-side generation pipelines must call shouldRetainAsHistoryServer
 * only after the SQL migration is live — do not invent columns.
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

/** Whether a generations row should appear in History UI. */
export function isVisibleInHistory(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return true;
  const m = metadata as Record<string, unknown>;
  if (m.history_hidden === true) return false;
  if (m.retained_as_history === false) return false;
  return true;
}

/**
 * Soft-hide a generation from History without deleting the job row.
 * Uses existing jsonb `metadata` only (no invented columns).
 */
export async function softHideFromHistory(
  generationId: string,
  existingMetadata: unknown,
): Promise<{ ok: boolean; message?: string }> {
  const base =
    existingMetadata && typeof existingMetadata === "object"
      ? { ...(existingMetadata as Record<string, unknown>) }
      : {};
  const next = { ...base, history_hidden: true, history_hidden_at: new Date().toISOString() };
  const { error } = await supabase
    .from("generations")
    .update({ metadata: next })
    .eq("id", generationId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Server-side decision helper (call from generation pipelines after SQL is live).
 * Returns false when History Save is OFF or sensitive_mode is ON.
 * When columns are missing, defaults to retain (true) so job tracking is not broken.
 */
export async function shouldRetainAsHistoryServer(args: {
  supabaseAdmin: { from: (t: string) => any };
  userId: string;
}): Promise<boolean> {
  try {
    const { data, error } = await args.supabaseAdmin
      .from("user_settings")
      .select("history_enabled, sensitive_mode")
      .eq("user_id", args.userId)
      .maybeSingle();
    if (error || !data) return true;
    if (data.sensitive_mode === true) return false;
    if (data.history_enabled === false) return false;
    return true;
  } catch {
    return true;
  }
}
