/**
 * Seasonal / promotional campaign configuration.
 * UI reads active campaign copy; server remains authoritative for credit grants.
 * Guaranteed seasonal gift is always exactly 25 credits.
 */

export type CampaignId = "winter-gift-2026" | "default-explore";

export type CampaignConfig = {
  id: CampaignId;
  startUtcMs: number;
  endUtcMs: number;
  rewardCredits: number;
  sessionSeconds: number;
  title: string;
  shortTitle: string;
  headline: string;
  body: string;
  ctaStart: string;
  ctaClaim: string;
  emoji: string;
};

/** Winter window: 20 Nov 2026 – 6 Mar 2027 */
export const WINTER_GIFT_2026: CampaignConfig = {
  id: "winter-gift-2026",
  startUtcMs: Date.UTC(2026, 10, 20),
  endUtcMs: Date.UTC(2027, 2, 7),
  rewardCredits: 25,
  sessionSeconds: 600,
  title: "Winter Gift",
  shortTitle: "Winter Gift",
  headline: "Winter Gift Is Here! ❄️",
  body: "Enjoy a special gift from Motio2edit. Claim your free credits and keep creating!",
  ctaStart: "Start Winter Gift",
  ctaClaim: "Claim 25 Free Credits",
  emoji: "❄️",
};

export const DEFAULT_EXPLORE_CAMPAIGN: CampaignConfig = {
  id: "default-explore",
  startUtcMs: 0,
  endUtcMs: Number.MAX_SAFE_INTEGER,
  rewardCredits: 0,
  sessionSeconds: 0,
  title: "Free credits & plans",
  shortTitle: "Credits",
  headline: "Need more credits?",
  body: "Upgrade for monthly credits, or check Pricing for current offers. Free plan includes starter credits on signup.",
  ctaStart: "View pricing",
  ctaClaim: "View pricing",
  emoji: "✨",
};

export function getActiveCampaignConfig(nowMs: number = Date.now()): CampaignConfig {
  if (nowMs >= WINTER_GIFT_2026.startUtcMs && nowMs < WINTER_GIFT_2026.endUtcMs) {
    return WINTER_GIFT_2026;
  }
  return DEFAULT_EXPLORE_CAMPAIGN;
}

export function isSeasonalGiftActive(nowMs: number = Date.now()): boolean {
  const c = getActiveCampaignConfig(nowMs);
  return c.rewardCredits === 25 && c.id !== "default-explore";
}

/** Always 25 for the guaranteed seasonal gift — never change without product approval. */
export const SEASONAL_GIFT_CREDITS = 25 as const;
