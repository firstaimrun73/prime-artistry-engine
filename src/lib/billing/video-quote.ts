/**
 * Video Studio quote entrypoint — no fixed credit prices.
 * Uses capability registry + provider COGS + Video COGS staircase.
 */

import type { VideoGenMode, VideoProductMode, VideoResolution, VideoAspect } from "@/lib/video/video-capability-registry";
import { resolveVideoProviderCost } from "./provider-cost";
import { createGenerationQuote } from "./quote-service";
import type { GenerationQuote } from "./types";
import { DEFAULT_BILLING_CONFIG } from "./types";
import { VIDEO_COGS_TIER_UNDEFINED } from "./customer-pricing";

export type VideoQuoteInput = {
  userId: string;
  mode: VideoGenMode;
  productMode: VideoProductMode;
  durationSec: number;
  resolution: VideoResolution;
  aspect: VideoAspect;
  audio: boolean;
  idempotencyKey?: string;
};

export type VideoQuoteResult =
  | { ok: true; quote: GenerationQuote; displayCredits: number }
  | { ok: false; code: "UNSUPPORTED_SETTINGS" | "VIDEO_COGS_TIER_UNDEFINED"; message: string };

/**
 * Server-side video quote. Client must display quote.customerCredits only.
 * Never trust client-supplied credits or model IDs for the charge.
 * Total provider COGS already includes audio when requested (via capability registry).
 */
export function quoteVideoGeneration(input: VideoQuoteInput): VideoQuoteResult {
  const cost = resolveVideoProviderCost({
    mode: input.mode,
    productMode: input.productMode,
    durationSec: input.durationSec,
    resolution: input.resolution,
    aspect: input.aspect,
    audio: input.audio,
  });

  if (!cost) {
    return {
      ok: false,
      code: "UNSUPPORTED_SETTINGS",
      message: "This video setting isn't available right now.",
    };
  }

  try {
    const quote = createGenerationQuote(
      {
        userId: input.userId,
        product: "video",
        operation: input.mode,
        provider: cost.provider,
        modelId: cost.modelId,
        endpoint: cost.endpoint,
        mode: input.mode,
        durationSec: input.durationSec,
        resolution: input.resolution,
        aspectRatio: input.aspect,
        audio: input.audio,
        providerCogsUsd: cost.providerCogsUsd,
        idempotencyKey: input.idempotencyKey,
        metadata: {
          productMode: input.productMode,
          pricingSource: cost.pricingSource,
        },
      },
      DEFAULT_BILLING_CONFIG,
    );

    return {
      ok: true,
      quote,
      displayCredits: quote.customerCredits,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === VIDEO_COGS_TIER_UNDEFINED) {
      return {
        ok: false,
        code: "VIDEO_COGS_TIER_UNDEFINED",
        message:
          "This video setting exceeds the current pricing range. Try a shorter duration or lower quality.",
      };
    }
    throw e;
  }
}
