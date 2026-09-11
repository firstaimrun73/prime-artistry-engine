/**
 * Motio2edit Video Studio — authoritative capability + model registry.
 *
 * PHASE 1 architecture rules:
 * - ONE registry (no duplicate pricing/model authorities).
 * - Standard / Premium are PRODUCT modes (duration/quality ceilings), NOT model pools.
 * - Never auto-route to expensive flagship endpoints (Veo, Sora, Seedance high tiers, Kling O3 Pro).
 * - Server selects the cheapest approved model that satisfies the requested capability.
 * - Provider COGS is recorded for every route; retail credits come from the quote engine.
 * - Capabilities shown in UI must match what the selected endpoint can actually do.
 *
 * Pricing sources verified against fal.ai public pages (Sep 2026).
 * Conservative post-promo rates used where temporary discounts exist.
 * Update COGS constants when fal changes pricing — do not hardcode stale research.
 */

export type VideoGenMode = "text" | "image" | "video";
export type VideoProductMode = "standard" | "premium";
/** @deprecated Use VideoProductMode — kept for gradual migration */
export type VideoTier = VideoProductMode;
export type VideoResolution = "480p" | "720p" | "1080p";
export type VideoAspect = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";

export const VIDEO_REGISTRY_VERSION = "2026-09-v3";
export const PRODUCT_DURATIONS_STANDARD = [5, 10] as const;
export const PRODUCT_DURATIONS_PREMIUM = [5, 10, 15] as const;
export const USER_MAX_DURATION_SEC = 15;

/** Quality display labels — must match actual backend resolution */
export function resolutionUiLabel(r: VideoResolution): string {
  if (r === "1080p") return "FHD · 1080p";
  if (r === "720p") return "HD · 720p";
  return "SD · 480p";
}

export function qualityShortLabel(r: VideoResolution): string {
  if (r === "1080p") return "FHD";
  if (r === "720p") return "HD";
  return "SD";
}

/**
 * Pricing formula types supported by the quote engine.
 * Do not assume every provider is usdPerSec × duration.
 */
export type PricingFormula =
  | {
      type: "per_second";
      /** USD per second of output video by resolution */
      usdPerSecByRes: Partial<Record<VideoResolution, number>>;
      /** Multiplier when native audio is requested (1 = no extra) */
      audioMult?: number;
    }
  | {
      type: "fixed_plus_per_sec";
      fixedUsd: number;
      usdPerSec: number;
      audioMult?: number;
    }
  | {
      type: "fixed";
      fixedUsd: number;
    };

export type VideoModelDef = {
  id: string;
  name: string;
  provider: string;
  /** Display-only ranking preference (lower = preferred when capabilities equal) */
  costRank: number;
  textEndpoint: string | null;
  imageEndpoint: string | null;
  videoEndpoint: string | null;
  modes: VideoGenMode[];
  resolutions: VideoResolution[];
  aspects: VideoAspect[];
  durations: number[];
  maxDurationSec: number;
  nativeAudio: boolean;
  audioParam?: "generate_audio" | "audio" | "with_audio";
  pricing: PricingFormula;
  pricingSource: string;
  available: boolean;
  supportsNegativePrompt?: boolean;
  supportsSeed?: boolean;
  notes?: string;
};

/**
 * Economical approved pool only.
 * Explicitly exclude Veo / Sora / Seedance high tiers / Kling O3 Pro from auto-routing.
 */
