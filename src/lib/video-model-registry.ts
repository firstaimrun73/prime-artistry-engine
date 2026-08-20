/**
 * Video Studio model registry — verified fal.ai endpoint IDs only.
 * Do not invent endpoints. Unavailable models stay marked unavailable.
 *
 * Users never see fal model names in the UI.
 * Backend picks a model via selectVideoModel({ mode, tier, duration, resolution, aspect, soundOn }).
 *
 * Credit retail: $0.004 / credit.
 * Credits ≈ ceil((usdPerSec * duration * audioMult * resMult) / 0.004 * 1.25 buffer)
 */

export type VideoGenMode = "text" | "image" | "video";
export type VideoModelTierSection = "standard" | "premium";
export type VideoTier = VideoModelTierSection;
export type VideoResolution = "480p" | "720p" | "1080p" | "2k" | "4k";
export type VideoAspect = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";

export const USER_MAX_DURATION_SEC = 60;

/** Script/Custom flow: each segment ~20s, max 2 generations → 40s product cap. */
export const SCRIPT_SEGMENT_SEC = 20;
export const SCRIPT_MAX_SEGMENTS = 2;
export const SCRIPT_MAX_DURATION_SEC = SCRIPT_SEGMENT_SEC * SCRIPT_MAX_SEGMENTS;

export type VideoModelDef = {
  id: string;
  name: string;
  tier: VideoModelTierSection;
  bestUse: string;
  textEndpoint: string | null;
  imageEndpoint: string | null;
  videoEndpoint: string | null;
  modes: VideoGenMode[];
  nativeAudio: boolean;
  audioParam?: "generate_audio" | "audio";
  resolutions: VideoResolution[];
  aspects: VideoAspect[];
  durations: number[];
  maxDuration: number;
  usdPerSec: number;
  audioUsdMult: number;
  res4kMult?: number;
  available: boolean;
  supportsNegativePrompt?: boolean;
  supportsSeed?: boolean;
  supportsMotionStrength?: boolean;
};

export function estimateModelCredits(opts: {
  model: VideoModelDef;
  durationSec: number;
  resolution: VideoResolution;
  soundOn: boolean;
}): number {
  const { model, durationSec, resolution, soundOn } = opts;
  if (!model.available) return 0;
  const d = Math.min(Math.max(1, durationSec), model.maxDuration);
  let usd = model.usdPerSec * d;
  if (soundOn && model.nativeAudio) usd *= model.audioUsdMult;
  if (resolution === "4k" && model.res4kMult) usd *= model.res4kMult;
  else if (resolution === "2k") usd *= 1.35;
  else if (resolution === "1080p") usd *= 1.0;
  else if (resolution === "720p") usd *= 0.95;
  else if (resolution === "480p") usd *= 0.85;
  const credits = Math.ceil((usd / 0.004) * 1.25);
  return Math.max(15, credits);
}

