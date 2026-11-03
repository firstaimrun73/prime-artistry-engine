/**
 * One-time plan activation, monthly annual credit grants, expiration, renewal reminders.
 * Server-only. Does not create PayPal recurring subscriptions or charge customers again.
 */
import { PLAN_CREDITS, type PlanId, getPlan } from "@/lib/plans";

export type BillingInterval = "month" | "year";

const MS_DAY = 24 * 60 * 60 * 1000;
const EMAIL_CLAIM_STALE_MS = 15 * 60 * 1000;

export function validityDays(interval: BillingInterval): number {
  return interval === "year" ? 365 : 30;
}

export function computePlanExpiry(from: Date, interval: BillingInterval): Date {
  return new Date(from.getTime() + validityDays(interval) * MS_DAY);
}

export function computeNextCreditGrant(from: Date): Date {
  return new Date(from.getTime() + 30 * MS_DAY);
}

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
  const nextGrant = args.interval === "year" ? computeNextCreditGrant(now) : null;

  const { error, data } = await db
    .from("profiles")
    .update({
      plan: args.plan,
      plan_expires_at: expiresAt.toISOString(),
      billing_interval: args.interval,
      billing_provider: args.provider,
      plan_activated_at: now.toISOString(),
      next_credit_grant_at: nextGrant ? nextGrant.toISOString() : null,
      expiration_email_sent_at: null,
      expiration_email_claimed_at: null,
      renewal_reminder_7d_sent_at: null,
      renewal_reminder_3d_sent_at: null,
      renewal_reminder_1d_sent_at: null,
      last_payment_transaction_id: args.transactionId,
      updated_at: now.toISOString(),
    })
    .eq("id", args.userId)
    .select("id");

  if (error) {
    console.error("[plan-lifecycle] activate profile update failed:", error);
    throw new Error(error.message || "Failed to activate plan");
  }
  if (!data || data.length === 0) {
    throw new Error("Failed to activate plan (no profile row updated)");
  }

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

/** Demote expired paid plans to free (does not send email). */
export async function demoteExpiredPlans(db: any): Promise<{ expired: number }> {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await db
    .from("profiles")
    .select("id, plan")
    .neq("plan", "free")
    .not("plan_expires_at", "is", null)
    .lte("plan_expires_at", nowIso)
    .limit(200);

  if (error) throw new Error(error.message);

  let expired = 0;
  for (const row of due || []) {
    const { error: upErr, data: updated } = await db
      .from("profiles")
      .update({
        plan: "free",
        updated_at: nowIso,
        next_credit_grant_at: null,
      })
      .eq("id", row.id)
      .eq("plan", row.plan)
      .select("id");

    if (upErr) {
      console.error("[plan-lifecycle] demote failed:", row.id, upErr);
      continue;
    }
    if (updated && updated.length > 0) {
      expired++;
      try {
        await db
          .from("subscriptions")
          .update({
            status: "expired",
            auto_renew: false,
            updated_at: nowIso,
          })
          .eq("user_id", row.id)
          .eq("billing_model", "one_time")
          .eq("status", "active");
      } catch {
        /* optional */
      }
    }
  }
  return { expired };
}

/**
 * Send expiration emails for rows that still need them — including users
 * already demoted to free. Uses claim lock for concurrency.
 */
