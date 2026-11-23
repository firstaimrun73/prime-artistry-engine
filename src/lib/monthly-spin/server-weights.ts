/**
 * Server-only prize weights. Do not import this module from client UI bundles
 * if you need to keep exact weights private — server functions import it.
 */
import type { MonthlySpinPrizeId } from "./config";

export type WeightedPrize = {
  id: MonthlySpinPrizeId;
  credits: number;
  weight: number;
};

/**
 * Higher weight = more likely.
 * Default: most users see a miss or small prize; jackpot is rare.
 */
export const MONTHLY_SPIN_WEIGHTS: WeightedPrize[] = [
  { id: "lose", credits: 0, weight: 42 },
  { id: "c25", credits: 25, weight: 28 },
  { id: "c50", credits: 50, weight: 14 },
  { id: "c100", credits: 100, weight: 8 },
  { id: "c250", credits: 250, weight: 4 },
  { id: "c500", credits: 500, weight: 2.5 },
  { id: "c1000", credits: 1000, weight: 1.5 },
];

/** Soft monthly budget across all users (credits). Admin can raise later. */
export const MONTHLY_SPIN_GLOBAL_BUDGET_CREDITS = 50_000;

export function pickWeightedPrize(random01: number): WeightedPrize {
  const total = MONTHLY_SPIN_WEIGHTS.reduce((s, p) => s + p.weight, 0);
  let r = Math.max(0, Math.min(0.999999, random01)) * total;
  for (const p of MONTHLY_SPIN_WEIGHTS) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return MONTHLY_SPIN_WEIGHTS[MONTHLY_SPIN_WEIGHTS.length - 1]!;
}
