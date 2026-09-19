/**
 * Phase 3 — pure video route + quote module.
 * Server quote, reserved credits, and UI estimate all call quoteVideoCredits().
 *
 * Formula: credits = max(50, ceil(providerCostUsd * videoCreditsPerUsd))
 * videoCreditsPerUsd comes from DEFAULT_BILLING_CONFIG (180).
 *
 * Route selection uses the existing capability registry (no invented endpoints).
 * Expected cost matrix from the owner PDF may differ where registry COGS differ;
 * quote is always derived from registry COGS × 180 so UI and charge match.
 */

import {
  selectApprovedVideoRoute,
  computeProviderCogsUsd,
  type VideoGenMode,
  type VideoProductMode,
  type VideoResolution,
  type VideoAspect,
} from "@/lib/video/video-capability-registry";
import { DEFAULT_BILLING_CONFIG } from "@/lib/billing/types";
import { providerCogsToCustomerCredits } from "@/lib/billing/customer-pricing";

export type VideoRouteQuoteInput = {
  mode: VideoGenMode;
  /** Kept for registry compatibility; prefer "standard" from Video Studio. */
  productMode?: VideoProductMode;
  durationSec: number;
  resolution: VideoResolution;
  aspect: VideoAspect;
  audio: boolean;
};

export type VideoRouteQuote = {
  routeId: string;
  endpoint: string;
  provider: string;
  modelId: string;
  tier: VideoProductMode;
  providerCostUsd: number;
  credits: number;
  pricingVersion: string;
};

export type VideoRouteQuoteResult =
  | { ok: true; quote: VideoRouteQuote }
  | { ok: false; reason: string };

/**
 * Deterministic route + credit quote for Video Studio.
 * Returns null-path as { ok:false, reason } when no approved route exists.
 */
export function quoteVideoCredits(input: VideoRouteQuoteInput): VideoRouteQuoteResult {
  const productMode: VideoProductMode = input.productMode ?? "standard";
  const route = selectApprovedVideoRoute({
    mode: input.mode,
    productMode,
    durationSec: input.durationSec,
    resolution: input.resolution,
    aspect: input.aspect,
    audio: input.audio,
  });

  if (!route) {
    return {
      ok: false,
      reason: "No approved model supports this mode, duration, quality, and aspect.",
    };
  }

  const cogs = computeProviderCogsUsd({
    model: route.model,
    durationSec: input.durationSec,
    resolution: input.resolution,
    audio: input.audio,
  });
  if (cogs == null) {
    return {
      ok: false,
      reason: "Provider cost is unavailable for this selection.",
    };
  }

  const pricing = providerCogsToCustomerCredits(cogs, "video", DEFAULT_BILLING_CONFIG);

  return {
    ok: true,
    quote: {
      routeId: route.model.id,
      endpoint: route.endpoint,
      provider: route.model.provider,
      modelId: route.model.id,
      tier: productMode,
      providerCostUsd: pricing.providerCogsUsd,
      credits: pricing.customerCredits,
      pricingVersion: pricing.pricingVersion,
    },
  };
}

/** Credits-only helper for UI labels (same engine as server). */
export function estimateVideoCredits(input: VideoRouteQuoteInput): number | null {
  const r = quoteVideoCredits(input);
  return r.ok ? r.quote.credits : null;
}
