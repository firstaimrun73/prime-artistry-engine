import { createFileRoute } from "@tanstack/react-router";

/**
 * Secure cron: backfill expiry → annual grants → pre-expiry reminders → expire one-time plans.
 * Auth: Authorization: Bearer $CRON_SECRET  (or x-cron-secret header)
 * Vercel schedule: daily (0 3 * * *) — Hobby plan limit
 */
export const Route = createFileRoute("/api/cron/plan-lifecycle")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  const auth = request.headers.get("authorization") || "";
  const headerSecret = request.headers.get("x-cron-secret") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : headerSecret;
  if (!token || token !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const {
      syncPlanExpiryFromSubscriptions,
      expireDuePlans,
      grantDueAnnualMonthlyCredits,
      sendPendingRenewalReminders,
    } = await import("@/lib/plan-lifecycle.server");

    const sync = await syncPlanExpiryFromSubscriptions(db);
    const grants = await grantDueAnnualMonthlyCredits(db);
    const reminders = await sendPendingRenewalReminders(db);
    const expiry = await expireDuePlans(db);

    return new Response(
      JSON.stringify({
        ok: true,
        expiryBackfilled: sync.backfilled,
        annualGrants: grants.granted,
        annualGrantFailures: grants.failures,
        renewalRemindersSent: reminders.remindersSent,
        renewalReminderFailures: reminders.reminderFailures,
        expired: expiry.expired,
        emailsSent: expiry.emailsSent,
        emailFailures: expiry.emailFailures,
        at: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[cron/plan-lifecycle]", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
