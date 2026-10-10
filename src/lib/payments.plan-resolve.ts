/**
 * Resolve which paid plan (if any) a completed payment_transactions row should assign.
 * Pure helpers — no network. Used by capture handlers and PayPal webhook.
 *
 * Rules:
 * 1. Never assign a plan for credit top-ups (kind or transaction_id prefix).
 * 2. Prefer explicit metadata.plan when kind is plan_purchase.
 * 3. Legacy plan rows without metadata may use unique credit-count fallback.
 * 4. Custom top-up USD can yield plan-sized credit counts (e.g. $6.23 → 350);
 *    those must NEVER map to a plan via fallback.
 */

import { planFromCredits, type PurchasablePlan } from "@/lib/payments.server";

const PAID_PLANS = new Set(["lite", "plus", "pro", "studio", "business"]);

export type TxPlanSource = {
  transaction_id?: string | null;
  credits_purchased?: number | null;
  metadata?: {
    kind?: string;
    plan?: string;
  } | null;
};

export function isTopUpTransaction(tx: TxPlanSource): boolean {
  const kind = tx.metadata?.kind;
  if (kind === "credit_topup") return true;
  const id = String(tx.transaction_id || "");
  if (id.startsWith("topup_")) return true;
  return false;
}

export function resolvePlanToAssign(tx: TxPlanSource): PurchasablePlan | null {
  if (isTopUpTransaction(tx)) return null;

  const kind = tx.metadata?.kind;
  const metaPlan = tx.metadata?.plan;

  if (kind === "plan_purchase" && typeof metaPlan === "string" && PAID_PLANS.has(metaPlan)) {
    return metaPlan as PurchasablePlan;
  }

  // Explicit plan on non-top-up row (legacy partial metadata)
  if (!kind && typeof metaPlan === "string" && PAID_PLANS.has(metaPlan)) {
    return metaPlan as PurchasablePlan;
  }

  // Legacy plan purchases: no metadata at all — unique credit count only
  if (!kind && !metaPlan) {
    return planFromCredits(Number(tx.credits_purchased) || 0);
  }

  return null;
}
