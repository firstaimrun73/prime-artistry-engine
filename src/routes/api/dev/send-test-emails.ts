/**
 * Dev-only: send all email templates to TEST_EMAIL.
 * POST /api/dev/send-test-emails
 * Auth: Authorization: Bearer <CRON_SECRET>
 * Disabled in production unless ALLOW_TEST_EMAILS=1.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  verifyEmail,
  loginCodeEmail,
  resetPasswordEmail,
  passwordChangedEmail,
  loginEmailChangedEmail,
  newSignInEmail,
  welcomeEmail,
  planPurchasedEmail,
  promptlessEditsEmail,
  plansNudgeEmail,
} from "@/emails/templates";
import { sendTemplateEmail } from "@/emails/send";
import { marketingUnsubscribeUrl } from "@/lib/unsubscribe-token";

function allowed(request: Request): boolean {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_TEST_EMAILS !== "1") {
    return false;
  }
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const cron = process.env.CRON_SECRET || "";
  return Boolean(token && cron && token === cron);
}

export const Route = createFileRoute("/api/dev/send-test-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!allowed(request)) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
        const to = process.env.TEST_EMAIL;
        if (!to) return Response.json({ error: "TEST_EMAIL not set" }, { status: 500 });
        const unsub = marketingUnsubscribeUrl(to);
        const jobs = [
          { name: "verifyEmail", result: verifyEmail({ name: "Test", otp: "123456" }) },
          { name: "loginCode", result: loginCodeEmail({ email: to, otp: "654321" }) },
          { name: "resetPassword", result: resetPasswordEmail({ email: to, otp: "111222", reset_url: "https://motio2edit.com/login" }) },
          { name: "passwordChanged", result: passwordChangedEmail({ name: "Test", time: new Date().toUTCString(), device: "Test Device" }) },
          { name: "loginEmailChanged", result: loginEmailChangedEmail({ old_email: "old@example.com", new_email: to }) },
          { name: "newSignIn", result: newSignInEmail({ device: "Chrome", location: "Test", time: new Date().toUTCString() }) },
          { name: "welcome", result: welcomeEmail({ name: "Test" }) },
          { name: "planPurchased", result: planPurchasedEmail({ name: "Test", plan_name: "Pro", amount: "$29.99", credits_added: "2500", expiry: "—", order_id: "TEST-1" }) },
          { name: "promptlessEdits", marketing: true as const, result: promptlessEditsEmail({ unsubscribe_url: unsub }) },
          { name: "plansNudge", marketing: true as const, result: plansNudgeEmail({ name: "Test", credits_left: "40", unsubscribe_url: unsub }) },
        ];
        const results: { name: string; ok: boolean; error?: string }[] = [];
        for (const j of jobs) {
          try {
            const send = await sendTemplateEmail(to, j.result, {
              marketing: "marketing" in j && j.marketing,
              unsubscribeUrl: "marketing" in j && j.marketing ? unsub : undefined,
              idempotencyKey: `test-${j.name}-${Date.now()}`,
            });
            results.push({ name: j.name, ok: send.ok, error: send.error });
          } catch (e) {
            results.push({ name: j.name, ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return Response.json({ to, results });
      },
    },
  },
});
