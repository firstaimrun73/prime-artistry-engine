/**
 * Send branded welcome email once per recipient (email_send_log template welcome).
 * Call after email confirmation. Does not gate on marketing_unsubscribed.
 */
import { createClient } from "@supabase/supabase-js";
import { welcomeEmail } from "@/emails/templates";
import { sendTemplateEmail } from "@/emails/send";

function admin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function sendWelcomeOnce(args: {
  to: string;
  name?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const to = args.to.trim().toLowerCase();
  if (!to) return { ok: false, error: "missing email" };
  const db = admin();
  if (db) {
    const { data } = await db
      .from("email_send_log")
      .select("id")
      .eq("recipient_email", to)
      .eq("template_name", "welcome")
      .eq("status", "sent")
      .limit(1);
    if (data && data.length > 0) return { ok: true, skipped: true };
  }
  const result = welcomeEmail({ name: args.name || "there" });
  const send = await sendTemplateEmail(to, result, {
    idempotencyKey: `welcome-${to}`,
  });
  if (db) {
    await db.from("email_send_log").insert({
      message_id: send.id || crypto.randomUUID(),
      template_name: "welcome",
      recipient_email: to,
      status: send.ok ? "sent" : "failed",
      error_message: send.error?.slice(0, 500) || null,
    });
  }
  return { ok: send.ok, error: send.error };
}
