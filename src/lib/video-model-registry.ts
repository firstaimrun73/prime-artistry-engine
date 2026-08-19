/**
 * Video Studio model registry — verified fal.ai endpoint IDs only.
 * Do not invent endpoints. Unavailable models stay marked unavailable.
 *
 * Credit retail: $0.004 / credit (video-pricing.ts).
 * Credits ≈ ceil((usdPerSec * duration * audioMult * resMult) / 0.004 * 1.25 buffer)
 */

export type VideoGenMode = "text" | "image" | "video";
export type VideoModelTierSection = "standard" | "premium";
export type VideoResolution = "480p" | "720p" | "1080p" | "4k";
export type VideoAspect = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";

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

export function defaultModelForMode(mode: VideoGenMode): VideoModelDef {
  const list = modelsForMode(mode);
  return list.find((m) => m.tier === "standard") ?? list[0] ?? VIDEO_MODELS[0];
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
