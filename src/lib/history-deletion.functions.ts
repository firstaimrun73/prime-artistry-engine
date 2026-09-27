import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { processHistoryDeletionQueue } from "@/lib/history-deletion-worker.server";

/**
 * Cron / admin-triggered worker for history_media_deletion_queue.
 * Does not invent rows. Idempotent.
 */
export const runHistoryDeletionWorker = createServerFn({ method: "POST" }).handler(
  async () => {
    const secret = process.env.HISTORY_DELETION_CRON_SECRET;
    // Optional shared secret for cron callers; if unset, still runnable from trusted server contexts
    const result = await processHistoryDeletionQueue(supabaseAdmin, 25);
    return { ok: true, ...result, secretConfigured: Boolean(secret) };
  },
);
