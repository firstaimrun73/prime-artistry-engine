/**
 * Monthly Credit Spin — server functions.
 * Identity from auth only. Prize chosen server-side. Friendly errors only.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { randomBytes } from "node:crypto";
import {
  MONTHLY_SPIN_CAMPAIGN_ID,
  currentSpinPeriodKey,
  MONTHLY_SPIN_TIMEZONE_POLICY,
} from "./config";
import {
  MONTHLY_SPIN_GLOBAL_BUDGET_CREDITS,
  pickWeightedPrize,
} from "./server-weights";

export type MonthlySpinStatus = {
  ok: boolean;
  periodKey: string;
  timezonePolicy: string;
  alreadySpun: boolean;
  canSpin: boolean;
  lastCredits?: number;
  lastPrizeId?: string;
  message?: string;
};

export type MonthlySpinResult = {
  ok: boolean;
  reason?: string;
  message: string;
  periodKey?: string;
  prizeId?: string;
  creditsWon?: number;
  newBalance?: number;
  alreadySpun?: boolean;
};

function friendlyDbError(err: { message?: string; code?: string } | null): string {
  if (!err) return "Something went wrong. Please try again.";
  const m = String(err.message ?? "");
  if (/not_authenticated|jwt|auth/i.test(m)) return "Please sign in to spin.";
  if (/monthly_spin|relation|does not exist|PGRST/i.test(m)) {
    return "The monthly gift is almost ready. Please try again in a little while.";
  }
  if (/budget|limit/i.test(m)) return "This month's gift pool is paused. Try again next month.";
  return "We couldn't complete that spin. Please try again.";
}

export const getMonthlySpinStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MonthlySpinStatus> => {
    const periodKey = currentSpinPeriodKey();
    const base: MonthlySpinStatus = {
      ok: true,
      periodKey,
      timezonePolicy: MONTHLY_SPIN_TIMEZONE_POLICY,
      alreadySpun: false,
      canSpin: true,
    };
    try {
      const { data, error } = await context.supabase
        .from("monthly_spin_claims")
        .select("prize_id, credits_won")
        .eq("user_id", context.userId)
        .eq("period_key", periodKey)
        .maybeSingle();
      if (error) {
        // Table may not exist yet — still allow UI; spin will explain
        return { ...base, message: friendlyDbError(error) };
      }
      if (data) {
        return {
          ...base,
          alreadySpun: true,
          canSpin: false,
          lastCredits: (data as { credits_won?: number }).credits_won ?? 0,
          lastPrizeId: (data as { prize_id?: string }).prize_id,
          message: "You've already used this month's spin. Come back next month!",
        };
      }
      return base;
    } catch {
      return base;
    }
  });

export const spinMonthlyCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MonthlySpinResult> => {
    const periodKey = currentSpinPeriodKey();
    const userId = context.userId;

    // Cryptographic randomness — never client-supplied
    const buf = randomBytes(4);
    const random01 = buf.readUInt32BE(0) / 0x100000000;
    const prize = pickWeightedPrize(random01);
    const txId = `SPIN-${MONTHLY_SPIN_CAMPAIGN_ID}-${periodKey}-${userId}`;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as any;

      // Duplicate check under unique constraint
      const { data: existing } = await db
        .from("monthly_spin_claims")
        .select("prize_id, credits_won")
        .eq("user_id", userId)
        .eq("period_key", periodKey)
        .maybeSingle();

      if (existing) {
        return {
          ok: false,
          reason: "already_spun",
          alreadySpun: true,
          prizeId: existing.prize_id,
          creditsWon: existing.credits_won ?? 0,
          periodKey,
          message: "You've already used this month's spin. See you next month!",
        };
      }

      // Soft global budget
      const { data: sumRows } = await db
        .from("monthly_spin_claims")
        .select("credits_won")
        .eq("period_key", periodKey);
      const issued = (sumRows ?? []).reduce(
        (s: number, r: { credits_won?: number }) => s + (r.credits_won ?? 0),
        0,
      );
      let finalPrize = prize;
      if (issued + prize.credits > MONTHLY_SPIN_GLOBAL_BUDGET_CREDITS && prize.credits > 0) {
        finalPrize = { id: "lose", credits: 0, weight: 0 };
      }

      const { error: insertErr } = await db.from("monthly_spin_claims").insert({
        user_id: userId,
        period_key: periodKey,
        campaign_id: MONTHLY_SPIN_CAMPAIGN_ID,
        prize_id: finalPrize.id,
        credits_won: finalPrize.credits,
        transaction_id: txId,
      });

      if (insertErr) {
        if (/duplicate|unique|23505/i.test(String(insertErr.message))) {
          return {
            ok: false,
            reason: "already_spun",
            alreadySpun: true,
            periodKey,
            message: "You've already used this month's spin.",
          };
        }
        return {
          ok: false,
          reason: "unavailable",
          message: friendlyDbError(insertErr),
        };
      }

      let newBalance: number | undefined;
      if (finalPrize.credits > 0) {
        const { error: ledErr } = await db.from("credit_ledger").insert({
          user_id: userId,
          transaction_id: txId,
          credits_added: finalPrize.credits,
          reason: "monthly_spin",
        });
        if (ledErr && !/duplicate|unique|23505/i.test(String(ledErr.message))) {
          // Roll back claim row if ledger fails hard
          await db
            .from("monthly_spin_claims")
            .delete()
            .eq("user_id", userId)
            .eq("period_key", periodKey);
          return {
            ok: false,
            reason: "ledger_failed",
            message: "We couldn't add credits safely. Please try again.",
          };
        }

        const { data: profile, error: pErr } = await db
          .from("profiles")
          .select("credits")
          .eq("id", userId)
          .single();
        if (pErr || !profile) {
          return {
            ok: false,
            reason: "profile_missing",
            message: "Account not found. Please refresh and try again.",
          };
        }
        const next = Math.max(0, (profile.credits ?? 0) + finalPrize.credits);
        const { data: updated, error: uErr } = await db
          .from("profiles")
          .update({ credits: next, updated_at: new Date().toISOString() })
          .eq("id", userId)
          .select("credits")
          .single();
        if (uErr) {
          return {
            ok: false,
            reason: "credit_update_failed",
            message: "We couldn't update your balance. Please contact support if this continues.",
          };
        }
        newBalance = updated?.credits ?? next;
      } else {
        const { data: profile } = await db
          .from("profiles")
          .select("credits")
          .eq("id", userId)
          .maybeSingle();
        newBalance = profile?.credits;
      }

      if (finalPrize.credits > 0) {
        return {
          ok: true,
          periodKey,
          prizeId: finalPrize.id,
          creditsWon: finalPrize.credits,
          newBalance,
          message: `You won ${finalPrize.credits.toLocaleString()} credits!`,
        };
      }
      return {
        ok: true,
        periodKey,
        prizeId: "lose",
        creditsWon: 0,
        newBalance,
        message: "Better luck next time! Come back next month for another spin.",
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        reason: "error",
        message: friendlyDbError({ message: msg }),
      };
    }
  });