export const VIDEO_MODELS: VideoModelDef[] = [
  {
    id: "kling-v3-standard",
    name: "Kling 3.0 Standard",
    tier: "standard",
    bestUse: "Balanced cinematic clips with optional audio",
    textEndpoint: "fal-ai/kling-video/v3/standard/text-to-video",
    imageEndpoint: "fal-ai/kling-video/v3/standard/image-to-video",
    videoEndpoint: null,
    modes: ["text", "image"],
    nativeAudio: true,
    audioParam: "generate_audio",
    resolutions: ["720p", "1080p"],
    aspects: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    maxDuration: 10,
    usdPerSec: 0.084,
    audioUsdMult: 1.5,
    available: true,
    supportsNegativePrompt: true,
  },
  {
    id: "kling-v3-turbo-std",
    name: "Kling 3.0 Turbo",
    tier: "standard",
    bestUse: "Fast 720p iteration with native audio",
    textEndpoint: "fal-ai/kling-video/v3/turbo/standard/text-to-video",
    imageEndpoint: null,
    videoEndpoint: null,
    modes: ["text"],
    nativeAudio: true,
    audioParam: "generate_audio",
    resolutions: ["720p"],
    aspects: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    maxDuration: 10,
    usdPerSec: 0.112,
    audioUsdMult: 1,
    available: true,
  },
  {
    id: "kling-2.5-turbo-pro",
    name: "Kling 2.5 Turbo Pro",
    tier: "standard",
    bestUse: "Fluid motion, strong prompt precision",
    textEndpoint: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
    imageEndpoint: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    videoEndpoint: null,
    modes: ["text", "image"],
    nativeAudio: false,
    resolutions: ["720p", "1080p"],
    aspects: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    maxDuration: 10,
    usdPerSec: 0.07,
    audioUsdMult: 1,
    available: true,
    supportsNegativePrompt: true,
    supportsMotionStrength: true,
  },
  {
    id: "kling-1.6-standard",
    name: "Kling 1.6 Standard",
    tier: "standard",
    bestUse: "Reliable low-cost drafts",
    textEndpoint: "fal-ai/kling-video/v1.6/standard/text-to-video",
    imageEndpoint: "fal-ai/kling-video/v1.6/standard/image-to-video",
    videoEndpoint: null,
    modes: ["text", "image"],
    nativeAudio: false,
    resolutions: ["720p"],
    aspects: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    maxDuration: 10,
    usdPerSec: 0.05,
    audioUsdMult: 1,
    available: true,
    supportsNegativePrompt: true,
  },
  {
    id: "kling-v3-pro",
    name: "Kling 3.0 Pro",
    tier: "premium",
    bestUse: "Cinematic multi-shot + native audio",
    textEndpoint: "fal-ai/kling-video/v3/pro/text-to-video",
    imageEndpoint: "fal-ai/kling-video/v3/pro/image-to-video",
    videoEndpoint: null,
    modes: ["text", "image"],
    nativeAudio: true,
    audioParam: "generate_audio",
    resolutions: ["720p", "1080p"],
    aspects: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    maxDuration: 10,
    usdPerSec: 0.112,
    audioUsdMult: 1.5,
    available: true,
    supportsNegativePrompt: true,
  },
  {
    id: "veo-3.1",
    name: "Veo 3.1",
    tier: "premium",
    bestUse: "4K, dialogue, lip-sync, true audio",
    textEndpoint: "fal-ai/veo3.1",
    imageEndpoint: "fal-ai/veo3.1/image-to-video",
    videoEndpoint: "fal-ai/veo3.1/extend-video",
    modes: ["text", "image", "video"],
    nativeAudio: true,
    audioParam: "generate_audio",
    resolutions: ["720p", "1080p", "4k"],
    aspects: ["16:9", "9:16"],
    durations: [5, 8],
    maxDuration: 8,
    usdPerSec: 0.2,
    audioUsdMult: 2,
    res4kMult: 2,
    available: true,
  },
  {
    id: "veo-3.1-fast",
    name: "Veo 3.1 Fast",
    tier: "premium",
    bestUse: "Faster Veo with audio, still up to 4K",
    textEndpoint: "fal-ai/veo3.1/fast",
    imageEndpoint: "fal-ai/veo3.1/fast/image-to-video",
    videoEndpoint: "fal-ai/veo3.1/fast/extend-video",
    modes: ["text", "image", "video"],
    nativeAudio: true,
    audioParam: "generate_audio",
    resolutions: ["720p", "1080p", "4k"],
    aspects: ["16:9", "9:16"],
    durations: [5, 8],
    maxDuration: 8,
    usdPerSec: 0.1,
    audioUsdMult: 1.5,
    res4kMult: 3,
    available: true,
  },
  {
    id: "seedance-2.0",
    name: "Seedance 2.0",
    tier: "premium",
    bestUse: "Cinematic physics + multi-shot audio",
    textEndpoint: "bytedance/seedance-2.0/text-to-video",
    imageEndpoint: "bytedance/seedance-2.0/image-to-video",
    videoEndpoint: null,
    modes: ["text", "image"],
    nativeAudio: true,
    audioParam: "generate_audio",
    resolutions: ["720p", "1080p"],
    aspects: ["16:9", "9:16", "1:1", "4:3", "21:9"],
    durations: [5, 10, 15],
    maxDuration: 15,
    usdPerSec: 0.3024,
    audioUsdMult: 1,
    available: true,
  },
  {
    id: "seedance-2.0-fast",
    name: "Seedance 2.0 Fast",
    tier: "premium",
    bestUse: "Faster Seedance with audio included",
    textEndpoint: "bytedance/seedance-2.0/fast/text-to-video",
    imageEndpoint: "bytedance/seedance-2.0/fast/image-to-video",
    videoEndpoint: null,
    modes: ["text", "image"],
    nativeAudio: true,
    audioParam: "generate_audio",
    resolutions: ["720p"],
    aspects: ["16:9", "9:16", "1:1"],
    durations: [5, 10, 15],
    maxDuration: 15,
    usdPerSec: 0.2419,
    audioUsdMult: 1,
    available: true,
  },
  {
    id: "sora-2",
    name: "Sora 2",
    tier: "premium",
    bestUse: "Detailed dynamic clips with audio",
    textEndpoint: "fal-ai/sora-2/text-to-video",
    imageEndpoint: "fal-ai/sora-2/image-to-video",
    videoEndpoint: "fal-ai/sora-2/video-to-video",
    modes: ["text", "image", "video"],
    nativeAudio: true,
    audioParam: "generate_audio",
    resolutions: ["720p", "1080p"],
    aspects: ["16:9", "9:16"],
    durations: [4, 8, 12],
    maxDuration: 12,
    usdPerSec: 0.3,
    audioUsdMult: 1,
    available: true,
  },
  {
    id: "sora-2-pro",
    name: "Sora 2 Pro",
    tier: "premium",
    bestUse: "Highest Sora fidelity",
    textEndpoint: "fal-ai/sora-2/pro/text-to-video",
    imageEndpoint: "fal-ai/sora-2/pro/image-to-video",
    videoEndpoint: null,
    modes: ["text", "image"],
    nativeAudio: true,
    audioParam: "generate_audio",
    resolutions: ["720p", "1080p"],
    aspects: ["16:9", "9:16"],
    durations: [4, 8],
    maxDuration: 8,
    usdPerSec: 0.5,
    audioUsdMult: 1,
    available: true,
  },
  {
    id: "grok-imagine-video",
    name: "Grok Imagine Video",
    tier: "premium",
    bestUse: "Fast clips with audio (xAI)",
    textEndpoint: "xai/grok-imagine-video/text-to-video",
    imageEndpoint: "xai/grok-imagine-video/image-to-video",
    videoEndpoint: "xai/grok-imagine-video/extend-video",
    modes: ["text", "image", "video"],
    nativeAudio: true,
    audioParam: "generate_audio",
    resolutions: ["480p", "720p"],
    aspects: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    durations: [5, 8, 10, 15],
    maxDuration: 15,
    usdPerSec: 0.05,
    audioUsdMult: 1,
    available: true,
  },
  {
    id: "ltx-2.3-pro",
    name: "LTX 2.3 Pro",
    tier: "premium",
    bestUse: "Open-weights flexibility, up to 4K",
    textEndpoint: "fal-ai/ltx-2-19b/text-to-video",
    imageEndpoint: "fal-ai/ltx-2-19b/image-to-video",
    videoEndpoint: "fal-ai/ltx-2-19b/video-to-video",
    modes: ["text", "image", "video"],
    nativeAudio: true,
    audioParam: "generate_audio",
    resolutions: ["720p", "1080p", "4k"],
    aspects: ["16:9", "9:16"],
    durations: [5, 8, 10],
    maxDuration: 10,
    usdPerSec: 0.08,
    audioUsdMult: 1,
    available: true,
  },
];

