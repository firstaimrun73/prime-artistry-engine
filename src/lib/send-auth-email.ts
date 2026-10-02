/**
 * Map Supabase Auth Send Email hook → branded Resend templates.
 * Never gates on marketing_unsubscribed. Never logs OTP/token.
 */
import { createClient } from "@supabase/supabase-js";
import {
  verifyEmail,
  loginCodeEmail,
  resetPasswordEmail,
  loginEmailChangedEmail,
  passwordChangedEmail,
  newSignInEmail,
  welcomeEmail,
  type EmailResult,
} from "@/emails/templates";
import { sendTemplateEmail } from "@/emails/send";

export type AuthEmailData = {
  token?: string;
  token_hash?: string;
  redirect_to?: string;
  email_action_type: string;
  site_url?: string;
  token_new?: string;
  token_hash_new?: string;
  old_email?: string;
  /** present on some payloads for secure email change */
  email_new?: string;
};

export type AuthUser = {
  id?: string;
  email?: string;
  new_email?: string;
  email_new?: string;
  user_metadata?: Record<string, unknown>;
};

function adminClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function displayName(user: AuthUser): string {
  const meta = user.user_metadata || {};
  const n =
    (meta.display_name as string) ||
    (meta.full_name as string) ||
    (meta.name as string) ||
    "";
  if (n) return String(n).split(" ")[0];
  const email = user.email || "";
  return email.split("@")[0] || "there";
}

/** Build Supabase verify URL from token_hash + type + redirect_to */
export function buildVerifyUrl(opts: {
  tokenHash: string;
  type: string;
  redirectTo?: string;
  siteUrl?: string;
}): string {
  const base =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    opts.siteUrl ||
    "";
  const u = new URL(`${base.replace(/\/+$/, "")}/auth/v1/verify`);
  u.searchParams.set("token", opts.tokenHash);
  u.searchParams.set("type", opts.type);
  if (opts.redirectTo) u.searchParams.set("redirect_to", opts.redirectTo);
  return u.toString();
}

export async function logEmailSend(args: {
  templateName: string;
  recipientEmail: string;
  status: "sent" | "failed" | "skipped";
  errorMessage?: string | null;
  messageId?: string | null;
}): Promise<void> {
  const db = adminClient();
  if (!db) return;
  try {
    await db.from("email_send_log").insert({
      message_id: args.messageId || crypto.randomUUID(),
      template_name: args.templateName,
      recipient_email: args.recipientEmail,
      status: args.status,
      error_message: args.errorMessage ? args.errorMessage.slice(0, 500) : null,
    });
  } catch (e) {
    console.error("[auth-email] log failed:", e);
  }
}

/** Rate limit: max 5 auth OTP sends per email (or IP key) in 10 minutes. */
export async function isAuthEmailRateLimited(key: string): Promise<boolean> {
  const db = adminClient();
  if (!db) return false;
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  try {
    let q = db
      .from("email_send_log")
      .select("id", { count: "exact", head: true })
      .eq("recipient_email", key)
      .gte("created_at", since);
    // Email keys: OTP-style templates only. IP keys (ip:…): any row for that key.
    if (!key.startsWith("ip:")) {
      q = q.in("template_name", [
        "verifyEmail",
        "loginCode",
        "resetPassword",
        "loginEmailChanged",
        "reauthentication",
        "auth_hook",
      ]);
    }
    const { count } = await q;
    return (count ?? 0) >= 5;
  } catch {
    return false;
  }
}

async function deliver(
  to: string,
  templateName: string,
  result: EmailResult,
): Promise<void> {
  const send = await sendTemplateEmail(to, result, {
    idempotencyKey: `auth-${templateName}-${to}-${Date.now() % 100000}`,
  });
  await logEmailSend({
    templateName,
    recipientEmail: to,
    status: send.ok ? "sent" : "failed",
    errorMessage: send.error,
    messageId: send.id,
  });
  if (!send.ok) {
    throw new Error(send.error || "Failed to send email");
  }
}

