/**
 * Phase 4 — amount-based credit top-up pricing.
 * Shared by the top-up page (live preview) and the server grant path.
 * Never trust client-supplied credit counts; always recompute from USD.
 */

export const TOPUP_MIN_USD = 2;
export const TOPUP_MAX_USD = 1000;
/** Base credits per $1 before volume bonus. $2 → 150 credits. */
export const TOPUP_BASE_CREDITS_PER_USD = 75;

export const TOPUP_PRESETS_USD = [2, 5, 10, 20, 50, 100, 250, 500, 1000] as const;

/** Volume bonus fraction on top of the base rate. */
export function topupBonus(usd: number): number {
  if (usd >= 500) return 0.12;
  if (usd >= 250) return 0.1;
  if (usd >= 100) return 0.08;
  if (usd >= 50) return 0.05;
  return 0;
}

/**
 * Credits granted for a whole-dollar top-up amount.
 * Invalid amounts (non-integer, out of range) return null.
 */
export function creditsForTopup(usd: number): number | null {
  if (!Number.isFinite(usd) || !Number.isInteger(usd)) return null;
  if (usd < TOPUP_MIN_USD || usd > TOPUP_MAX_USD) return null;
  const bonus = topupBonus(usd);
  return Math.floor(usd * TOPUP_BASE_CREDITS_PER_USD * (1 + bonus));
}

export function effectiveUsdPerCredit(usd: number): number | null {
  const credits = creditsForTopup(usd);
  if (credits == null || credits <= 0) return null;
  return +(usd / credits).toFixed(6);
}

export function validateTopupAmount(usd: number): { ok: true; usd: number; credits: number } | { ok: false; message: string } {
  if (!Number.isFinite(usd) || !Number.isInteger(usd)) {
    return { ok: false, message: "Enter a whole-dollar amount." };
  }
  if (usd < TOPUP_MIN_USD) {
    return { ok: false, message: `Minimum top-up is $${TOPUP_MIN_USD}.` };
  }
  if (usd > TOPUP_MAX_USD) {
    return { ok: false, message: `Maximum top-up is $${TOPUP_MAX_USD}.` };
  }
  const credits = creditsForTopup(usd)!;
  return { ok: true, usd, credits };
}
