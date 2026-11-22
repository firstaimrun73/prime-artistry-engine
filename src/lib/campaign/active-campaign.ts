/**
 * Resolves the active seasonal gift campaign from local config.
 * Production should prefer campaign_config rows from Supabase when available.
 * Frontend must not hard-code seasonal date branches outside this module.
 */
import {
  CHRISTMAS_GIFT_2026,
  DEFAULT_EXPLORE_CAMPAIGN,
  type CampaignConfig,
  getActiveCampaignConfig,
  isChristmasGiftActive,
} from "@/lib/campaign-config";
import {
  CHRISTMAS_2026_PLACEMENTS,
  FALLBACK_PLACEMENTS,
  type CampaignPlacementCopy,
  type PlacementId,
  placementLabel,
} from "@/lib/campaign/placement-copy";

export type ActiveCampaignView = {
  config: CampaignConfig;
  placements: CampaignPlacementCopy;
  isGiftCampaign: boolean;
  showSeasonalPromo: boolean;
};

export function resolveActiveCampaign(nowMs: number = Date.now()): ActiveCampaignView {
  const config = getActiveCampaignConfig(nowMs);
  const isGift = config.id === "christmas-gift-2026" && isChristmasGiftActive(nowMs);
  return {
    config,
    placements: isGift ? CHRISTMAS_2026_PLACEMENTS : FALLBACK_PLACEMENTS,
    isGiftCampaign: isGift,
    showSeasonalPromo: isGift && config.rewardCredits > 0,
  };
}

export function labelForPlacement(placement: PlacementId, nowMs?: number): string {
  const active = resolveActiveCampaign(nowMs);
  if (!active.showSeasonalPromo && placement !== "pricing" && placement !== "prize") {
    return placementLabel(placement, FALLBACK_PLACEMENTS);
  }
  return placementLabel(placement, active.placements);
}

export { CHRISTMAS_GIFT_2026, DEFAULT_EXPLORE_CAMPAIGN };
