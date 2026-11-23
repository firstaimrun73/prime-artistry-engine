/**
 * Server-only monthly spin prize policy.
 * Extreme scarcity: at most one winner per prize level per 100,000 spins in the period.
 * Zero credits (Better luck next time) is a genuine, common outcome — never a guaranteed 25.
 */
import type { MonthlySpinPrizeId } from "./config";

export type WeightedPrize = {
  id: MonthlySpinPrizeId;
  credits: number;
};

/** Credit prizes only (ordered high → low for slot checks). */
export const CREDIT_PRIZES: WeightedPrize[] = [
  { id: "c1000", credits: 1000 },
  { id: "c500", credits: 500 },
  { id: "c250", credits: 250 },
  { id: "c100", credits: 100 },
  { id: "c50", credits: 50 },
  { id: "c25", credits: 25 },
];

export const LOSE_PRIZE: WeightedPrize = { id: "lose", credits: 0 };

/** One winner slot per this many eligible spins, per prize level. */
export const WINNERS_PER_SPINS_BLOCK = 100_000;

/** Soft monthly credit budget across all awards. */
export const MONTHLY_SPIN_GLOBAL_BUDGET_CREDITS = 25_000;

/**
 * Max winners allowed for a prize after `totalSpins` in the period
 * (including the spin about to be recorded).
 * ceil(n/100000) → at most 1 in the first 100k, 2 in the next, etc.
 */
export function maxWinnersAllowed(totalSpinsIncludingThis: number): number {
  if (totalSpinsIncludingThis <= 0) return 0;
  return Math.ceil(totalSpinsIncludingThis / WINNERS_PER_SPINS_BLOCK);
}

/**
 * Pick prize using secure random01 in [0,1).
 * Each credit prize competes for a single random slot of size 1/100000
 * (independent checks from high to low). Most spins land on lose.
 * Caller must still enforce hard winner counts vs DB.
 */
export function pickPrizeCandidate(random01: number): WeightedPrize {
  const r = Math.max(0, Math.min(0.999999999, random01));
  // Map into a large integer space so each prize has ~1/100000 base chance
  const space = WINNERS_PER_SPINS_BLOCK;
  const bucket = Math.floor(r * space * CREDIT_PRIZES.length);
  const prizeIndex = Math.floor(bucket / space);
  const slot = bucket % space;
  // Only the 0-slot within each prize band is a candidate win (~1/100000 per prize band)
  if (slot === 0 && prizeIndex >= 0 && prizeIndex < CREDIT_PRIZES.length) {
    return CREDIT_PRIZES[prizeIndex]!;
  }
  return LOSE_PRIZE;
}

/** @deprecated kept for any residual imports */
export function pickWeightedPrize(random01: number): WeightedPrize {
  return pickPrizeCandidate(random01);
}

export const MONTHLY_SPIN_WEIGHTS = [
  { ...LOSE_PRIZE, weight: 1 },
  ...CREDIT_PRIZES.map((p) => ({ ...p, weight: 0 })),
];