export async function sendPendingExpirationEmails(db: any): Promise<{
  emailsSent: number;
  emailFailures: number;
}> {
  const now = new Date();
  const nowIso = now.toISOString();
  const staleBefore = new Date(now.getTime() - EMAIL_CLAIM_STALE_MS).toISOString();

  const { data: due, error } = await db
    .from("profiles")
    .select(
      "id, email, display_name, plan, plan_expires_at, expiration_email_sent_at, expiration_email_claimed_at",
    )
    .not("plan_expires_at", "is", null)
    .lte("plan_expires_at", nowIso)
    .is("expiration_email_sent_at", null)
    .not("email", "is", null)
    .limit(200);

  if (error) throw new Error(error.message);

  let emailsSent = 0;
  let emailFailures = 0;

  for (const row of due || []) {
    if (!row.email) continue;

    if (
      row.expiration_email_claimed_at &&
      new Date(row.expiration_email_claimed_at) > new Date(staleBefore)
    ) {
      continue;
    }

    let claimQuery = db
      .from("profiles")
      .update({ expiration_email_claimed_at: nowIso })
      .eq("id", row.id)
      .is("expiration_email_sent_at", null);

    if (row.expiration_email_claimed_at) {
      claimQuery = claimQuery.eq("expiration_email_claimed_at", row.expiration_email_claimed_at);
    } else {
      claimQuery = claimQuery.is("expiration_email_claimed_at", null);
    }

    const { data: claimed, error: claimErr } = await claimQuery.select("id");
    if (claimErr || !claimed || claimed.length === 0) {
      continue;
    }

    const planName =
      row.plan && row.plan !== "free" ? getPlan(row.plan as PlanId).name : "paid";

    try {
      const { sendPlanExpiredEmail } = await import("@/lib/email.server");
      const idempotencyKey = `plan-expired-${row.id}-${row.plan_expires_at}`;
      const send = await sendPlanExpiredEmail({
        to: row.email,
        name: row.display_name?.split(" ")[0] || "there",
        planName,
        idempotencyKey,
      });

      if (!send.ok) {
        emailFailures++;
        console.error("[plan-lifecycle] expiration email not delivered:", row.id, send.error);
        continue;
      }

      const { error: markErr, data: marked } = await db
        .from("profiles")
        .update({ expiration_email_sent_at: nowIso })
        .eq("id", row.id)
        .is("expiration_email_sent_at", null)
        .select("id");

      if (markErr) {
        console.error("[plan-lifecycle] mark email sent failed:", row.id, markErr);
        emailFailures++;
        continue;
      }
      if (marked && marked.length > 0) emailsSent++;
      else emailsSent++;
    } catch (e) {
      console.error("[plan-lifecycle] expiration email failed:", row.id, e);
      emailFailures++;
    }
  }

  return { emailsSent, emailFailures };
}

const REMINDER_WINDOWS: Array<{ days: 7 | 3 | 1; column: string }> = [
  { days: 7, column: "renewal_reminder_7d_sent_at" },
  { days: 3, column: "renewal_reminder_3d_sent_at" },
  { days: 1, column: "renewal_reminder_1d_sent_at" },
];

/**
 * Pre-expiry renewal reminders (7 / 3 / 1 days). Manual repurchase only — never charges.
 * Window: ~24h around each target day so daily cron still hits even if slightly delayed.
 */
