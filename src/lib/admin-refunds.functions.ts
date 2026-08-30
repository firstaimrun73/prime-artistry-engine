// Admin refund dashboard — privileged server functions gated by sole admin.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminRefundRow = {
  id: string;
  userId: string;
  userEmail: string | null;
  amount: number;
  currency: string;
  creditsPurchased: number;
  creditsUsed: number;
  reason: string;
  details: string | null;
  requestedAt: string;
  status: string;
  adminNote: string | null;
  maskedTransactionId: string;
  paymentMethod: string | null;
};

function isAdmin(claimsEmail: unknown): boolean {
  // Sole admin only — firstaimrun89@gmail.com (admin-guard.server.ts)
  const caller = String(claimsEmail ?? "").trim().toLowerCase();
  return caller === "firstaimrun89@gmail.com";
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
      db.from("profiles").select("id, email").in("id", userIds),
      txIds.length
        ? db.from("payment_transactions").select("id, payment_method, transaction_id").in("id", txIds)
        : Promise.resolve({ data: [] }),
    ]);

    const emailById = new Map((profiles ?? []).map((p: any) => [p.id, p.email as string | null]));
    const txById = new Map((txs ?? []).map((t: any) => [t.id, t]));

    const rows: AdminRefundRow[] = requests.map((r) => {
      const tx = txById.get(r.payment_transaction_id);
      const rawTx = String(tx?.transaction_id ?? r.payment_transaction_id ?? "");
      const masked =
        rawTx.length > 8 ? `${rawTx.slice(0, 4)}…${rawTx.slice(-4)}` : rawTx || "—";
      return {
        id: r.id,
        userId: r.user_id,
        userEmail: emailById.get(r.user_id) ?? null,
        amount: Number(r.amount ?? 0),
        currency: String(r.currency ?? "INR"),
        creditsPurchased: Number(r.credits_purchased ?? 0),
        creditsUsed: Number(r.credits_used ?? 0),
        reason: String(r.reason ?? ""),
        details: r.details ?? null,
        requestedAt: r.requested_at,
        status: String(r.status ?? "pending"),
        adminNote: r.admin_note ?? null,
        maskedTransactionId: masked,
        paymentMethod: tx?.payment_method ?? null,
      };
    });

    return { isAdmin: true, rows };
  });

export const resolveRefundRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "rejected"]),
        adminNote: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!isAdmin(context.claims?.email)) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("refund_requests")
      .update({
        status: data.status,
        admin_note: data.adminNote ?? null,
        resolved_at: new Date().toISOString(),
        resolved_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
