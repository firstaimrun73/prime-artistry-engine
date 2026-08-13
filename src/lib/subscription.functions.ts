// Subscription management + refund request server functions.
// All PayPal calls and eligibility checks happen server-side only.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PaymentHistoryItem = {
  id: string;
  transactionId: string | null;
  maskedTransactionId: string;
  plan: string;
  method: string;
  amount: number;
  currency: string;
  status: string;
  credits: number;
  createdAt: string;
};

export type RefundEligibility = {
  eligible: boolean;
  reviewRequired: boolean;
  reason: string;
  refundAmount: number;
  currency: string;
};

export type SubscriptionOverview = {
  plan: string;
  status: "active" | "cancelled" | "expired" | "none";
  purchaseDate: string | null;
  nextBillingDate: string | null;
  maskedTransactionId: string | null;
  creditsPurchased: number;
  creditsRemaining: number;
  creditsUsed: number;
  autoRenew: boolean;
  amount: number;
  currency: string;
  latestTransactionRowId: string | null;
  eligibility: RefundEligibility | null;
  pendingRefund: boolean;
  payments: PaymentHistoryItem[];
};

export function maskTransactionId(id: string | null | undefined): string {
  if (!id) return "—";
  if (id.length <= 8) return `${id.slice(0, 2)}••••`;
  return `${id.slice(0, 4)}••••••${id.slice(-4)}`;
}

const REFUND_WINDOW_HOURS = 24;

/** Matches PLAN_CREDITS / PLAN_PURCHASE (including legacy credit amounts). */
function planFromCreditsLocal(credits: number): string {
  const map: Record<number, string> = {
    350: "lite",
    750: "plus",
    500: "plus", // legacy
    2500: "pro",
    2000: "pro", // legacy
    5000: "studio",
    10000: "business", // Studio+
    9_999_999: "business", // legacy unlimited sentinel
  };
  return map[credits] ?? "custom";
}

