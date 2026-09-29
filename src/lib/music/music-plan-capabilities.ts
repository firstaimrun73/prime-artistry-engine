/**
 * Authoritative Music Studio plan capabilities.
 * Server must evaluate every request against this — never trust client plan/mode/quality.
 */
import type { PlanId } from "@/lib/plans";

export type MusicMode =
  | "song"
  | "instrumental"
  | "bgm"
  | "voiceover"
  | "sfx"
  | "video_music";

export type MusicQualityTier = "standard" | "premium";

export type VideoAudioMode = "replace" | "mix";

export type MusicPlanCapabilities = {
  musicEnabled: boolean;
  allowedModes: MusicMode[];
  allowedQualityTiers: MusicQualityTier[];
  promptMaxChars: number;
  lyricsMaxChars: number;
  maxSfxDurationSeconds: number;
  maxVideoAudioDurationSeconds: number;
  maxInputVideoDurationSeconds: number;
  maxInputAudioDurationSeconds?: number;
  imageToMusic: boolean;
  videoToMusic: boolean;
  replaceOriginalVideoAudio: boolean;
  bgmEnabled: boolean;
  voiceoverEnabled: boolean;
  voicePreviewEnabled: boolean;
  historyEnabled: boolean;
  maxConcurrentMusicJobs: number;
  priorityQueue: boolean;
};

/** MMAudio provider hard limit — never silently exceed. */
export const MMAUDIO_MAX_SEGMENT_SECONDS = 30;

/**
 * Customer plan limit for Master Studio (business id).
 * Provider-specific limits stay in music-prompt-compose.ts.
 */
export const MASTER_STUDIO_PROMPT_MAX_CHARS = 15_000;
export const SERVER_LYRICS_ABUSE_CEILING = 3_500;

const FREE_CAPS: MusicPlanCapabilities = {
  musicEnabled: false,
  allowedModes: [],
  allowedQualityTiers: [],
  promptMaxChars: 0,
  lyricsMaxChars: 0,
  maxSfxDurationSeconds: 0,
  maxVideoAudioDurationSeconds: 0,
  maxInputVideoDurationSeconds: 0,
  imageToMusic: false,
  videoToMusic: false,
  replaceOriginalVideoAudio: false,
  bgmEnabled: false,
  voiceoverEnabled: false,
  voicePreviewEnabled: false,
  historyEnabled: true,
  maxConcurrentMusicJobs: 0,
  priorityQueue: false,
};

const LITE_CAPS: MusicPlanCapabilities = {
  musicEnabled: true,
  allowedModes: ["song", "instrumental", "bgm", "voiceover", "sfx", "video_music"],
  allowedQualityTiers: ["standard"],
  promptMaxChars: 2_000,
  lyricsMaxChars: 3_000,
  maxSfxDurationSeconds: 30,
  maxVideoAudioDurationSeconds: 30,
  maxInputVideoDurationSeconds: 30,
  imageToMusic: true,
  videoToMusic: true,
  replaceOriginalVideoAudio: true,
  bgmEnabled: true,
  voiceoverEnabled: true,
  voicePreviewEnabled: true,
  historyEnabled: true,
  maxConcurrentMusicJobs: 1,
  priorityQueue: false,
};

const PLUS_CAPS: MusicPlanCapabilities = {
  ...LITE_CAPS,
  promptMaxChars: 4_000,
  lyricsMaxChars: 3_500,
  maxConcurrentMusicJobs: 1,
  priorityQueue: false,
};

const PRO_CAPS: MusicPlanCapabilities = {
  ...PLUS_CAPS,
  allowedQualityTiers: ["standard", "premium"],
  promptMaxChars: 6_000,
  lyricsMaxChars: 3_500,
  maxConcurrentMusicJobs: 2,
  priorityQueue: true,
};

const STUDIO_CAPS: MusicPlanCapabilities = {
  ...PRO_CAPS,
  maxConcurrentMusicJobs: 3,
  priorityQueue: true,
};

/** Internal id "business" — user-facing name Master Studio. */
const BUSINESS_CAPS: MusicPlanCapabilities = {
  ...STUDIO_CAPS,
  promptMaxChars: MASTER_STUDIO_PROMPT_MAX_CHARS,
  lyricsMaxChars: SERVER_LYRICS_ABUSE_CEILING,
  maxConcurrentMusicJobs: 4,
  priorityQueue: true,
};

const BY_PLAN: Record<PlanId, MusicPlanCapabilities> = {
  free: FREE_CAPS,
  lite: LITE_CAPS,
  plus: PLUS_CAPS,
  pro: PRO_CAPS,
  studio: STUDIO_CAPS,
  business: BUSINESS_CAPS,
};

export function getMusicPlanCapabilities(plan: string | null | undefined): MusicPlanCapabilities {
  const id = (plan || "free") as PlanId;
  return BY_PLAN[id] ?? FREE_CAPS;
}

export function assertMusicModeAllowed(
  caps: MusicPlanCapabilities,
  mode: MusicMode,
): { ok: true } | { ok: false; reason: string } {
  if (!caps.musicEnabled) {
    return { ok: false, reason: "Music Studio requires Lite or a higher plan. Upgrade to unlock." };
  }
  if (!caps.allowedModes.includes(mode)) {
    return { ok: false, reason: `Mode "${mode}" is not available on your plan.` };
  }
  return { ok: true };
}

export function assertMusicQualityAllowed(
  caps: MusicPlanCapabilities,
  quality: MusicQualityTier,
): { ok: true } | { ok: false; reason: string } {
  if (!caps.allowedQualityTiers.includes(quality)) {
    if (quality === "premium") {
      return { ok: false, reason: "Premium music requires Pro or higher." };
    }
    return { ok: false, reason: `Quality "${quality}" is not available on your plan.` };
  }
  return { ok: true };
}

/** Public capability payload for the frontend. */
export function musicCapabilitiesPublicPayload(
  plan: PlanId,
  credits: number,
  caps: MusicPlanCapabilities,
) {
  return {
    plan,
    credits,
    musicEnabled: caps.musicEnabled,
    qualityTiers: caps.allowedQualityTiers,
    modes: caps.allowedModes,
    promptMaxChars: caps.promptMaxChars,
    lyricsMaxChars: caps.lyricsMaxChars,
    videoAudioReplacement: caps.replaceOriginalVideoAudio,
    maxVideoSegmentSeconds: MMAUDIO_MAX_SEGMENT_SECONDS,
    maxVideoAudioDurationSeconds: caps.maxVideoAudioDurationSeconds,
    maxSfxDurationSeconds: caps.maxSfxDurationSeconds,
    historyEnabled: caps.historyEnabled,
    imageToMusic: caps.imageToMusic,
    videoToMusic: caps.videoToMusic,
    bgmEnabled: caps.bgmEnabled,
    voiceoverEnabled: caps.voiceoverEnabled,
    voicePreviewEnabled: caps.voicePreviewEnabled,
    priorityQueue: caps.priorityQueue,
  };
}
