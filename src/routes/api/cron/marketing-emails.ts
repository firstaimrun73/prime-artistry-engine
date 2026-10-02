/**
 * Marketing emails (plans nudge + promptless edits) — every 4 days.
 * Auth: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY> or CRON_SECRET.
 *
 * Transactional emails are NOT handled here (always send, no opt-in).
 *
 * REQUIRED SQL (apply in Supabase — do not auto-migrate):
 *
 *   alter table public.profiles
 *     add column if not exists marketing_unsubscribed boolean not null default false;
 *
 *   -- email_send_log already exists for Lovable queue; ensure unique send window:
 *   create unique index if not exists email_send_log_dedup
 *     on public.email_send_log (recipient_email, template_name, (created_at::date));
 *
 * If columns/tables are missing, this handler returns 503 with the SQL text.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { plansNudgeEmail, promptlessEditsEmail } from "@/emails/templates";
import { sendTemplateEmail } from "@/emails/send";

const WINDOW_DAYS = 4;

function authorized(request: Request): boolean {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const cron = process.env.CRON_SECRET || "";
  return Boolean(token && (token === service || token === cron));
}

export const Route = createFileRoute("/api/cron/marketing-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !key) {
          return Response.json({ error: "Missing Supabase env" }, { status: 500 });
        }

        const db = createClient(supabaseUrl, key);
        const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

        // Probe optional column — if missing, stop with SQL.
        const probe = await db.from("profiles").select("id, email, display_name, credits, marketing_unsubscribed").limit(1);
        if (probe.error && /marketing_unsubscribed/i.test(probe.error.message)) {
          return Response.json(
            {
              error: "Missing marketing_unsubscribed column",
              sql: "alter table public.profiles add column if not exists marketing_unsubscribed boolean not null default false;",
            },
            { status: 503 },
          );
        }

        const { data: users, error } = await db
          .from("profiles")
          .select("id, email, display_name, credits, marketing_unsubscribed")
          .eq("marketing_unsubscribed", false)
          .not("email", "is", null)
          .limit(200);

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        let sent = 0;
        let skipped = 0;
        const templateName = "plansNudge"; // alternate with promptless on even weeks if desired

        for (const u of users || []) {
          if (!u.email) continue;

          // Dedup: skip if same template sent within WINDOW_DAYS
          const { data: recent } = await db
            .from("email_send_log")
            .select("id")
            .eq("recipient_email", u.email)
            .eq("template_name", templateName)
            .eq("status", "sent")
            .gte("created_at", since)
            .limit(1);

          if (recent && recent.length > 0) {
            skipped++;
            continue;
          }

          const unsub = `https://motio2edit.com/settings?unsubscribe=1`;
          const result = plansNudgeEmail({
            name: (u.display_name || "there").split(" ")[0],
            credits_left: String(u.credits ?? 0),
            unsubscribe_url: unsub,
          });

          const send = await sendTemplateEmail(u.email, result, {
            marketing: true,
            unsubscribeUrl: unsub,
            idempotencyKey: `mkt-${templateName}-${u.id}-${new Date().toISOString().slice(0, 10)}`,
          });

          await db.from("email_send_log").insert({
            message_id: send.id || crypto.randomUUID(),
            template_name: templateName,
            recipient_email: u.email,
            status: send.ok ? "sent" : "failed",
            error_message: send.error?.slice(0, 500) || null,
          });

          if (send.ok) sent++;
        }

        // Optional second template (promptless) on alternate cycle — same dedup rules
        void promptlessEditsEmail;

        return Response.json({ sent, skipped, windowDays: WINDOW_DAYS });
      },
    },
  },
});
