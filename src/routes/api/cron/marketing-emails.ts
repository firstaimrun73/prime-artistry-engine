/**
 * Marketing emails (plans nudge + promptless edits) — daily cron.
 * Auth: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY> or CRON_SECRET.
 *
 * Transactional emails are NOT handled here (always send, no opt-in).
 *
 * Eligibility (ALL existing users, not only new signups):
 *   - confirmed email (auth.users.email_confirmed_at set)
 *   - profiles.marketing_unsubscribed = false
 *   - non-null email on profile
 * Cap: 80 sends per run (Resend free = 100/day; leave headroom for transactional).
 * Dedup: email_send_log (same template, WINDOW_DAYS) — no unique index (OTP must repeat same day).
 * Order: oldest profiles first so backlog drains over several days.
 *
 * marketing_unsubscribed column already exists — no SQL from this handler.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { plansNudgeEmail, promptlessEditsEmail } from "@/emails/templates";
import { sendTemplateEmail } from "@/emails/send";

const WINDOW_DAYS = 4;
/** Resend free daily quota is 100; keep headroom for auth/transactional. */
const DAILY_SEND_CAP = 80;

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

        // Confirmed emails from Auth Admin API (paginated)
        const confirmedEmails = new Set<string>();
        {
          let page = 1;
          const perPage = 200;
          for (;;) {
            const { data, error: listErr } = await db.auth.admin.listUsers({ page, perPage });
            if (listErr) {
              return Response.json(
                { error: `listUsers failed: ${listErr.message}` },
                { status: 500 },
              );
            }
            const users = data?.users || [];
            for (const u of users) {
              if (u.email && u.email_confirmed_at) {
                confirmedEmails.add(u.email.toLowerCase());
              }
            }
            if (users.length < perPage) break;
            page += 1;
            if (page > 50) break; // safety
          }
        }

        // All eligible profiles: not unsubscribed, has email, oldest first
        const { data: candidates, error } = await db
          .from("profiles")
          .select("id, email, display_name, credits, marketing_unsubscribed, created_at")
          .eq("marketing_unsubscribed", false)
          .not("email", "is", null)
          .order("created_at", { ascending: true })
          .limit(500);

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        const eligible = (candidates || []).filter(
          (u) => u.email && confirmedEmails.has(String(u.email).toLowerCase()),
        );

        let sent = 0;
        let skipped = 0;
        let skippedUnconfirmed = (candidates || []).length - eligible.length;
        const templateName = "plansNudge";

        for (const u of eligible) {
          if (sent >= DAILY_SEND_CAP) break;
          if (!u.email) continue;

          // Dedup: same template already sent within WINDOW_DAYS
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
          else skipped++;
        }

        void promptlessEditsEmail;

        return Response.json({
          sent,
          skipped,
          skippedUnconfirmed,
          eligible: eligible.length,
          dailyCap: DAILY_SEND_CAP,
          windowDays: WINDOW_DAYS,
        });
      },
    },
  },
});
