/**
 * Supabase Auth "Send Email" HTTPS hook.
 * POST /api/auth/send-email
 *
 * Verifies Standard Webhooks signature (SUPABASE_AUTH_HOOK_SECRET or
 * SEND_EMAIL_HOOK_SECRET), maps email_action_type → branded Resend templates,
 * always sends (never checks marketing_unsubscribed), rate-limits OTP spam.
 *
 * Success: 200 {}
 * Failure: JSON { error: { http_code, message } } so Auth shows a clean message.
 */
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { verifyStandardWebhook } from "@/lib/standard-webhook";
import {
  handleAuthSendEmailHook,
  isAuthEmailRateLimited,
  logEmailSend,
  type AuthEmailData,
  type AuthUser,
} from "@/lib/send-auth-email";

function hookSecret(): string {
  return (
    process.env.SUPABASE_AUTH_HOOK_SECRET ||
    process.env.SEND_EMAIL_HOOK_SECRET ||
    ""
  );
}

function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for") || "";
  if (xf) return xf.split(",")[0]!.trim().slice(0, 64);
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  ).slice(0, 64);
}

function errorResponse(http_code: number, message: string, status?: number) {
  return Response.json(
    { error: { http_code, message } },
    {
      status: status ?? (http_code >= 400 && http_code < 600 ? http_code : 500),
      headers: { "Content-Type": "application/json" },
    },
  );
}

export const APIRoute = createAPIFileRoute("/api/auth/send-email")({
  POST: async ({ request }) => {
    const secret = hookSecret();
    if (!secret) {
      console.error("[auth/send-email] SUPABASE_AUTH_HOOK_SECRET missing");
      return errorResponse(500, "Email service not configured");
    }

    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return errorResponse(400, "Invalid body");
    }

    let payload: { user?: AuthUser; email_data?: AuthEmailData };
    try {
      payload = verifyStandardWebhook(rawBody, request.headers, secret) as {
        user?: AuthUser;
        email_data?: AuthEmailData;
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid signature";
      console.warn("[auth/send-email] verify failed:", msg);
      return errorResponse(401, "Unauthorized");
    }

    if (!payload?.user || !payload?.email_data) {
      return errorResponse(400, "Invalid payload");
    }

    // Extra IP rate limit (in addition to per-email inside handler)
    const ip = clientIp(request);
    const ipKey = `ip:${ip}`;
    try {
      if (await isAuthEmailRateLimited(ipKey)) {
        await logEmailSend({
          templateName: "rate_limited",
          recipientEmail: ipKey,
          status: "skipped",
          errorMessage: "IP rate limited",
        });
        return errorResponse(
          429,
          "Too many verification emails. Please wait a few minutes and try again.",
        );
      }
    } catch {
      /* non-fatal */
    }

    try {
      await handleAuthSendEmailHook({
        user: payload.user,
        email_data: payload.email_data,
      });
      // Record IP counter entry (no OTP) so IP limit accumulates
      await logEmailSend({
        templateName: "auth_hook",
        recipientEmail: ipKey,
        status: "sent",
      });
      return Response.json({}, { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Failed to send email. Please try again.";
      const isRate = /too many/i.test(message);
      console.error("[auth/send-email] deliver:", message);
      return errorResponse(
        isRate ? 429 : 500 500,
        isRate
          ? message
          : "Failed to send email. Please try again in a moment.",
      );
    }
  },
});
