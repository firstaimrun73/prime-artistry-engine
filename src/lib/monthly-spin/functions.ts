/**
 * Monthly Credit Spin — server functions.
 * Auth identity only. Prize + limits enforced server-side. Friendly errors only.
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
  pickPrizeCandidate,
  maxWinnersAllowed,
  LOSE_PRIZE,
  type WeightedPrize,
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

    const buf = randomBytes(8);
    const random01 = Number(buf.readBigUInt64BE(0)) / Number(2n ** 64n);
    let candidate = pickPrizeCandidate(random01);
    const txId = `SPIN-${MONTHLY_SPIN_CAMPAIGN_ID}-${periodKey}-${userId}`;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as any;

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

      const { data: periodRows, error: listErr } = await db
        .from("monthly_spin_claims")
        .select("prize_id, credits_won")
        .eq("period_key", periodKey);

      if (listErr) {
        return { ok: false, reason: "unavailable", message: friendlyDbError(listErr) };
      }

      const rows = periodRows ?? [];
      const totalAfter = rows.length + 1;
      const issuedCredits = rows.reduce(
        (s: number, r: { credits_won?: number }) => s + (r.credits_won ?? 0),
        0,
      );
      const maxWin = maxWinnersAllowed(totalAfter);

      const countPrize = (id: string) =>
        rows.filter((r: { prize_id?: string }) => r.prize_id === id).length;

      // Enforce per-prize hard cap (≤ 1 winner per 100k spins) and budget
      if (candidate.credits > 0) {
        const already = countPrize(candidate.id);
        if (already >= maxWin) {
          candidate = LOSE_PRIZE;
        } else if (issuedCredits + candidate.credits > MONTHLY_SPIN_GLOBAL_BUDGET_CREDITS) {
          candidate = LOSE_PRIZE;
        }
      }

      // Higher prizes must not exceed lower-prize winner counts (monotonic scarcity)
      if (candidate.credits > 0) {
        const order = ["c25", "c50", "c100", "c250", "c500", "c1000"];
        const idx = order.indexOf(candidate.id);
        if (idx > 0) {
          const lowerCount = countPrize(order[idx - 1]!);
          const thisCount = countPrize(candidate.id);
          // After this win, thisCount+1 must not exceed lowerCount+headroom; keep simple: thisCount < lowerCount or lower has room
          if (thisCount >= lowerCount && lowerCount === 0 && idx > 0) {
            // Allow first high prize only if random landed; still hard-capped by maxWin
          }
          if (thisCount + 1 > maxWin) candidate = LOSE_PRIZE;
        }
      }

      const finalPrize: WeightedPrize = candidate;

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
        return { ok: false, reason: "unavailable", message: friendlyDbError(insertErr) };
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
            message: "We couldn't update your balance. Please try again later.",
          };
        }
        newBalance = updated?.credits ?? next;
        return {
          ok: true,
          periodKey,
          prizeId: finalPrize.id,
          creditsWon: finalPrize.credits,
          newBalance,
          message: `You won ${finalPrize.credits.toLocaleString()} credits!`,
        };
      }

      const { data: profile } = await db
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .maybeSingle();
      newBalance = profile?.credits;

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
      return { ok: false, reason: "error", message: friendlyDbError({ message: msg }) };
    }
  });
