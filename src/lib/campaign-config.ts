/**
 * Public campaign copy and windows.
 * Christmas gift claim UI is retired (isChristmasGiftActive always false).
 */

export type CampaignId = "christmas-gift-2026" | "explore-default";

export type CampaignConfig = {
  id: CampaignId;
  title: string;
  shortTitle: string;
  description: string;
  badge?: string;
  ctaStart: string;
  ctaClaim: string;
  creditsLabel?: string;
};

/** Christmas window retained for historical reference only — not activated. */
export const CHRISTMAS_GIFT_START_MS = Date.UTC(2026, 10, 20, 0, 0, 0);
export const CHRISTMAS_GIFT_END_MS = Date.UTC(2027, 0, 6, 23, 59, 59);

const CHRISTMAS_GIFT_2026: CampaignConfig = {
  id: "christmas-gift-2026",
  title: "Explore Motio2edit",
  shortTitle: "Explore",
  description: "Create with AI tools. Credits come from your plan — not from ads.",
  badge: undefined,
  ctaStart: "Open Studio",
  ctaClaim: "View pricing",
  creditsLabel: undefined,
};

/** Default explore campaign — no free-credit claim. */
export const DEFAULT_EXPLORE_CAMPAIGN: CampaignConfig = {
  id: "explore-default",
  title: "Create with Motio2edit",
  shortTitle: "Create",
  description: "Image, video, and music tools in one studio.",
  ctaStart: "Open Studio",
  ctaClaim: "View pricing",
};

export function getActiveCampaignConfig(nowMs: number = Date.now()): CampaignConfig {
  void nowMs;
  return DEFAULT_EXPLORE_CAMPAIGN;
}

export function isChristmasGiftActive(_nowMs: number = Date.now()): boolean {
  // Campaign retired — no free-credit claim UI or messaging.
  return false;
}