/**
 * Handle one Supabase Send Email hook invocation.
 * Throws on hard failure (caller maps to hook error JSON).
 */
export async function handleAuthSendEmailHook(payload: {
  user: AuthUser;
  email_data: AuthEmailData;
}): Promise<void> {
  const user = payload.user;
  const d = payload.email_data;
  const action = (d.email_action_type || "").toLowerCase();
  const email = (user.email || "").trim();
  if (!email && action !== "email_change") {
    throw new Error("Missing user email");
  }

  const name = displayName(user);
  const otp = d.token || "";
  const tokenHash = d.token_hash || "";
  const redirectTo = d.redirect_to || "https://motio2edit.com";

  // Rate limit by recipient for OTP-style emails
  const rateKey = email || d.old_email || "unknown";
  if (
    ["signup", "invite", "magiclink", "recovery", "email_change", "reauthentication"].includes(
      action,
    )
  ) {
    if (await isAuthEmailRateLimited(rateKey)) {
      throw new Error("Too many verification emails. Please wait a few minutes and try again.");
    }
  }

  switch (action) {
    case "signup":
    case "invite": {
      await deliver(
        email,
        "verifyEmail",
        verifyEmail({ name, otp }),
      );
      return;
    }
    case "magiclink":
    case "reauthentication": {
      await deliver(email, "loginCode", loginCodeEmail({ email, otp }));
      return;
    }
    case "recovery": {
      const resetUrl = buildVerifyUrl({
        tokenHash,
        type: "recovery",
        redirectTo,
        siteUrl: d.site_url,
      });
      await deliver(
        email,
        "resetPassword",
        resetPasswordEmail({ email, otp, reset_url: resetUrl }),
      );
      return;
    }
    case "email_change": {
      const newEmail =
        (user.new_email as string) ||
        (user.email_new as string) ||
        (d as { email_new?: string }).email_new ||
        "";
      const oldEmail = d.old_email || email;
      const hasDual = Boolean(d.token && d.token_new && d.token_hash && d.token_hash_new);

      if (hasDual && newEmail) {
        await deliver(
          oldEmail,
          "loginEmailChanged",
          loginEmailChangedEmail({
            old_email: oldEmail,
            new_email: newEmail,
          }),
        );
        await deliver(
          newEmail,
          "verifyEmail",
          verifyEmail({ name, otp: d.token_new || otp }),
        );
      } else {
        const target = newEmail || email;
        await deliver(
          target,
          "loginEmailChanged",
          loginEmailChangedEmail({
            old_email: oldEmail || email,
            new_email: target,
          }),
        );
      }
      return;
    }
    case "password_changed_notification":
    case "password_changed": {
      await deliver(
        email,
        "passwordChanged",
        passwordChangedEmail({
          name,
          time: new Date().toUTCString(),
          device: "Unknown",
        }),
      );
      return;
    }
    case "email_changed_notification": {
      await deliver(
        email,
        "loginEmailChanged",
        loginEmailChangedEmail({
          old_email: d.old_email || "previous",
          new_email: email,
        }),
      );
      return;
    }
    default: {
      if (otp) {
        await deliver(email, "loginCode", loginCodeEmail({ email, otp }));
        return;
      }
      console.warn("[auth-email] unhandled action:", action);
      return;
    }
  }
}

/** App-triggered: after successful password update */
export async function sendPasswordChangedNotice(args: {
  to: string;
  name?: string;
  device?: string;
}): Promise<void> {
  const result = passwordChangedEmail({
    name: args.name || "there",
    time: new Date().toUTCString(),
    device: args.device || "Unknown",
  });
  await deliver(args.to, "passwordChanged", result);
}

/** App-triggered: new device sign-in */
export async function sendNewSignInNotice(args: {
  to: string;
  device?: string;
  location?: string;
}): Promise<void> {
  const result = newSignInEmail({
    device: args.device || "Unknown",
    location: args.location || "Unknown",
    time: new Date().toUTCString(),
  });
  await deliver(args.to, "newSignIn", result);
}

export { welcomeEmail };