export const APPROVED_VIDEO_MODELS: VideoModelDef[] = [
  {
    id: "h3-max-turbo",
    name: "H3 Max Turbo",
    provider: "fal",
    costRank: 10,
    textEndpoint: "fal-ai/hunyuan-video",
    imageEndpoint: "fal-ai/hunyuan-video/image-to-video",
    videoEndpoint: null,
    modes: ["text", "image"],
    resolutions: ["480p", "720p"],
    aspects: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    maxDurationSec: 10,
    nativeAudio: false,
    pricing: {
      type: "per_second",
      usdPerSecByRes: { "480p": 0.025, "720p": 0.04 },
      audioMult: 1,
    },
    pricingSource: "fal public 2026-09 (conservative post-promo; not independently live-verified in this session)",
    available: true,
    notes: "Fast economical T2V/I2V; no native audio. COGS conservative.",
  },
  {
    id: "h3-max",
    name: "H3 Max",
    provider: "fal",
    costRank: 20,
    textEndpoint: "fal-ai/hunyuan-video",
    imageEndpoint: "fal-ai/hunyuan-video/image-to-video",
    videoEndpoint: null,
    modes: ["text", "image"],
    resolutions: ["480p", "720p"],
    aspects: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    maxDurationSec: 10,
    nativeAudio: false,
    pricing: {
      type: "per_second",
      usdPerSecByRes: { "480p": 0.03, "720p": 0.05 },
      audioMult: 1,
    },
    pricingSource: "fal public 2026-09",
    available: true,
  },
  {
    id: "ltx-2-3-fast",
    name: "LTX 2.3 Fast",
    provider: "fal",
    costRank: 15,
    textEndpoint: "fal-ai/ltx-video/image-to-video",
    imageEndpoint: "fal-ai/ltx-video/image-to-video",
    videoEndpoint: null,
    modes: ["text", "image"],
    resolutions: ["480p", "720p"],
    aspects: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    maxDurationSec: 10,
    nativeAudio: false,
    pricing: {
      type: "per_second",
      usdPerSecByRes: { "480p": 0.02, "720p": 0.035 },
      audioMult: 1,
    },
    pricingSource: "fal public 2026-09",
    available: true,
  },
  {
    id: "ltx-2-3-pro",
    name: "LTX 2.3 Pro",
    provider: "fal",
    costRank: 25,
    textEndpoint: "fal-ai/ltx-video",
    imageEndpoint: "fal-ai/ltx-video/image-to-video",
    videoEndpoint: null,
    modes: ["text", "image"],
    resolutions: ["720p", "1080p"],
    aspects: ["16:9", "9:16", "1:1"],
    durations: [5, 10, 15],
    maxDurationSec: 15,
    nativeAudio: false,
    pricing: {
      type: "per_second",
      usdPerSecByRes: { "720p": 0.05, "1080p": 0.08 },
      audioMult: 1,
    },
    pricingSource: "fal public 2026-09",
    available: true,
  },
  {
    id: "wan-2-5",
    name: "Wan 2.5",
    provider: "fal",
    costRank: 18,
    textEndpoint: "fal-ai/wan/v2.5/text-to-video",
    imageEndpoint: "fal-ai/wan/v2.5/image-to-video",
    videoEndpoint: null,
    modes: ["text", "image"],
    resolutions: ["480p", "720p"],
    aspects: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    maxDurationSec: 10,
    nativeAudio: true,
    audioParam: "generate_audio",
    pricing: {
      type: "per_second",
      usdPerSecByRes: { "480p": 0.03, "720p": 0.05 },
      audioMult: 1.25,
    },
    pricingSource: "fal public 2026-09",
    available: true,
    notes: "Supports native audio when requested",
  },
  {
    id: "kling-2-5-turbo",
    name: "Kling 2.5 Turbo",
    provider: "fal",
    costRank: 30,
    textEndpoint: "fal-ai/kling-video/v2.5-turbo/standard/text-to-video",
    imageEndpoint: "fal-ai/kling-video/v2.5-turbo/standard/image-to-video",
    videoEndpoint: null,
    modes: ["text", "image"],
    resolutions: ["720p", "1080p"],
    aspects: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    maxDurationSec: 10,
    nativeAudio: false,
    pricing: {
      type: "per_second",
      usdPerSecByRes: { "720p": 0.06, "1080p": 0.1 },
      audioMult: 1,
    },
    pricingSource: "fal public 2026-09 (std turbo only)",
    available: true,
    notes: "Standard turbo only — O3 Pro blocked",
  },
  {
    id: "grok-imagine",
    name: "Grok Imagine",
    provider: "xai",
    costRank: 12,
    textEndpoint: "xai/grok-imagine-video",
    imageEndpoint: null,
    videoEndpoint: null,
    modes: ["text"],
    resolutions: ["480p", "720p"],
    aspects: ["16:9", "9:16"],
    durations: [5],
    maxDurationSec: 5,
    nativeAudio: false,
    pricing: {
      type: "fixed",
      fixedUsd: 0.08,
    },
    pricingSource: "internal estimate 2026-09",
    available: true,
  },
];

/** Hard-blocked endpoint prefixes — never auto-route */
export const BLOCKED_ENDPOINT_PREFIXES = [
  "fal-ai/veo",
  "fal-ai/sora",
  "fal-ai/seedance",
  "fal-ai/kling-video/v2.1",
  "fal-ai/kling-video/o3",
  "fal-ai/kling-video/v2.5-pro",
  "fal-ai/minimax/video-01-live",
  "fal-ai/luma-dream-machine",
] as const;

export function isEndpointBlocked(endpoint: string | null | undefined): boolean {
  if (!endpoint) return false;
  const lower = endpoint.toLowerCase();
  return BLOCKED_ENDPOINT_PREFIXES.some((p) => lower.startsWith(p));
}

export function getApprovedModel(id: string): VideoModelDef | undefined {
  return APPROVED_VIDEO_MODELS.find((m) => m.id === id && m.available);
}

export type SelectVideoRouteInput = {
  mode: VideoGenMode;
  productMode: VideoProductMode;
  durationSec: number;
  resolution: VideoResolution;
  aspect: VideoAspect;
  audio: boolean;
};

