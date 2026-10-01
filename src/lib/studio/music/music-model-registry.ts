/**
 * MUSIC STUDIO — quality tier → provider model registry
 * Single source aligned with generation-cost-registry + music-plan-capabilities.
 * Customer-facing UI shows Standard / Premium only — never these model IDs.
 */

import type { StudioTier } from "@/lib/studio/studio-tier";
import type { MusicMode } from "@/lib/music/music-plan-capabilities";
import type { PlanId } from "@/lib/plans";

export type MusicModelSlot = "song" | "instrumental" | "bgm" | "voiceover" | "sfx" | "video_music";

export type MusicModelEntry = {
  modelId: string;
  /** Internal admin label */
  label: string;
  /** Customer-safe capability string */
  capability: string;
  /** Minimum plan that may use this slot at this quality */
  minimumPlan: PlanId;
};

export const MUSIC_MODEL_REGISTRY: Record<StudioTier, Record<MusicModelSlot, MusicModelEntry>> = {
  standard: {
    song: {
      modelId: "minimax/music-3",
      label: "MiniMax Music 3",
      capability: "Song generation",
      minimumPlan: "lite",
    },
    instrumental: {
      modelId: "minimax/music-3",
      label: "MiniMax Music 3",
      capability: "Instrumental track",
      minimumPlan: "lite",
    },
    bgm: {
      modelId: "minimax/music-3",
      label: "MiniMax Music 3",
      capability: "Background music",
      minimumPlan: "lite",
    },
    voiceover: {
      modelId: "xai/tts/v1",
      label: "xAI TTS",
      capability: "Voiceover",
      minimumPlan: "lite",
    },
    sfx: {
      modelId: "fal-ai/mmaudio-v2/text-to-audio",
      label: "MMAudio text-to-audio",
      capability: "Sound effects",
      minimumPlan: "lite",
    },
    video_music: {
      modelId: "fal-ai/mmaudio-v2",
      label: "MMAudio V2",
      capability: "Video soundtrack",
      minimumPlan: "lite",
    },
  },
  pro: {
    song: {
      modelId: "minimax/music-3",
      label: "MiniMax Music 3",
      capability: "Premium song",
      minimumPlan: "pro",
    },
    instrumental: {
      modelId: "minimax/music-3",
      label: "MiniMax Music 3",
      capability: "Premium instrumental",
      minimumPlan: "pro",
    },
    bgm: {
      modelId: "minimax/music-3",
      label: "MiniMax Music 3",
      capability: "Premium BGM",
      minimumPlan: "pro",
    },
    voiceover: {
      modelId: "xai/tts/v1",
      label: "xAI TTS",
      capability: "Voiceover",
      minimumPlan: "lite",
    },
    sfx: {
      modelId: "fal-ai/mmaudio-v2/text-to-audio",
      label: "MMAudio text-to-audio",
      capability: "Sound design",
      minimumPlan: "lite",
    },
    video_music: {
      modelId: "fal-ai/mmaudio-v2",
      label: "MMAudio V2",
      capability: "Video soundtrack",
      minimumPlan: "lite",
    },
  },
  ultra: {
    song: {
      modelId: "minimax/music-3",
      label: "MiniMax Music 3",
      capability: "Premium song",
      minimumPlan: "pro",
    },
    instrumental: {
      modelId: "minimax/music-3",
      label: "MiniMax Music 3",
      capability: "Premium instrumental",
      minimumPlan: "pro",
    },
    bgm: {
      modelId: "minimax/music-3",
      label: "MiniMax Music 3",
      capability: "Premium BGM",
      minimumPlan: "pro",
    },
    voiceover: {
      modelId: "xai/tts/v1",
      label: "xAI TTS",
      capability: "Voiceover",
      minimumPlan: "lite",
    },
    sfx: {
      modelId: "fal-ai/mmaudio-v2/text-to-audio",
      label: "MMAudio text-to-audio",
      capability: "Sound design",
      minimumPlan: "lite",
    },
    video_music: {
      modelId: "fal-ai/mmaudio-v2",
      label: "MMAudio V2",
      capability: "Video soundtrack",
      minimumPlan: "lite",
    },
  },
};

export function resolveMusicModel(tier: StudioTier, slot: MusicModelSlot): MusicModelEntry {
  return MUSIC_MODEL_REGISTRY[tier][slot];
}

export function musicModelPublicLabel(tier: StudioTier, slot: MusicModelSlot): string {
  return MUSIC_MODEL_REGISTRY[tier][slot].capability;
}

export function musicModeToSlot(mode: MusicMode | "video-music"): MusicModelSlot {
  if (mode === "video-music" || mode === "video_music") return "video_music";
  if (mode === "sfx") return "sfx";
  if (mode === "voiceover") return "voiceover";
  if (mode === "instrumental") return "instrumental";
  if (mode === "bgm") return "bgm";
  return "song";
}

/** Map quality tier string to StudioTier for registry lookup. */
export function qualityToStudioTier(quality: "standard" | "premium"): StudioTier {
  return quality === "premium" ? "pro" : "standard";
}
