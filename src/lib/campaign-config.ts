/**
 * Seasonal / promotional campaign configuration.
 * Copy and windows live here so UI components do not hard-code seasonal text.
 * Server claim logic remains authoritative for credits.
 */

export type CampaignId = "christmas-gift-2026" | "default-explore";

export type CampaignConfig = {
  id: CampaignId;
  /** Inclusive start (UTC ms) */
  startUtcMs: number;
  /** Exclusive end (UTC ms) */
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

/** Christmas window: 20 Nov 2026 – 6 Jan 2027 (local display; eligibility is server-side). */
export const CHRISTMAS_GIFT_2026: CampaignConfig = {
  id: "christmas-gift-2026",
  startUtcMs: Date.UTC(2026, 10, 20),
  endUtcMs: Date.UTC(2027, 0, 7),
  rewardCredits: 25,
  sessionSeconds: 600,
  title: "Get Your Christmas Gift",
  shortTitle: "Christmas Gift",
  headline: "Stay, Explore & Get Free Credits!",
  body: "Explore Motio2edit for 10 minutes, then claim 25 credits — enough for one Standard image generation.",
  ctaStart: "Start Christmas Gift Campaign",
  ctaClaim: "Claim 25 Free Credits",
  emoji: "🎄",
};

/** Fallback after Christmas window ends — still points users to explore + pricing. */
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
  if (nowMs >= CHRISTMAS_GIFT_2026.startUtcMs && nowMs < CHRISTMAS_GIFT_2026.endUtcMs) {
    return CHRISTMAS_GIFT_2026;
  }
  return DEFAULT_EXPLORE_CAMPAIGN;
}

export function isChristmasGiftActive(nowMs: number = Date.now()): boolean {
  return getActiveCampaignConfig(nowMs).id === "christmas-gift-2026";
}