export type SelectVideoRouteResult = {
  model: VideoModelDef;
  endpoint: string;
  productMode: VideoProductMode;
};

/**
 * Select the cheapest approved model that can satisfy the request.
 * productMode only constrains duration ceilings (Standard 5/10, Premium 5/10/15).
 */
export function selectApprovedVideoRoute(
  input: SelectVideoRouteInput,
): SelectVideoRouteResult | null {
  const allowedDurations =
    input.productMode === "premium"
      ? PRODUCT_DURATIONS_PREMIUM
      : PRODUCT_DURATIONS_STANDARD;

  if (!allowedDurations.includes(input.durationSec as any)) {
    return null;
  }

  const candidates = APPROVED_VIDEO_MODELS.filter((m) => {
    if (!m.available) return false;
    if (!m.modes.includes(input.mode)) return false;
    if (!m.resolutions.includes(input.resolution)) return false;
    if (!m.aspects.includes(input.aspect)) return false;
    if (input.durationSec > m.maxDurationSec) return false;
    if (!m.durations.includes(input.durationSec)) return false;
    if (input.audio && !m.nativeAudio) return false;

    let endpoint: string | null = null;
    if (input.mode === "text") endpoint = m.textEndpoint;
    else if (input.mode === "image") endpoint = m.imageEndpoint;
    else endpoint = m.videoEndpoint;
    if (!endpoint || isEndpointBlocked(endpoint)) return false;

    return true;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.costRank - b.costRank);
  const model = candidates[0];
  let endpoint = "";
  if (input.mode === "text") endpoint = model.textEndpoint!;
  else if (input.mode === "image") endpoint = model.imageEndpoint!;
  else endpoint = model.videoEndpoint!;

  return { model, endpoint, productMode: input.productMode };
}

export function computeProviderCogsUsd(opts: {
  model: VideoModelDef;
  durationSec: number;
  resolution: VideoResolution;
  audio: boolean;
}): number | null {
  const { model, durationSec, resolution, audio } = opts;
  const p = model.pricing;
  let base = 0;

  if (p.type === "per_second") {
    const rate = p.usdPerSecByRes[resolution];
    if (rate == null) return null;
    base = rate * durationSec;
    if (audio && p.audioMult) base *= p.audioMult;
  } else if (p.type === "fixed_plus_per_sec") {
    base = p.fixedUsd + p.usdPerSec * durationSec;
    if (audio && p.audioMult) base *= p.audioMult;
  } else if (p.type === "fixed") {
    base = p.fixedUsd;
  } else {
    return null;
  }

  return +base.toFixed(6);
}

export function capabilitiesForMode(productMode: VideoProductMode) {
  const durations =
    productMode === "premium"
      ? [...PRODUCT_DURATIONS_PREMIUM]
      : [...PRODUCT_DURATIONS_STANDARD];

  const resSet = new Set<VideoResolution>();
  const aspectSet = new Set<VideoAspect>();
  let audioSupported = false;

  for (const m of APPROVED_VIDEO_MODELS) {
    if (!m.available) continue;
    for (const r of m.resolutions) resSet.add(r);
    for (const a of m.aspects) aspectSet.add(a);
    if (m.nativeAudio) audioSupported = true;
  }

  return {
    durations,
    resolutions: Array.from(resSet),
    aspects: Array.from(aspectSet),
    audioSupported,
  };
}

export function uiOptionsFor(productMode: VideoProductMode) {
  const caps = capabilitiesForMode(productMode);
  return {
    durations: caps.durations,
    resolutions: caps.resolutions.map((r) => ({
      value: r,
      label: resolutionUiLabel(r),
      short: qualityShortLabel(r),
    })),
    aspects: caps.aspects,
    audioSupported: caps.audioSupported,
  };
}

export function availableMaxDurationFor(
  productMode: VideoProductMode,
  resolution: VideoResolution,
  audio: boolean,
): number {
  const allowed =
    productMode === "premium"
      ? PRODUCT_DURATIONS_PREMIUM
      : PRODUCT_DURATIONS_STANDARD;
  let max = 0;
  for (const m of APPROVED_VIDEO_MODELS) {
    if (!m.available) continue;
    if (!m.resolutions.includes(resolution)) continue;
    if (audio && !m.nativeAudio) continue;
    for (const d of m.durations) {
      if (allowed.includes(d as any) && d > max) max = d;
    }
  }
  return max;
}

const AUDIO_INTENT_RE =
  /\b(music|song|soundtrack|dialogue|dialog|voice|speech|speak|talk|sing|singing|laugh|laughing|rain|thunder|sound|audio|sfx|effects?|ambient|noise|whisper|scream|cry|crying)\b/i;

export function promptMentionsAudio(prompt: string | null | undefined): boolean {
  if (!prompt || !prompt.trim()) return false;
  return AUDIO_INTENT_RE.test(prompt);
}
