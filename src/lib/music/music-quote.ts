/**
 * Authoritative Music credit quote — UI estimate and generateMusic MUST use this.
 * Never trust client price / plan / model.
 */
import {
  estimateCredits,
  getRegistryEntry,
  type RegistryEntry,
} from "@/lib/generation-cost-registry";
import type { PlanId } from "@/lib/plans";
import {
  assertMusicModeAllowed,
  assertMusicQualityAllowed,
  getMusicPlanCapabilities,
  MMAUDIO_MAX_SEGMENT_SECONDS,
  type MusicMode,
  type MusicQualityTier,
  type VideoAudioMode,
} from "@/lib/music/music-plan-capabilities";

export const MUSIC_PRICING_VERSION = "music-v2026-09-29";

/** Product floors (customer credits). */
const FLOOR = {
  song_standard: 50,
  song_premium: 100,
  instrumental_standard: 50,
  instrumental_premium: 100,
  bgm_standard: 50,
  bgm_premium: 100,
  sfx: 25,
  video_music: 40,
  voiceover: 30,
  image_analysis: 15,
} as const;

export type MusicQuoteInput = {
  plan: PlanId;
  mode: MusicMode;
  qualityTier?: MusicQualityTier;
  durationSeconds?: number;
  characters?: number;
  lyricsCharacters?: number;
  hasVideo?: boolean;
  hasImage?: boolean;
  videoAudioMode?: VideoAudioMode;
};

export type MusicQuoteResult = {
  allowed: boolean;
  reason: string | null;
  plan: PlanId;
  mode: MusicMode;
  qualityTier: MusicQualityTier;
  provider: string;
  modelId: string;
  /** Safe customer-facing label — never raw fal path in UI. */
  modelLabel: string;
  providerCostUsd: number;
  customerCredits: number;
  promptMaxChars: number;
  lyricsMaxChars: number;
  durationRequested: number;
  durationBillable: number;
  segments: number;
  breakdown: {
    providerBaseCost: number;
    processingCost: number;
    imageAnalysisCost: number;
    videoProcessingCost: number;
    platformCostAllowance: number;
  };
  pricingVersion: string;
  registryId: string;
  videoAudioMode: VideoAudioMode;
};

function resolveMode(mode: MusicMode, hasVideo: boolean): MusicMode {
  if (hasVideo && (mode === "song" || mode === "instrumental" || mode === "bgm" || mode === "sfx" || mode === "video_music")) {
    return "video_music";
  }
  if (mode === "bgm") return "bgm";
  return mode;
}

function registryFor(mode: MusicMode, quality: MusicQualityTier, hasVideo: boolean): RegistryEntry {
  if (mode === "voiceover") {
    const e = getRegistryEntry("tts_xai");
    if (!e?.enabled) throw new Error("Voiceover pricing not configured.");
    return e;
  }
  if (mode === "video_music" || hasVideo) {
    const e = getRegistryEntry("sfx_mmaudio_v2");
    if (!e?.enabled) throw new Error("Video→music pricing not configured.");
    return e;
  }
  if (mode === "sfx") {
    const e = getRegistryEntry("sfx_mmaudio_text");
    if (!e?.enabled) throw new Error("SFX pricing not configured.");
    return e;
  }
  // song | instrumental | bgm
  if (quality === "premium") {
    const e = getRegistryEntry("music_minimax_v26");
    if (e?.enabled) return e;
  }
  const e = getRegistryEntry("music_minimax_v2");
  if (!e?.enabled) throw new Error("Music pricing not configured.");
  return e;
}

function modelLabelFor(entry: RegistryEntry, quality: MusicQualityTier): string {
  if (entry.id.startsWith("music_minimax")) {
    return quality === "premium" ? "Premium Music" : "Standard Music";
  }
  if (entry.id === "tts_xai") return "Voiceover";
  if (entry.id === "sfx_mmaudio_text") return "Sound Effects";
  if (entry.id === "sfx_mmaudio_v2") return "Video Soundtrack";
  return "Music";
}

function floorFor(mode: MusicMode, quality: MusicQualityTier): number {
  if (mode === "voiceover") return FLOOR.voiceover;
  if (mode === "sfx") return FLOOR.sfx;
  if (mode === "video_music") return FLOOR.video_music;
  if (mode === "bgm") return quality === "premium" ? FLOOR.bgm_premium : FLOOR.bgm_standard;
  if (mode === "instrumental") {
    return quality === "premium" ? FLOOR.instrumental_premium : FLOOR.instrumental_standard;
  }
  return quality === "premium" ? FLOOR.song_premium : FLOOR.song_standard;
}

/**
 * Single credit calculator for estimate + generation.
 */
