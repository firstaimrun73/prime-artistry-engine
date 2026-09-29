/**
 * Processes history_media_deletion_queue rows.
 * Idempotent: safe to re-run. Does not invent queue rows.
 * Server-only.
 *
 * Paid user media lives in motio2edit-user-media (private R2).
 * Free History lives in private Vercel Blob.
 * Never delete against the public/sample primary R2 bucket.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  privateR2DeleteObject,
  privateBlobDeleteObject,
  isPrivateR2Configured,
  isPrivateBlobConfigured,
} from "@/lib/private-history-storage.server";

type QueueRow = {
  id?: string;
  user_id: string;
  source_table: string;
  source_id: string;
  storage_provider: string | null;
  object_key: string | null;
  status: string;
  attempt_count: number | null;
  last_error: string | null;
  created_at: string;
  processed_at: string | null;
};

async function deleteObject(
  provider: string | null,
  objectKey: string | null,
): Promise<void> {
  if (!objectKey) return;
  const key = objectKey.replace(/^\//, "");
  const p = (provider || "").toLowerCase();

  // Explicit provider wins
  if (p === "blob") {
    if (!isPrivateBlobConfigured()) {
      throw new Error("Private Blob not configured; cannot delete object.");
    }
    await privateBlobDeleteObject(key);
    return;
  }

  if (p === "r2" || key.startsWith("users/")) {
    // Paid/admin private user-media bucket only — never primary sample R2
    if (!isPrivateR2Configured()) {
      throw new Error("Private R2 not configured; cannot delete object.");
    }
    await privateR2DeleteObject(key);
    return;
  }

  // supabase / unknown: nothing to delete from private stores
}

/**
 * Claim and process up to `limit` pending queue rows using service role client.
 */
export async function processHistoryDeletionQueue(
  supabaseAdmin: SupabaseClient,
  limit = 20,
): Promise<{ processed: number; failed: number }> {
  const { data: rows, error } = await supabaseAdmin
    .from("history_media_deletion_queue")
    .select("*")
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[history-deletion-worker] fetch:", error.message);
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const row of (rows ?? []) as QueueRow[]) {
    const idFilter = row.id
      ? { id: row.id }
      : {
          source_table: row.source_table,
          source_id: row.source_id,
          created_at: row.created_at,
        };

    try {
      await deleteObject(row.storage_provider, row.object_key);
      const attempts = (row.attempt_count ?? 0) + 1;
      await supabaseAdmin
        .from("history_media_deletion_queue")
        .update({
          status: "done",
          attempt_count: attempts,
          last_error: null,
          processed_at: new Date().toISOString(),
        })
        .match(idFilter as Record<string, string>);
      processed += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const attempts = (row.attempt_count ?? 0) + 1;
      await supabaseAdmin
        .from("history_media_deletion_queue")
        .update({
          status: "failed",
          attempt_count: attempts,
          last_error: msg.slice(0, 500),
          processed_at: new Date().toISOString(),
        })
        .match(idFilter as Record<string, string>);
      failed += 1;
      console.error("[history-deletion-worker] row failed:", msg);
    }
  }

  return { processed, failed };
}
