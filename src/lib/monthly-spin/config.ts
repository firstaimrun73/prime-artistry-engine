/**
 * Monthly Credit Spin — public prize labels only.
 * Actual weighted selection happens server-side. Never trust the client for outcomes.
 */

export const MONTHLY_SPIN_CAMPAIGN_ID = "monthly-spin-v1" as const;

/** Display order on the wheel (not probability). */
export const MONTHLY_SPIN_DISPLAY_PRIZES = [
  { id: "lose", label: "Better luck next time", credits: 0 },
  { id: "c25", label: "25 credits", credits: 25 },
  { id: "c50", label: "50 credits", credits: 50 },
  { id: "c100", label: "100 credits", credits: 100 },
  { id: "c250", label: "250 credits", credits: 250 },
  { id: "c500", label: "500 credits", credits: 500 },
  { id: "c1000", label: "1,000 credits", credits: 1000 },
] as const;

export type MonthlySpinPrizeId = (typeof MONTHLY_SPIN_DISPLAY_PRIZES)[number]["id"];

/** Timezone policy for monthly reset (documented for users). */
export const MONTHLY_SPIN_TIMEZONE_POLICY =
  "One spin per calendar month (UTC). Resets at 00:00 UTC on the 1st.";

export function currentSpinPeriodKey(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
