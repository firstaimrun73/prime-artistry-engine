/**
 * One-time plan activation, monthly annual credit grants, and expiration.
 * Server-only. Does not cancel PayPal recurring subscriptions.
 */
import { PLAN_CREDITS, type PlanId, getPlan } from "@/lib/plans";

export type BillingInterval = "month" | "year";

const MS_DAY = 24 * 60 * 60 * 1000;

export function validityDays(interval: BillingInterval): number {
  return interval === "year" ? 365 : 30;
}

export function computePlanExpiry(from: Date, interval: BillingInterval): Date {
  return new Date(from.getTime() + validityDays(interval) * MS_DAY);
}

export function computeNextCreditGrant(from: Date): Date {
  return new Date(from.getTime() + 30 * MS_DAY);
}

/** Activate paid plan after verified payment. Credits granted separately via apply_payment_credits. */
export async function activateOneTimePlan(
  db: any,
  args: {
    userId: string;
    plan: PlanId;
    interval: BillingInterval;
    provider: "paypal" | "razorpay";
    transactionId: string;
  },
): Promise<{ expiresAt: string }> {
  const now = new Date();
  const expiresAt = computePlanExpiry(now, args.interval);
  const nextGrant =
    args.interval === "year" ? computeNextCreditGrant(now) : null;

  await db
    .from("profiles")
    .update({
      plan: args.plan,
      plan_expires_at: expiresAt.toISOString(),
      billing_interval: args.interval,
      billing_provider: args.provider,
      plan_activated_at: now.toISOString(),
      next_credit_grant_at: nextGrant ? nextGrant.toISOString() : null,
      expiration_email_sent_at: null,
      last_payment_transaction_id: args.transactionId,
      updated_at: now.toISOString(),
    })
    .eq("id", args.userId);

  // Local entitlement row (not a PayPal recurring subscription)
  try {
    await db.from("subscriptions").insert({
      user_id: args.userId,
      plan: args.plan,
      status: "active",
      provider: args.provider,
      provider_subscription_id: null,
      auto_renew: false,
      billing_model: "one_time",
      current_period_start: now.toISOString(),
      current_period_end: expiresAt.toISOString(),
    });
  } catch (e) {
    console.warn("[plan-lifecycle] subscription insert optional:", e);
  }

  return { expiresAt: expiresAt.toISOString() };
}

export async function expireDuePlans(db: any): Promise<{
  expired: number;
  emailsSent: number;
  emailFailures: number;
}> {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await db
    .from("profiles")
    .select("id, email, display_name, plan, plan_expires_at, expiration_email_sent_at, billing_provider")
    .neq("plan", "free")
    .not("plan_expires_at", "is", null)
    .lte("plan_expires_at", nowIso)
    .limit(200);

  if (error) {
    console.error("[plan-lifecycle] expire query failed:", error);
    throw new Error(error.message);
  }

  let expired = 0;
  let emailsSent = 0;
  let emailFailures = 0;

  for (const row of due || []) {
    // Never touch users still on active PayPal recurring without local one-time expiry semantics
    // (they should not have plan_expires_at set by one-time flow).
    const planName = getPlan((row.plan as PlanId) || "free").name;

    const { error: upErr } = await db
      .from("profiles")
      .update({
        plan: "free",
        updated_at: nowIso,
        next_credit_grant_at: null,
        // keep plan_expires_at for audit; mark email separately
      })
      .eq("id", row.id)
      .eq("plan", row.plan);

    if (upErr) {
      console.error("[plan-lifecycle] expire update failed:", row.id, upErr);
      continue;
    }
    expired++;

    try {
      await db.from("subscriptions").update({
        status: "expired",
        auto_renew: false,
        updated_at: nowIso,
      }).eq("user_id", row.id).eq("billing_model", "one_time").eq("status", "active");
    } catch {
      /* optional */
    }

    // Idempotent expiration email
    if (row.expiration_email_sent_at) continue;
    if (!row.email) {
      await db
        .from("profiles")
        .update({ expiration_email_sent_at: nowIso })
        .eq("id", row.id);
      continue;
    }

    try {
      const { sendPlanExpiredEmail } = await import("@/lib/email.server");
      await sendPlanExpiredEmail({
        to: row.email,
        name: row.display_name?.split(" ")[0] || "there",
        planName,
      });
      await db
        .from("profiles")
        .update({ expiration_email_sent_at: nowIso })
        .eq("id", row.id);
      emailsSent++;
    } catch (e) {
      console.error("[plan-lifecycle] expiration email failed:", row.id, e);
      emailFailures++;
    }
  }

  return { expired, emailsSent, emailFailures };
}

/** Monthly credit deposits for annual one-time plans still within validity. */
export async function grantDueAnnualMonthlyCredits(db: any): Promise<{ granted: number }> {
  const now = new Date();
  const nowIso = now.toISOString();
  const { data: due, error } = await db
    .from("profiles")
    .select("id, plan, plan_expires_at, next_credit_grant_at, billing_interval")
    .eq("billing_interval", "year")
    .neq("plan", "free")
    .not("next_credit_grant_at", "is", null)
    .lte("next_credit_grant_at", nowIso)
    .limit(200);

  if (error) throw new Error(error.message);

  let granted = 0;
  for (const row of due || []) {
    if (row.plan_expires_at && new Date(row.plan_expires_at) <= now) continue;
    const planId = row.plan as PlanId;
    const credits = PLAN_CREDITS[planId] ?? 0;
    if (credits <= 0) continue;

    const txId = `annual_grant_${row.id}_${row.next_credit_grant_at}`;
    try {
      await db.rpc("apply_payment_credits", {
        _user_id: row.id,
        _transaction_id: txId,
        _credits: credits,
        _reason: "annual_monthly_grant",
      });
    } catch (e) {
      console.error("[plan-lifecycle] annual grant failed:", row.id, e);
      continue;
    }

    const next = computeNextCreditGrant(new Date(row.next_credit_grant_at));
    // Do not schedule past plan end
    const expires = row.plan_expires_at ? new Date(row.plan_expires_at) : null;
    const nextIso =
      expires && next > expires ? null : next.toISOString();

    await db
      .from("profiles")
      .update({
        next_credit_grant_at: nextIso,
        updated_at: nowIso,
      })
      .eq("id", row.id);

    granted++;
  }
  return { granted };
}
