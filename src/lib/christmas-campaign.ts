/**
 * Christmas Gift Campaign 2026 — client constants & helpers.
 * Server is authoritative for eligibility and credit grant.
 * Does NOT touch sponsor-unlock / watermark localStorage.
 */

export const CHRISTMAS_CAMPAIGN_ID = "christmas-gift-2026" as const;
export const CHRISTMAS_REWARD_CREDITS = 25;
export const CHRISTMAS_SESSION_SECONDS = 600; // 10 minutes

/** Local dismiss keys only — never used as proof of reward. */
export const CHRISTMAS_DISMISS_KEY = "motio2edit-christmas-promo-dismissed";
export const CHRISTMAS_NOTIF_SEEN_KEY = "motio2edit-christmas-notif-seen";

export function formatRemaining(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function isChristmasCampaignActiveWindow(): boolean {
  // Soft window: Nov 20 2026 – Jan 6 2027 (inclusive of local day)
  const now = Date.now();
  const start = Date.UTC(2026, 10, 20); // month 0-indexed
  const end = Date.UTC(2027, 0, 7);
  return now >= start && now < end;
}