export async function sendPendingRenewalReminders(db: any): Promise<{
  remindersSent: number;
  reminderFailures: number;
}> {
  const now = new Date();
  let remindersSent = 0;
  let reminderFailures = 0;

  for (const { days, column } of REMINDER_WINDOWS) {
    const center = new Date(now.getTime() + days * MS_DAY);
    const windowStart = new Date(center.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(center.getTime() + 12 * 60 * 60 * 1000).toISOString();

    const { data: due, error } = await db
      .from("profiles")
      .select(`id, email, display_name, plan, plan_expires_at, ${column}`)
      .neq("plan", "free")
      .not("plan_expires_at", "is", null)
      .gte("plan_expires_at", windowStart)
      .lte("plan_expires_at", windowEnd)
      .is(column, null)
      .not("email", "is", null)
      .limit(200);

    if (error) {
      // Column may not exist until migration is applied — skip gracefully
      console.warn("[plan-lifecycle] renewal reminder query:", days, error.message);
      continue;
    }

    for (const row of due || []) {
      if (!row.email || !row.plan_expires_at) continue;
      const planName =
        row.plan && row.plan !== "free" ? getPlan(row.plan as PlanId).name : "paid";

      try {
        const { sendPlanRenewalReminderEmail } = await import("@/lib/email.server");
        const idempotencyKey = `plan-renewal-${days}d-${row.id}-${row.plan_expires_at}`;
        const send = await sendPlanRenewalReminderEmail({
          to: row.email,
          name: row.display_name?.split(" ")[0] || "there",
          planName,
          expiresAt: row.plan_expires_at,
          daysLeft: days,
          idempotencyKey,
        });

        if (!send.ok) {
          reminderFailures++;
          console.error("[plan-lifecycle] renewal reminder failed:", days, row.id, send.error);
          continue;
        }

        const { error: markErr } = await db
          .from("profiles")
          .update({ [column]: now.toISOString() })
          .eq("id", row.id)
          .is(column, null);

        if (markErr) {
          console.error("[plan-lifecycle] mark reminder failed:", days, row.id, markErr);
          // Resend idempotency still protects duplicates
        }
        remindersSent++;
      } catch (e) {
        reminderFailures++;
        console.error("[plan-lifecycle] renewal reminder error:", days, row.id, e);
      }
    }
  }

  return { remindersSent, reminderFailures };
}

/** Full lifecycle: demote then email (email retries independent of plan). */
export async function expireDuePlans(db: any): Promise<{
  expired: number;
  emailsSent: number;
  emailFailures: number;
}> {
  const { expired } = await demoteExpiredPlans(db);
  const { emailsSent, emailFailures } = await sendPendingExpirationEmails(db);
  return { expired, emailsSent, emailFailures };
}

export async function grantDueAnnualMonthlyCredits(db: any): Promise<{
  granted: number;
  failures: number;
}> {
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
  let failures = 0;

  for (const row of due || []) {
    if (row.plan_expires_at && new Date(row.plan_expires_at) <= now) continue;
    const planId = row.plan as PlanId;
    const credits = PLAN_CREDITS[planId] ?? 0;
    if (credits <= 0) continue;

    const grantKey = row.next_credit_grant_at;
    const txId = `annual_grant_${row.id}_${grantKey}`;

    const { data: existingTx } = await db
      .from("payment_transactions")
      .select("transaction_id, payment_status")
      .eq("transaction_id", txId)
      .maybeSingle();

    if (!existingTx) {
      const { error: insErr } = await db.from("payment_transactions").insert({
        user_id: row.id,
        payment_method: "system",
        amount: 0,
        currency: "USD",
        credits_purchased: credits,
        transaction_id: txId,
        payment_status: "pending",
        metadata: {
          kind: "annual_monthly_grant",
          plan: planId,
          grant_for: grantKey,
          billing_model: "one_time",
        },
      });
      if (insErr && insErr.code !== "23505") {
        console.error("[plan-lifecycle] annual tx insert failed:", row.id, insErr);
        failures++;
        continue;
      }
    }

    const { data: rpcData, error: rpcErr } = await db.rpc("apply_payment_credits", {
      _user_id: row.id,
      _transaction_id: txId,
      _credits: credits,
      _reason: "annual_monthly_grant",
    });

    if (rpcErr) {
      console.error("[plan-lifecycle] annual grant RPC failed:", row.id, rpcErr);
      failures++;
      continue;
    }

    const alreadyDone = rpcData?.alreadyDone === true;
    const credited = rpcData?.credited === true;
    if (!credited && !alreadyDone) {
      failures++;
      continue;
    }

    const next = computeNextCreditGrant(new Date(grantKey));
    const expires = row.plan_expires_at ? new Date(row.plan_expires_at) : null;
    const nextIso = expires && next > expires ? null : next.toISOString();

    const { error: casErr, data: updated } = await db
      .from("profiles")
      .update({
        next_credit_grant_at: nextIso,
        updated_at: nowIso,
      })
      .eq("id", row.id)
      .eq("next_credit_grant_at", grantKey)
      .select("id");

    if (casErr) {
      failures++;
      continue;
    }
    if (updated && updated.length > 0) granted++;
    else if (alreadyDone || credited) granted++;
  }
  return { granted, failures };
}

export function buildAnnualGrantTxId(userId: string, grantForIso: string): string {
  return `annual_grant_${userId}_${grantForIso}`;
}

/** Test helper: eligibility for email after demotion */
export function isExpirationEmailEligible(row: {
  plan_expires_at: string | null;
  expiration_email_sent_at: string | null;
  email?: string | null;
  now?: Date;
}): boolean {
  if (!row.plan_expires_at || row.expiration_email_sent_at) return false;
  if (!row.email) return false;
  const now = row.now || new Date();
  return new Date(row.plan_expires_at) <= now;
}
