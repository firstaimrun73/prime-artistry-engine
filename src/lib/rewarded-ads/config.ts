/**
 * Rewarded ads — configuration scaffold.
 * REWARDED_ADS_ENABLED stays false until provider credentials + signed callback work.
 */
import { REWARDED_ADS_ENABLED } from "./types";

export const REWARDED_AD_CONFIG = {
  enabled: REWARDED_ADS_ENABLED,
  /** Placeholder — set only after real provider integration */
  provider: null as null | "monetag" | "other",
  maxCreditsPerReward: 0,
  dailyCapPerUser: 0,
  cooldownSeconds: 0,
  /** Never invent CPM; fill from provider reports when available */
  economics: {
    confirmedRevenueOnly: true,
    safetyMarginRatio: 0.3,
  },
} as const;

export function isRewardedAdsLive(): boolean {
  return REWARDED_AD_CONFIG.enabled === true && REWARDED_AD_CONFIG.provider !== null;
}
