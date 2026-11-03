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
  const nextGrant = args.interval === "year" ? computeNextCreditGrant(now) : null;

  const { error } = await db
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

  if (error) {
    console.error("[plan-lifecycle] activate profile update failed:", error);
    throw new Error(error.message || "Failed to activate plan");
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

export async function expireDuePlans(db: any): Promise<{
  expired: number;
  emailsSent: number;
  emailFailures: number;
}> {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await db
    .from("profiles")
    .select(
      "id, email, display_name, plan, plan_expires_at, expiration_email_sent_at, billing_provider",
    )
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
    const planName = getPlan((row.plan as PlanId) || "free").name;

    const { error: upErr } = await db
      .from("profiles")
      .update({
        plan: "free",
        updated_at: nowIso,
        next_credit_grant_at: null,
      })
      .eq("id", row.id)
      .eq("plan", row.plan);

    if (upErr) {
      console.error("[plan-lifecycle] expire update failed:", row.id, upErr);
      continue;
    }
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

    if (row.expiration_email_sent_at) continue;
    if (!row.email) continue;

    try {
      const { sendPlanExpiredEmail } = await import("@/lib/email.server");
      const idempotencyKey = `plan-expired-${row.id}-${row.plan_expires_at || nowIso}`;
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
      // Only mark sent after confirmed delivery; CAS so concurrent cron does not double-mark incorrectly
      const { error: markErr, data: marked } = await db
        .from("profiles")
        .update({ expiration_email_sent_at: nowIso })
        .eq("id", row.id)
        .is("expiration_email_sent_at", null)
        .select("id");
      if (markErr) {
        console.error("[plan-lifecycle] mark email sent failed:", row.id, markErr);
      }
      if (marked && marked.length > 0) emailsSent++;
      else emailsSent++; // Resend idempotency may have delivered; count as sent
    } catch (e) {
      console.error("[plan-lifecycle] expiration email failed:", row.id, e);
      emailFailures++;
    }
  }

  return { expired, emailsSent, emailFailures };
}

/**
 * Monthly credit deposits for annual one-time plans still within validity.
 * Inserts a payment_transactions row so apply_payment_credits can run,
 * checks RPC error, and only advances next_credit_grant_at on success (CAS).
 */
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

    // Ensure payment_transactions row exists (required by apply_payment_credits)
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

    // rpcData may indicate alreadyDone — still advance schedule if ledger has the grant
    const alreadyDone = rpcData?.alreadyDone === true;
    const credited = rpcData?.credited === true;
    if (!credited && !alreadyDone) {
      console.error("[plan-lifecycle] annual grant unexpected result:", row.id, rpcData);
      failures++;
      continue;
    }

    const next = computeNextCreditGrant(new Date(grantKey));
    const expires = row.plan_expires_at ? new Date(row.plan_expires_at) : null;
    const nextIso = expires && next > expires ? null : next.toISOString();

    // CAS: only advance if next_credit_grant_at still equals the grant we processed
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
      console.error("[plan-lifecycle] CAS next_credit_grant failed:", row.id, casErr);
      failures++;
      continue;
    }
    if (updated && updated.length > 0) granted++;
    else if (alreadyDone || credited) granted++; // concurrent worker already advanced
  }
  return { granted, failures };
}

/** Pure helpers exported for unit tests */
export function buildAnnualGrantTxId(userId: string, grantForIso: string): string {
  return `annual_grant_${userId}_${grantForIso}`;
}
