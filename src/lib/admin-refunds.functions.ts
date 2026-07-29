// Admin refund dashboard — privileged server functions gated by ADMIN_EMAIL.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { maskTransactionId } from "@/lib/subscription.functions";

export type AdminRefundRow = {
  id: string;
  userName: string;
  userEmail: string;
  plan: string;
  amount: number;
  currency: string;
  purchaseDate: string | null;
  creditsUsed: number;
  creditsPurchased: number;
  reason: string;
  details: string | null;
  requestedAt: string;
  status: string;
  adminNote: string | null;
  maskedTransactionId: string;
  paymentMethod: string | null;
};

function isAdmin(claimsEmail: unknown): boolean {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const caller = String(claimsEmail ?? "").toLowerCase();
  return !!adminEmail && caller === adminEmail;
}

export const listRefundRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isAdmin: boolean; rows: AdminRefundRow[] }> => {
    if (!isAdmin(context.claims?.email)) return { isAdmin: false, rows: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: reqs } = await db.from("refund_requests").select("*").order("requested_at", { ascending: false });
    const requests = (reqs ?? []) as any[];
    if (requests.length === 0) return { isAdmin: true, rows: [] };

    const userIds = [...new Set(requests.map((r) => r.user_id))];
    const txIds = requests.map((r) => r.payment_transaction_id).filter(Boolean);

    const [{ data: profiles }, { data: txs }] = await Promise.all([
      db.from("profiles").select("id, email, display_name, plan").in("id", userIds),
      txIds.length
        ? db
            .from("payment_transactions")
            .select("id, transaction_id, amount, currency, credits_purchased, payment_method, created_at")
            .in("id", txIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const txById = new Map((txs ?? []).map((t: any) => [t.id, t]));

    const rows: AdminRefundRow[] = [];
    for (const r of requests) {
      const p = profileById.get(r.user_id);
      const t = txById.get(r.payment_transaction_id);
      let creditsUsed = 0;
      if (t) {
        const { data: debits } = await db
          .from("credit_transactions")
          .select("amount")
          .eq("user_id", r.user_id)
          .eq("kind", "debit")
          .gte("created_at", t.created_at);
        creditsUsed = (debits ?? []).reduce((s: number, d: any) => s + Math.abs(Number(d.amount ?? 0)), 0);
      }
      rows.push({
        id: r.id,
        userName: p?.display_name ?? "—",
        userEmail: p?.email ?? "—",
        plan: p?.plan ?? "—",
        amount: Number(r.refund_amount ?? t?.amount ?? 0),
        currency: r.currency ?? t?.currency ?? "USD",
        purchaseDate: t?.created_at ?? null,
        creditsUsed,
        creditsPurchased: t?.credits_purchased ?? 0,
        reason: r.reason,
        details: r.details ?? null,
        requestedAt: r.requested_at,
        status: r.status,
        adminNote: r.admin_note ?? null,
        maskedTransactionId: maskTransactionId(t?.transaction_id),
        paymentMethod: t?.payment_method ?? null,
      });
    }
    return { isAdmin: true, rows };
  });

export const approveRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { requestId: string; note?: string }) =>
    z.object({ requestId: z.string().uuid(), note: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!isAdmin(context.claims?.email)) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { refundPaypalCapture, extractPaypalCaptureId } = await import("@/lib/payments.server");
    const { sendBrandedEmail } = await import("@/lib/email.server");
    const db = supabaseAdmin as any;

    const { data: req } = await db.from("refund_requests").select("*").eq("id", data.requestId).maybeSingle();
    if (!req) throw new Error("Refund request not found");
    if (req.status !== "pending") throw new Error("This request has already been reviewed.");

    const { data: tx } = await db
      .from("payment_transactions")
      .select("*")
      .eq("id", req.payment_transaction_id)
      .maybeSingle();
    if (!tx) throw new Error("Original transaction not found");

    const amount = Number(req.refund_amount ?? tx.amount ?? 0);
    const currency = req.currency ?? tx.currency ?? "USD";
    let paypalRefundId: string | null = null;

    if (tx.payment_method === "paypal") {
      const captureId = tx.paypal_capture_id ?? extractPaypalCaptureId(tx.gateway_response);
      if (!captureId) throw new Error("No PayPal capture id found for this transaction.");
      const refund = await refundPaypalCapture({ captureId, amount, currency, note: "MOTIO2EDIT Refund" });
      paypalRefundId = refund?.id ?? null;
      await db.from("payment_transactions").update({ paypal_capture_id: captureId }).eq("id", tx.id);
    }

    const now = new Date().toISOString();
    await db
      .from("refund_requests")
      .update({
        status: "approved",
        paypal_refund_id: paypalRefundId,
        admin_note: data.note ?? null,
        reviewed_at: now,
        reviewed_by: context.claims?.email ?? "admin",
        refunded_at: now,
        refund_amount: amount,
      })
      .eq("id", req.id);

    await db
      .from("payment_transactions")
      .update({ payment_status: "refunded", paypal_refund_id: paypalRefundId, refunded_amount: amount, refunded_at: now })
      .eq("id", tx.id);

    await db.from("billing_audit_log").insert({
      user_id: req.user_id,
      actor: context.claims?.email ?? "admin",
      action: "refund_approved",
      target_id: req.id,
      metadata: { amount, currency, paypalRefundId },
    });

    const { data: profile } = await db.from("profiles").select("email").eq("id", req.user_id).maybeSingle();
    if (profile?.email) {
      await sendBrandedEmail({
        to: profile.email,
        subject: "Your MOTIO2EDIT refund has been approved",
        heading: "Refund approved",
        bodyHtml: `<p>Your refund of <b>${amount} ${currency}</b> has been approved and issued.</p>
          <p>It may take 3–7 business days to appear on your original payment method.</p>
          ${data.note ? `<p><b>Note:</b> ${data.note}</p>` : ""}`,
      });
    }

    return { success: true, amount, currency, paypalRefundId };
  });

export const rejectRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { requestId: string; note: string }) =>
    z.object({ requestId: z.string().uuid(), note: z.string().trim().min(3).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!isAdmin(context.claims?.email)) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendBrandedEmail } = await import("@/lib/email.server");
    const db = supabaseAdmin as any;

    const { data: req } = await db.from("refund_requests").select("*").eq("id", data.requestId).maybeSingle();
    if (!req) throw new Error("Refund request not found");
    if (req.status !== "pending") throw new Error("This request has already been reviewed.");

    await db
      .from("refund_requests")
      .update({
        status: "rejected",
        admin_note: data.note,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.claims?.email ?? "admin",
      })
      .eq("id", req.id);

    await db.from("billing_audit_log").insert({
      user_id: req.user_id,
      actor: context.claims?.email ?? "admin",
      action: "refund_rejected",
      target_id: req.id,
      metadata: { note: data.note },
    });

    const { data: profile } = await db.from("profiles").select("email").eq("id", req.user_id).maybeSingle();
    if (profile?.email) {
      await sendBrandedEmail({
        to: profile.email,
        subject: "Update on your MOTIO2EDIT refund request",
        heading: "Refund request declined",
        bodyHtml: `<p>After review, we're unable to approve your refund request.</p>
          <p><b>Reason:</b> ${data.note}</p>
          <p>If you believe this is a mistake, reply to this email and we'll take another look.</p>`,
      });
    }

    return { success: true };
  });
