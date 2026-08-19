/**
 * MUSIC STUDIO — tier → model registry
 * Isolated from Image/Video. Aligns with music.functions + music-pricing.
 *
 * PDF planning: Standard CassetteAI, Pro MiniMax 2.5, Premium ElevenLabs Music.
 * Production uses MiniMax / xAI TTS / MMAudio already in music.functions.
 */

import type { StudioTier } from "@/lib/studio/studio-tier";
import type { MusicMode } from "@/lib/music/music-pricing";

export type MusicModelSlot = "song" | "instrumental" | "voiceover" | "sfx" | "video_music";

export type MusicModelEntry = {
  modelId: string;
  label: string;
  capability: string;
  minimumPlan: "plus" | "pro" | "studio";
};

export const MUSIC_MODEL_REGISTRY: Record<StudioTier, Record<MusicModelSlot, MusicModelEntry>> = {
  standard: {
    song: {
      modelId: "fal-ai/minimax-music/v2",
      label: "MiniMax Music",
      capability: "Song generation",
      minimumPlan: "plus",
    },
    instrumental: {
      modelId: "fal-ai/minimax-music/v2",
      label: "MiniMax Instrumental",
      capability: "Instrumental track",
      minimumPlan: "plus",
    },
    voiceover: {
      modelId: "xai/tts/v1",
      label: "xAI Voice",
      capability: "Voiceover TTS",
      minimumPlan: "plus",
    },
    sfx: {
      modelId: "fal-ai/mmaudio-v2",
      label: "MMAudio",
      capability: "Sound effects",
      minimumPlan: "plus",
    },
    video_music: {
      modelId: "fal-ai/mmaudio-v2",
      label: "MMAudio",
      capability: "Video soundtrack",
      minimumPlan: "plus",
    },
  },
  pro: {
    song: {
      modelId: "fal-ai/minimax-music/v2.6",
      label: "MiniMax Music Pro",
      capability: "Higher quality song",
      minimumPlan: "pro",
    },
    instrumental: {
      modelId: "fal-ai/minimax-music/v2.6",
      label: "MiniMax Instrumental Pro",
      capability: "Higher quality instrumental",
      minimumPlan: "pro",
    },
    voiceover: {
      modelId: "xai/tts/v1",
      label: "xAI Voice",
      capability: "Voiceover TTS",
      minimumPlan: "pro",
    },
    sfx: {
      modelId: "fal-ai/mmaudio-v2",
      label: "MMAudio",
      capability: "Sound design",
      minimumPlan: "pro",
    },
    video_music: {
      modelId: "fal-ai/mmaudio-v2",
      label: "MMAudio",
      capability: "Video soundtrack",
      minimumPlan: "pro",
    },
  },
  premium: {
    song: {
      modelId: "fal-ai/minimax-music/v2.6",
      label: "MiniMax Music Premium",
      capability: "Maximum song quality",
      minimumPlan: "studio",
    },
    instrumental: {
      modelId: "fal-ai/minimax-music/v2.6",
      label: "MiniMax Instrumental Premium",
      capability: "Maximum instrumental quality",
      minimumPlan: "studio",
    },
    voiceover: {
      modelId: "xai/tts/v1",
      label: "xAI Voice",
      capability: "Premium voiceover",
      minimumPlan: "studio",
    },
    sfx: {
      modelId: "fal-ai/mmaudio-v2",
      label: "MMAudio",
      capability: "Premium sound design",
      minimumPlan: "studio",
    },
    video_music: {
      modelId: "fal-ai/mmaudio-v2",
      label: "MMAudio",
      capability: "Premium video soundtrack",
      minimumPlan: "studio",
    },
  },
};

export function resolveMusicModel(tier: StudioTier, slot: MusicModelSlot): MusicModelEntry {
  return MUSIC_MODEL_REGISTRY[tier][slot];
}

export function musicModelPublicLabel(tier: StudioTier, slot: MusicModelSlot): string {
  return MUSIC_MODEL_REGISTRY[tier][slot].label;
}

export function musicModeToSlot(mode: MusicMode | "video-music"): MusicModelSlot {
  if (mode === "video-music") return "video_music";
  if (mode === "sfx") return "sfx";
  if (mode === "voiceover") return "voiceover";
  if (mode === "instrumental") return "instrumental";
  return "song";
}
