/**
 * MOTIO2EDIT Music Studio — customer-facing credit pricing.
 *
 * Provider economics live in generation-cost-registry.ts.
 * This module maps those into intentional product prices:
 *   - integer credits only
 *   - same function for UI estimate and server deduction
 *   - no fake duration scaling on flat-billed models
 *
 * Credit value: 1 credit ≈ $0.01143 customer value ($4 / 350).
 */

import {
  estimateCredits,
  getRegistryEntry,
  type RegistryEntry,
} from "@/lib/generation-cost-registry";
export type MusicMode = "song" | "instrumental" | "voiceover" | "sfx";
export type MusicQualityTier = "standard" | "premium";

export type MusicPriceInput = {
  mode: MusicMode;
  durationSeconds: number;
  /** Script length for voiceover */
  characters?: number;
  hasVideo?: boolean;
  hasImage?: boolean;
  /** Premium uses MiniMax v2.6 when enabled for song/instrumental */
  qualityTier?: MusicQualityTier;
};

export type MusicPriceResult = {
  credits: number;
  /** Internal only — never show in product UI */
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
};

/** Product floors so Studio does not feel arbitrarily cheap vs image (25 cr). */
const FLOOR = {
  song_standard: 35,
  song_premium: 75,
  instrumental_standard: 35,
  instrumental_premium: 75,
  sfx: 15,
  video_music: 20,
  voiceover: 20,
  image_analysis: 15,
} as const;

function registryFor(input: MusicPriceInput): RegistryEntry {
  if (input.mode === "voiceover") {
    const e = getRegistryEntry("tts_xai");
    if (!e) throw new Error("Voiceover pricing not configured.");
    return e;
  }
  if (input.mode === "sfx" || input.hasVideo) {
    if (input.hasVideo) {
      const e = getRegistryEntry("sfx_mmaudio_v2");
      if (!e) throw new Error("Video→music pricing not configured.");
      return e;
    }
    const e = getRegistryEntry("sfx_mmaudio_text");
    if (!e) throw new Error("SFX pricing not configured.");
    return e;
  }
  if (input.qualityTier === "premium") {
    const e = getRegistryEntry("music_minimax_v26");
    if (e?.enabled) return e;
  }
  const e = getRegistryEntry("music_minimax_v2");
  if (!e) throw new Error("Music pricing not configured.");
  return e;
}

/**
 * Authoritative customer credit cost for Music Studio.
 * UI estimate and generateMusic MUST both call this.
 */
export function estimateMusicCustomerCredits(input: MusicPriceInput): MusicPriceResult {
  const duration = Math.min(180, Math.max(1, Math.round(input.durationSeconds || 30)));
  const hasVideo = !!input.hasVideo;
  const hasImage = !!input.hasImage;
  const tier = input.qualityTier ?? "standard";

  const useVideoPath =
    hasVideo && (input.mode === "sfx" || input.mode === "song" || input.mode === "instrumental");

  const entry = registryFor({
    ...input,
    hasVideo: useVideoPath,
  });

  const provider = estimateCredits(entry, {
    durationSeconds: useVideoPath || input.mode === "sfx" ? duration : undefined,
    characters: input.mode === "voiceover" ? Math.max(1, input.characters ?? 1) : undefined,
  });

  let base = provider.credits;
  let imageAnalysis = 0;
  let videoMultimodal = 0;
  let qualityPremium = 0;

  if (input.mode === "voiceover") {
    base = Math.max(FLOOR.voiceover, provider.credits);
  } else if (useVideoPath) {
    base = Math.max(FLOOR.video_music, provider.credits);
    videoMultimodal = hasVideo ? 5 : 0;
  } else if (input.mode === "sfx") {
    base = Math.max(FLOOR.sfx, provider.credits);
  } else {
    if (tier === "premium") {
      base = Math.max(FLOOR.song_premium, provider.credits);
      qualityPremium = Math.max(0, base - provider.credits);
    } else {
      base = Math.max(FLOOR.song_standard, provider.credits);
    }
  }

  if (hasImage && (input.mode === "song" || input.mode === "instrumental")) {
    imageAnalysis = FLOOR.image_analysis;
  }

  const credits = Math.max(1, Math.ceil(base + imageAnalysis + videoMultimodal));

  const billingNote =
    entry.billingUnit === "per_generation"
      ? "Flat rate per track (provider does not bill by second)"
      : entry.billingUnit === "per_second"
        ? "Scales with duration"
        : entry.billingUnit === "per_1000_chars"
          ? "Scales with script length"
          : "Standard";

  return {
    credits,
    providerUsd: provider.providerUsd,
    registryId: entry.id,
    modelId: entry.modelId,
    billingNote,
    breakdown: { base, imageAnalysis, videoMultimodal, qualityPremium },
  };
}

/** User-facing matrix snapshot for docs / admin (standard tier, no image). */
export function musicCreditMatrixTable(): Array<{
  feature: string;
  s8: number;
  s15: number;
  s30: number;
  s60: number;
}> {
  const row = (mode: MusicMode, hasVideo = false) => {
    const at = (d: number) =>
      estimateMusicCustomerCredits({
        mode,
        durationSeconds: d,
        hasVideo,
        characters: mode === "voiceover" ? 400 : undefined,
      }).credits;
    return { s8: at(8), s15: at(15), s30: at(30), s60: at(60) };
  };
  return [
    { feature: "Song (standard)", ...row("song") },
    {
      feature: "Song (premium)",
      ...(() => {
        const at = (d: number) =>
          estimateMusicCustomerCredits({
            mode: "song",
            durationSeconds: d,
            qualityTier: "premium",
          }).credits;
        return { s8: at(8), s15: at(15), s30: at(30), s60: at(60) };
      })(),
    },
    { feature: "Instrumental", ...row("instrumental") },
    { feature: "Voiceover (~400 chars)", ...row("voiceover") },
    { feature: "Sound / SFX", ...row("sfx") },
    { feature: "Video → Music", ...row("sfx", true) },
    {
      feature: "Image → Atmosphere (+song)",
      s8: estimateMusicCustomerCredits({
        mode: "song",
        durationSeconds: 8,
        hasImage: true,
      }).credits,
      s15: estimateMusicCustomerCredits({
        mode: "song",
        durationSeconds: 15,
        hasImage: true,
      }).credits,
      s30: estimateMusicCustomerCredits({
        mode: "song",
        durationSeconds: 30,
        hasImage: true,
      }).credits,
      s60: estimateMusicCustomerCredits({
        mode: "song",
        durationSeconds: 60,
        hasImage: true,
      }).credits,
    },
  ];
}