export function getVideoModel(id: string): VideoModelDef | undefined {
  return VIDEO_MODELS.find((m) => m.id === id);
}

export function modelsForMode(mode: VideoGenMode): VideoModelDef[] {
  return VIDEO_MODELS.filter((m) => m.available && m.modes.includes(mode));
}

export function modelsInTier(tier: VideoTier, mode: VideoGenMode): VideoModelDef[] {
  return VIDEO_MODELS.filter((m) => m.available && m.tier === tier && m.modes.includes(mode));
}

export function capabilitiesForTier(tier: VideoTier, mode: VideoGenMode): {
  aspects: VideoAspect[];
  resolutions: VideoResolution[];
  durations: number[];
  maxDuration: number;
  nativeAudio: boolean;
  supportsNegativePrompt: boolean;
} {
  const list = modelsInTier(tier, mode);
  if (list.length === 0) {
    return {
      aspects: ["16:9"],
      resolutions: ["720p"],
      durations: [5],
      maxDuration: 5,
      nativeAudio: false,
      supportsNegativePrompt: false,
    };
  }
  const aspects = Array.from(new Set(list.flatMap((m) => m.aspects))) as VideoAspect[];
  const resolutions = Array.from(new Set(list.flatMap((m) => m.resolutions))) as VideoResolution[];
  const durations = Array.from(new Set(list.flatMap((m) => m.durations))).sort((a, b) => a - b);
  const maxDuration = Math.max(...list.map((m) => m.maxDuration));
  const nativeAudio = list.some((m) => m.nativeAudio);
  const supportsNegativePrompt = list.some((m) => m.supportsNegativePrompt);
  const aspectOrder: VideoAspect[] = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];
  const resOrder: VideoResolution[] = ["480p", "720p", "1080p", "2k", "4k"];
  return {
    aspects: aspectOrder.filter((a) => aspects.includes(a)),
    resolutions: resOrder.filter((r) => resolutions.includes(r)),
    durations,
    maxDuration,
    nativeAudio,
    supportsNegativePrompt,
  };
}