/** Server-side truth for the subscription page. */
export const getSubscriptionOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SubscriptionOverview> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = context.userId;

    const [{ data: profile }, { data: txs }, { data: sub }, { data: refunds }] = await Promise.all([
      db.from("profiles").select("plan, credits").eq("id", userId).maybeSingle(),
      db
        .from("payment_transactions")
        .select("id, transaction_id, payment_method, amount, currency, credits_purchased, payment_status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      db.from("subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("refund_requests").select("payment_transaction_id, status").eq("user_id", userId),
    ]);

    const allTx = (txs ?? []) as any[];
    const payments: PaymentHistoryItem[] = allTx.map((t) => ({
      id: t.id,
      transactionId: t.transaction_id,
      maskedTransactionId: maskTransactionId(t.transaction_id),
      plan: planFromCreditsLocal(t.credits_purchased ?? 0),
      method: t.payment_method,
      amount: Number(t.amount ?? 0),
      currency: t.currency ?? "USD",
      status: t.payment_status,
      credits: t.credits_purchased ?? 0,
      createdAt: t.created_at,
    }));

    const latest = allTx.find((t) => t.payment_status === "completed") ?? null;
    const plan = profile?.plan ?? "free";
    const creditsRemaining = profile?.credits ?? 0;

    if (!latest) {
      return {
        plan,
        status: "none",
        purchaseDate: null,
        nextBillingDate: null,
        maskedTransactionId: null,
        creditsPurchased: 0,
        creditsRemaining,
        creditsUsed: 0,
        autoRenew: false,
        amount: 0,
        currency: "USD",
        latestTransactionRowId: null,
        eligibility: null,
        pendingRefund: false,
        payments,
      };
    }

    // Credits consumed since the purchase (authoritative, from the ledger).
    const { data: debits } = await db
      .from("credit_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("kind", "debit")
      .gte("created_at", latest.created_at);
    const creditsUsed = (debits ?? []).reduce((s: number, r: any) => s + Math.abs(Number(r.amount ?? 0)), 0);

    const purchasedAt = new Date(latest.created_at);
    const nextBilling = new Date(purchasedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const cancelled = sub?.status === "cancelled" || sub?.auto_renew === false;
    const expired = nextBilling.getTime() < Date.now();
    const status: SubscriptionOverview["status"] = cancelled ? "cancelled" : expired ? "expired" : "active";

    const refundRows = (refunds ?? []) as any[];
    const pendingRefund = refundRows.some((r) => r.payment_transaction_id === latest.id && r.status === "pending");
    const alreadyRefunded =
      refundRows.some((r) => r.payment_transaction_id === latest.id && r.status === "approved") ||
      latest.payment_status === "refunded";

    return {
      plan,
      status,
      purchaseDate: latest.created_at,
      nextBillingDate: nextBilling.toISOString(),
      maskedTransactionId: maskTransactionId(latest.transaction_id),
      creditsPurchased: latest.credits_purchased ?? 0,
      creditsRemaining,
      creditsUsed,
      autoRenew: sub ? sub.auto_renew !== false && sub.status !== "cancelled" : !cancelled && !expired,
      amount: Number(latest.amount ?? 0),
      currency: latest.currency ?? "USD",
      latestTransactionRowId: latest.id,
      eligibility: evaluateEligibility({
        createdAt: latest.created_at,
        creditsUsed,
        amount: Number(latest.amount ?? 0),
        currency: latest.currency ?? "USD",
        method: latest.payment_method,
        pendingRefund,
        alreadyRefunded,
        plan,
      }),
      pendingRefund,
      payments,
    };
  });

function evaluateEligibility(args: {
  createdAt: string;
  creditsUsed: number;
  amount: number;
  currency: string;
  method: string;
  pendingRefund: boolean;
  alreadyRefunded: boolean;
  plan: string;
}): RefundEligibility {
  const base = { refundAmount: args.amount, currency: args.currency };
  if (args.plan === "free") {
    return { ...base, eligible: false, reviewRequired: false, reason: "Free plan purchases cannot be refunded.", refundAmount: 0 };
  }
  if (args.alreadyRefunded) {
    return { ...base, eligible: false, reviewRequired: false, reason: "This payment has already been refunded." };
  }
  if (args.pendingRefund) {
    return { ...base, eligible: false, reviewRequired: true, reason: "A refund request for this payment is already under review." };
  }
  const hours = (Date.now() - new Date(args.createdAt).getTime()) / 36e5;
  if (hours > REFUND_WINDOW_HOURS) {
    return {
      ...base,
      eligible: false,
      reviewRequired: true,
      reason: `Requests must be made within ${REFUND_WINDOW_HOURS} hours of purchase. Special cases (technical errors, duplicate or billing charges) are reviewed manually.`,
    };
  }
  if (args.creditsUsed > 0) {
    return {
      ...base,
      eligible: false,
      reviewRequired: true,
      reason: `You have already used ${args.creditsUsed} credit(s) from this purchase. Special cases are reviewed manually.`,
    };
  }
  return { ...base, eligible: true, reviewRequired: false, reason: "You are eligible for a full refund." };
}

// ── Cancel subscription ──
export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reason?: string }) => z.object({ reason: z.string().max(300).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { cancelPaypalSubscription } = await import("@/lib/payments.server");
    const { sendBrandedEmail } = await import("@/lib/email.server");
    const db = supabaseAdmin as any;
    const userId = context.userId;

    const { data: sub } = await db
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: latest } = await db
      .from("payment_transactions")
      .select("created_at")
      .eq("user_id", userId)
      .eq("payment_status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub && !latest) throw new Error("You do not have an active subscription to cancel.");

    if (sub?.provider === "paypal" && sub?.provider_subscription_id) {
      try {
        await cancelPaypalSubscription(sub.provider_subscription_id, data.reason || "Cancelled by user");
      } catch (err) {
        console.error("[subscription] paypal cancel failed:", err);
      }
    }

    const now = new Date().toISOString();
    if (sub) {
      await db
        .from("subscriptions")
        .update({ status: "cancelled", auto_renew: false, cancelled_at: now, cancel_reason: data.reason ?? null, updated_at: now })
        .eq("id", sub.id);
    } else {
      await db.from("subscriptions").insert({
        user_id: userId,
        plan: "cancelled",
        status: "cancelled",
        auto_renew: false,
        cancelled_at: now,
        cancel_reason: data.reason ?? null,
        current_period_start: latest?.created_at ?? now,
        current_period_end: new Date(new Date(latest?.created_at ?? now).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    const expiry = new Date(new Date(latest?.created_at ?? now).getTime() + 30 * 24 * 60 * 60 * 1000);

    await db.from("billing_audit_log").insert({
      user_id: userId,
      actor: context.claims?.email ?? userId,
      action: "subscription_cancelled",
      target_id: sub?.id ?? null,
      metadata: { reason: data.reason ?? null },
    });

    const email = context.claims?.email as string | undefined;
    if (email) {
      await sendBrandedEmail({
        to: email,
        subject: "Your MOTIO2EDIT subscription has been cancelled",
        heading: "Subscription cancelled",
        bodyHtml: `<p>Your subscription auto-renewal has been turned off.</p>
          <p>You keep full access to your benefits and remaining credits until <b>${expiry.toDateString()}</b>.</p>`,
      });
    }

    return { success: true, expiresAt: expiry.toISOString() };
  });

// ── Refund request ──
const REASONS = ["technical_issue", "duplicate_charge", "not_as_expected", "accidental_purchase", "other"] as const;

export const submitRefundRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reason: string; details?: string }) =>
    z.object({ reason: z.enum(REASONS), details: z.string().trim().max(1000).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendBrandedEmail } = await import("@/lib/email.server");
    const db = supabaseAdmin as any;
    const userId = context.userId;

    // Rate limit: max 3 refund requests per 24h.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from("refund_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("requested_at", since);
    if ((count ?? 0) >= 3) throw new Error("Too many refund requests. Please try again later or contact support.");

    const { data: latest } = await db
      .from("payment_transactions")
      .select("id, transaction_id, amount, currency, credits_purchased, payment_method, payment_status, created_at")
      .eq("user_id", userId)
      .eq("payment_status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) throw new Error("No completed payment found to refund.");

    const { data: existing } = await db
      .from("refund_requests")
      .select("id, status")
      .eq("payment_transaction_id", latest.id)
      .in("status", ["pending", "approved"]);
    if ((existing ?? []).length > 0) throw new Error("A refund request for this payment already exists.");

    const { data: debits } = await db
      .from("credit_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("kind", "debit")
      .gte("created_at", latest.created_at);
    const creditsUsed = (debits ?? []).reduce((s: number, r: any) => s + Math.abs(Number(r.amount ?? 0)), 0);

    const eligibility = evaluateEligibility({
      createdAt: latest.created_at,
      creditsUsed,
      amount: Number(latest.amount ?? 0),
      currency: latest.currency ?? "USD",
      method: latest.payment_method,
      pendingRefund: false,
      alreadyRefunded: false,
      plan: "paid",
    });

    const { data: inserted, error } = await db
      .from("refund_requests")
      .insert({
        user_id: userId,
        payment_transaction_id: latest.id,
        reason: data.reason,
        details: data.details ?? null,
        status: "pending",
        refund_amount: eligibility.eligible ? eligibility.refundAmount : Number(latest.amount ?? 0),
        currency: latest.currency ?? "USD",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await db.from("billing_audit_log").insert({
      user_id: userId,
      actor: context.claims?.email ?? userId,
      action: "refund_requested",
      target_id: inserted?.id ?? null,
      metadata: { reason: data.reason, creditsUsed, eligible: eligibility.eligible },
    });

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendBrandedEmail({
        to: adminEmail,
        subject: `[REFUND REQUEST] ${latest.currency} ${latest.amount} — ${context.claims?.email ?? userId}`,
        heading: "New refund request",
        bodyHtml: `<p><b>User:</b> ${context.claims?.email ?? userId}</p>
          <p><b>Amount:</b> ${latest.amount} ${latest.currency}</p>
          <p><b>Method:</b> ${latest.payment_method}</p>
          <p><b>Credits used:</b> ${creditsUsed} / ${latest.credits_purchased}</p>
          <p><b>Reason:</b> ${data.reason}</p>
          <p><b>Details:</b> ${data.details ?? "—"}</p>
          <p><b>Auto-eligibility:</b> ${eligibility.eligible ? "ELIGIBLE" : eligibility.reason}</p>`,
      });
    }

    const email = context.claims?.email as string | undefined;
    if (email) {
      await sendBrandedEmail({
        to: email,
        subject: "We received your refund request",
        heading: "Refund request received",
        bodyHtml: `<p>We received your refund request for <b>${latest.amount} ${latest.currency}</b>.</p>
          <p>Our team will review it within 2–3 business days and email you the outcome.</p>`,
      });
    }

    return { success: true, requestId: inserted?.id, eligible: eligibility.eligible };
  });
