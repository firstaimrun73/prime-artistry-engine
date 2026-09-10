/**
 * ProviderCostCalculator — actual backend COGS only.
 * Never shown to normal users. Never treated as Motio2edit credits.
 */

import {
  computeProviderCogsUsd,
  selectApprovedVideoRoute,
  type VideoGenMode,
  type VideoProductMode,
  type VideoResolution,
  type VideoAspect,
} from "@/lib/video/video-capability-registry";

export type ProviderCostResult = {
  provider: string;
  modelId: string;
  endpoint: string;
  providerCogsUsd: number;
  formula: string;
  pricingSource: string;
};

export function resolveVideoProviderCost(input: {
  mode: VideoGenMode;
  productMode: VideoProductMode;
  durationSec: number;
  resolution: VideoResolution;
  aspect: VideoAspect;
  audio: boolean;
}): ProviderCostResult | null {
  const route = selectApprovedVideoRoute(input);
  if (!route) return null;

  const cogs = computeProviderCogsUsd({
    model: route.model,
    durationSec: input.durationSec,
    resolution: input.resolution,
    audio: input.audio,
  });
  if (cogs == null) return null;

  return {
    provider: route.model.provider,
    modelId: route.model.id,
    endpoint: route.endpoint,
    providerCogsUsd: cogs,
    formula: route.model.pricing.type,
    pricingSource: "video-capability-registry@2026-09-v3",
  };
}

export function providerCostFromUsd(
  provider: string,
  modelId: string,
  endpoint: string,
  providerCogsUsd: number,
  formula = "fixed",
): ProviderCostResult {
  return {
    provider,
    modelId,
    endpoint,
    providerCogsUsd: +providerCogsUsd.toFixed(6),
    formula,
    pricingSource: "caller",
  };
}
