import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ticketInput = z.object({
  category: z.enum(["payment", "technical", "account", "feature_request", "bug_report", "other"]),
  priority: z.enum(["low", "normal", "high", "critical"]),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(2000),
  attachment_url: z.string().nullable().optional(),
});

function ticketCode(id: string): string {
  // TKT-XXXXX format derived from the ticket UUID.
  return `TKT-${id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase()}`;
}

function esc(s: string): string {
  return s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
}

async function sendResendEmail(args: { from: string; to: string; subject: string; html: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[tickets] RESEND_API_KEY not configured — skipping email");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: args.from, to: [args.to], subject: args.subject, html: args.html }),
  });
  if (!res.ok) {
    console.error("[tickets] Resend email failed:", res.status, await res.text());
    throw new Error("EMAIL_SEND_FAILED");
  }
}

export const submitTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ticketInput>) => ticketInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Save the ticket (RLS scopes to this user; status defaults to 'open').
    const { data: row, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: userId,
        category: data.category,
        priority: data.priority,
        subject: data.subject,
        message: data.message,
        attachment_url: data.attachment_url ?? null,
      })
      .select("id, created_at, status")
      .single();
    if (error) throw new Error(error.message);

    const code = ticketCode(row.id);
    const supportEmail = process.env.SUPPORT_EMAIL || "support@motio2edit.com";
    const fromEmail = `Motio2Edit Support <${supportEmail}>`;

    // Resolve user details.
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", userId)
      .maybeSingle();
    const userName = profile?.display_name || "User";
    const userEmail = profile?.email || context.claims?.email || "";
    const createdDate = new Date(row.created_at).toUTCString();

    // 2. Email to support inbox.
    const supportHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#6c63ff;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">New Support Ticket ${code}</h2>
      </div>
      <div style="background:#f9f9f9;padding:24px;border:1px solid #eee;border-radius:0 0 8px 8px">
        <p><b>Ticket ID:</b> ${code}</p>
        <p><b>Name:</b> ${esc(userName)}</p>
        <p><b>Email:</b> ${esc(userEmail)}</p>
        <p><b>Subject:</b> ${esc(data.subject)}</p>
        <p><b>Message:</b><br/>${esc(data.message).replace(/\n/g, "<br/>")}</p>
        <p><b>Created:</b> ${createdDate}</p>
        <p><b>Status:</b> Open</p>
      </div>
    </div>`;

    // 3. Confirmation email to the user.
    const userHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#6c63ff;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">We received your ticket</h2>
      </div>
      <div style="background:#f9f9f9;padding:24px;border:1px solid #eee;border-radius:0 0 8px 8px">
        <p>Your ticket [${code}] has been received. We will respond within 24 hours to ${supportEmail}.</p>
        <p style="margin-top:16px"><b>Subject:</b> ${esc(data.subject)}</p>
        <p><b>Status:</b> Open</p>
      </div>
    </div>`;

    let emailError: string | null = null;
    try {
      await sendResendEmail({ from: fromEmail, to: supportEmail, subject: `[Ticket ${code}] ${data.subject}`, html: supportHtml });
      if (userEmail) {
        await sendResendEmail({ from: fromEmail, to: userEmail, subject: `Your ticket ${code} has been received`, html: userHtml });
      }
    } catch (err) {
      emailError = err instanceof Error ? err.message : "EMAIL_SEND_FAILED";
    }

    return { id: row.id, code, status: "open", emailError };
  });