export function selectVideoModel(opts: {
  mode: VideoGenMode;
  tier: VideoTier;
  durationSec: number;
  resolution: VideoResolution;
  aspect: VideoAspect;
  soundOn: boolean;
}): VideoModelDef | null {
  const { mode, tier, durationSec, resolution, aspect, soundOn } = opts;
  let candidates = modelsInTier(tier, mode);
  if (candidates.length === 0 && tier === "premium") {
    candidates = modelsInTier("standard", mode);
  }
  if (candidates.length === 0) return null;

  candidates = candidates.filter((m) => {
    if (durationSec > m.maxDuration) return false;
    if (!m.resolutions.includes(resolution)) return false;
    if (!m.aspects.includes(aspect)) return false;
    if (mode === "video" && !m.videoEndpoint) return false;
    if (mode === "image" && !m.imageEndpoint) return false;
    if (mode === "text" && !m.textEndpoint) return false;
    if (soundOn && !m.nativeAudio) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const aDur = a.durations.includes(durationSec) ? 0 : 1;
    const bDur = b.durations.includes(durationSec) ? 0 : 1;
    if (aDur !== bDur) return aDur - bDur;
    const aCost = a.usdPerSec * (soundOn && a.nativeAudio ? a.audioUsdMult : 1);
    const bCost = b.usdPerSec * (soundOn && b.nativeAudio ? b.audioUsdMult : 1);
    return aCost - bCost;
  });

  return candidates[0] ?? null;
}

export function videoSelectionUnavailableMessage(opts: {
  mode: VideoGenMode;
  tier: VideoTier;
  durationSec: number;
  resolution: VideoResolution;
  aspect: VideoAspect;
  soundOn: boolean;
}): string {
  if (opts.soundOn) {
    const withoutSound = selectVideoModel({ ...opts, soundOn: false });
    if (withoutSound) {
      return "Synchronized sound is not available for this combination of mode, duration, resolution, and aspect ratio. Turn sound off or change settings.";
    }
  }
  if (opts.mode === "video") {
    return "Video → Video isn't available for these settings. Try Text → Video or Image → Video, or adjust duration/resolution.";
  }
  return "This combination isn't available yet. Try a shorter duration, different resolution, or another aspect ratio.";
}

/** Max duration the backend can fulfill for this tier/mode (union of models). */
export function availableMaxDurationFor(tier: VideoTier, mode: VideoGenMode): number {
  const list = modelsInTier(tier, mode);
  if (list.length === 0 && tier === "premium") {
    return availableMaxDurationFor("standard", mode);
  }
  if (list.length === 0) return 0;
  return Math.min(USER_MAX_DURATION_SEC, Math.max(...list.map((m) => m.maxDuration)));
}

export function defaultModelForMode(mode: VideoGenMode): VideoModelDef {
  const list = modelsForMode(mode);
  return list.find((m) => m.tier === "standard") ?? list[0] ?? VIDEO_MODELS[0];
}

export function estimateRequestCredits(opts: {
  mode: VideoGenMode;
  tier: VideoTier;
  durationSec: number;
  resolution: VideoResolution;
  aspect: VideoAspect;
  soundOn: boolean;
}): number {
  const model = selectVideoModel(opts);
  if (!model) return 0;
  return estimateModelCredits({
    model,
    durationSec: opts.durationSec,
    resolution: opts.resolution,
    soundOn: opts.soundOn && model.nativeAudio,
  });
}

export const VIDEO_STYLE_MODIFIERS: Record<string, string> = {
  classic: "classic film look, natural color grading",
  retro: "retro 1980s aesthetic, soft grain, warm tones",
  vintage: "vintage film stock, faded colors, subtle scratches",
  cinematic: "cinematic lighting, anamorphic lens, shallow depth of field",
  documentary: "documentary style, handheld feel, natural light",
  anime: "anime style, clean lines, vibrant colors",
  film: "35mm film photography look, rich contrast",
  product: "product commercial, clean studio lighting, sharp detail",
  social: "vertical social media style, bold colors, energetic",
};

export function applyVideoStyle(prompt: string, styleId: string | null | undefined): string {
  if (!styleId || !VIDEO_STYLE_MODIFIERS[styleId]) return prompt;
  const mod = VIDEO_STYLE_MODIFIERS[styleId];
  const p = prompt.trim();
  if (!p) return mod;
  if (p.toLowerCase().includes(mod.split(",")[0].toLowerCase())) return p;
  return `${p}. ${mod}.`;
}