export function quoteMusicGeneration(input: MusicQuoteInput): MusicQuoteResult {
  const plan = input.plan;
  const caps = getMusicPlanCapabilities(plan);
  const quality: MusicQualityTier = input.qualityTier ?? "standard";
  const hasVideo = !!input.hasVideo;
  const hasImage = !!input.hasImage;
  const mode = resolveMode(input.mode, hasVideo);
  const videoAudioMode: VideoAudioMode = input.videoAudioMode ?? "replace";

  const denied = (reason: string): MusicQuoteResult => ({
    allowed: false,
    reason,
    plan,
    mode,
    qualityTier: quality,
    provider: "",
    modelId: "",
    modelLabel: "",
    providerCostUsd: 0,
    customerCredits: 0,
    promptMaxChars: caps.promptMaxChars,
    lyricsMaxChars: caps.lyricsMaxChars,
    durationRequested: input.durationSeconds ?? 30,
    durationBillable: 0,
    segments: 0,
    breakdown: {
      providerBaseCost: 0,
      processingCost: 0,
      imageAnalysisCost: 0,
      videoProcessingCost: 0,
      platformCostAllowance: 0,
    },
    pricingVersion: MUSIC_PRICING_VERSION,
    registryId: "",
    videoAudioMode,
  });

  const modeOk = assertMusicModeAllowed(caps, mode === "video_music" ? "video_music" : input.mode);
  if (!modeOk.ok) return denied(modeOk.reason);

  // Premium only when plan allows
  const qOk = assertMusicQualityAllowed(caps, quality);
  if (!qOk.ok) return denied(qOk.reason);

  if (mode === "video_music" && !caps.videoToMusic) {
    return denied("Video→Music is not available on your plan.");
  }
  if (hasImage && !caps.imageToMusic && (mode === "song" || mode === "instrumental" || mode === "bgm")) {
    return denied("Image→Music is not available on your plan.");
  }

  const durationRequested = Math.max(1, Math.round(input.durationSeconds ?? 30));

  // Duration caps — never silently truncate past provider/plan limits
  let durationBillable = durationRequested;
  let segments = 1;

  if (mode === "sfx") {
    if (durationRequested > caps.maxSfxDurationSeconds) {
      return denied(
        `SFX maximum is ${caps.maxSfxDurationSeconds}s on your plan (provider max ${MMAUDIO_MAX_SEGMENT_SECONDS}s).`,
      );
    }
    durationBillable = Math.min(durationRequested, MMAUDIO_MAX_SEGMENT_SECONDS);
  }

  if (mode === "video_music") {
    if (durationRequested > caps.maxVideoAudioDurationSeconds) {
      return denied(
        `Video audio maximum is ${caps.maxVideoAudioDurationSeconds}s on your plan. ` +
          `Videos longer than ${MMAUDIO_MAX_SEGMENT_SECONDS}s require segmentation support; ` +
          `please use a clip ≤ ${caps.maxVideoAudioDurationSeconds}s.`,
      );
    }
    // Bill full requested duration in ≤30s segments for cost; generation enforces segment pipeline.
    segments = Math.ceil(durationRequested / MMAUDIO_MAX_SEGMENT_SECONDS);
    durationBillable = durationRequested;
  }

  const entry = registryFor(mode, quality, mode === "video_music");
  const providerEst = estimateCredits(entry, {
    durationSeconds:
      entry.billingUnit === "per_second" ? durationBillable : undefined,
    characters:
      mode === "voiceover" ? Math.max(1, input.characters ?? 1) : undefined,
  });

  let base = Math.max(floorFor(mode, quality), providerEst.credits);
  let imageAnalysisCost = 0;
  let videoProcessingCost = 0;

  if (hasImage && (mode === "song" || mode === "instrumental" || mode === "bgm")) {
    imageAnalysisCost = FLOOR.image_analysis;
  }
  if (mode === "video_music") {
    videoProcessingCost = 5 * segments;
  }

  const customerCredits = Math.max(1, Math.ceil(base + imageAnalysisCost + videoProcessingCost));

  return {
    allowed: true,
    reason: null,
    plan,
    mode,
    qualityTier: quality,
    provider: entry.provider,
    modelId: entry.modelId,
    modelLabel: modelLabelFor(entry, quality),
    providerCostUsd: Number(providerEst.providerUsd.toFixed(6)),
    customerCredits,
    promptMaxChars: caps.promptMaxChars,
    lyricsMaxChars: caps.lyricsMaxChars,
    durationRequested,
    durationBillable,
    segments,
    breakdown: {
      providerBaseCost: providerEst.credits,
      processingCost: Math.max(0, base - providerEst.credits),
      imageAnalysisCost,
      videoProcessingCost,
      platformCostAllowance: 0,
    },
    pricingVersion: MUSIC_PRICING_VERSION,
    registryId: entry.id,
    videoAudioMode,
  };
}

/** Backward-compatible wrapper used by older call sites. */
export function estimateMusicCustomerCredits(input: {
  mode: "song" | "instrumental" | "voiceover" | "sfx" | "bgm" | "video_music";
  durationSeconds: number;
  characters?: number;
  hasVideo?: boolean;
  hasImage?: boolean;
  qualityTier?: MusicQualityTier;
  plan?: PlanId;
}): {
  credits: number;
  providerUsd: number;
  registryId: string;
  modelId: string;
  billingNote: string;
  breakdown: {
    base: number;
    imageAnalysis: number;
    videoMultimodal: number;
    qualityPremium: number;
  };
} {
  const q = quoteMusicGeneration({
    plan: input.plan ?? "lite",
    mode: input.mode,
    qualityTier: input.qualityTier,
    durationSeconds: input.durationSeconds,
    characters: input.characters,
    hasVideo: input.hasVideo,
    hasImage: input.hasImage,
  });
  return {
    credits: q.customerCredits,
    providerUsd: q.providerCostUsd,
    registryId: q.registryId,
    modelId: q.modelId,
    billingNote:
      q.mode === "voiceover"
        ? "Scales with script length"
        : q.mode === "sfx" || q.mode === "video_music"
          ? "Scales with duration"
          : "Flat rate per track",
    breakdown: {
      base: q.breakdown.providerBaseCost + q.breakdown.processingCost,
      imageAnalysis: q.breakdown.imageAnalysisCost,
      videoMultimodal: q.breakdown.videoProcessingCost,
      qualityPremium: 0,
    },
  };
}
