/**
 * Legacy Christmas campaign constants — UI disabled in favor of Monthly Credit Spin.
 * Server RPCs remain for any historical sessions; no new Christmas promo surface.
 */

export const CHRISTMAS_CAMPAIGN_ID = "christmas-gift-2026" as const;
export const CHRISTMAS_REWARD_CREDITS = 25;
export const CHRISTMAS_SESSION_SECONDS = 600;

export const CHRISTMAS_DISMISS_KEY = "motio2edit-christmas-promo-dismissed";
export const CHRISTMAS_NOTIF_SEEN_KEY = "motio2edit-christmas-notif-seen";

export function formatRemaining(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/** Christmas promo UI is retired — Monthly Credit Spin replaces it. */
export function isChristmasCampaignActiveWindow(): boolean {
  return false;
}
