/**
 * Shared History retention preference helpers.
 *
 * user_settings.history_enabled is the server source of truth.
 * Missing row = History ON.
 * localStorage is a non-authoritative UI cache only.
 *
 * Visibility also respects generations.expires_at / deleted_at / retained_as_history
 * (Claude Supabase retention architecture — do not reimplement DB logic here).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

/** Client: load prefs — prefer user_settings; missing row = ON (not local false). */
export async function loadHistoryPrefs(userId: string): Promise<HistoryPrefs> {
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("history_enabled, sensitive_mode")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.warn("[history-retention] load:", error.message);
      return { ...DEFAULT_HISTORY_PREFS };
    }
    if (!data) {
      // No row yet → product default History ON (ignore stale localStorage OFF)
      return { ...DEFAULT_HISTORY_PREFS };
    }
    return {
      history_enabled:
        (data as { history_enabled?: unknown }).history_enabled === false ? false : true,
      sensitive_mode:
        (data as { sensitive_mode?: unknown }).sensitive_mode === true ? true : false,
    };
  } catch {
    return { ...DEFAULT_HISTORY_PREFS };
  }
}

const prefsSchema = z.object({
  history_enabled: z.boolean(),
  sensitive_mode: z.boolean().optional(),
});

/**
 * Server: upsert user_settings for the authenticated user only (service role).
 * Fixes client RLS upsert failures that left user_settings empty in production.
 */
export const saveHistoryPrefsServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => prefsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      user_id: userId,
      history_enabled: data.history_enabled,
      sensitive_mode: data.sensitive_mode ?? false,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin.from("user_settings").upsert(payload, {
      onConflict: "user_id",
    });
    if (error) {
      console.error("[history-retention] server upsert failed:", error.message);
      throw new Error(error.message || "Could not save History preference.");
    }
    return { ok: true as const, backend: true as const };
  });

/**
 * Client: persist prefs.
 * Always updates local cache; prefers server upsert (authoritative).
 */
export async function saveHistoryPrefs(
  userId: string,
  prefs: HistoryPrefs,
): Promise<{ ok: boolean; backend: boolean; message?: string }> {
  writeLocalHistoryPrefs(prefs);

  // Prefer server path (service role, scoped to auth userId)
  try {
    const res = await saveHistoryPrefsServer({
      data: {
        history_enabled: prefs.history_enabled,
        sensitive_mode: prefs.sensitive_mode,
      },
    });
    if (res?.ok) return { ok: true, backend: true };
  } catch (e) {
    console.warn("[history-retention] server save failed, trying client upsert:", e);
  }

  // Fallback: direct client upsert (requires RLS allow)
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
      return { ok: false, backend: false, message: error.message };
    }
    return { ok: true, backend: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, backend: false, message: msg };
  }
}

/**
 * Whether a generations row should appear in History UI.
 * Respects deleted_at, retained_as_history, and expires_at (Claude retention).
 */
export function isVisibleInHistory(row: {
  retained_as_history?: boolean | null;
  deleted_at?: string | null;
  expires_at?: string | null;
  metadata?: unknown;
  output_url?: string | null;
}): boolean {
  if (row.deleted_at) return false;
  if (row.expires_at) {
    const t = Date.parse(row.expires_at);
    if (Number.isFinite(t) && Date.now() > t) return false;
  }
  // Hide fake/null-output tracking rows
  if (row.output_url != null && String(row.output_url).trim() === "") return false;
  if (typeof row.retained_as_history === "boolean") {
    return row.retained_as_history === true;
  }
  if (row.metadata && typeof row.metadata === "object") {
    const m = row.metadata as Record<string, unknown>;
    if (m.history_hidden === true) return false;
    if (m.retained_as_history === false) return false;
  }
  return true;
}

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

/** @deprecated Use historyUserDelete. */
export async function softHideFromHistory(
  generationId: string,
  _existingMetadata?: unknown,
): Promise<{ ok: boolean; message?: string }> {
  return historyUserDelete(generationId);
}

/**
 * Server-side retain decision — matches history-persist (toggle default ON).
 */
export async function shouldRetainAsHistoryServer(args: {
  supabaseAdmin: {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          maybeSingle: () => Promise<{ data: { history_enabled?: boolean } | null; error: { message: string } | null }>;
        };
      };
    };
    rpc: (
      fn: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  userId: string;
  isPrivate?: boolean;
}): Promise<boolean> {
  try {
    const { data, error } = await args.supabaseAdmin
      .from("user_settings")
      .select("history_enabled")
      .eq("user_id", args.userId)
      .maybeSingle();
    if (error) {
      console.warn("[history-retention] shouldRetain settings:", error.message);
      return true;
    }
    if (!data) return true;
    if (data.history_enabled === false) return false;
    return true;
  } catch {
    return true;
  }
}
