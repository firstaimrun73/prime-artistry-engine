import type { MusicMode } from "@/lib/music.functions";

/** Canonical xAI TTS voice IDs — must match xai/tts/v1 VoiceEnum. */
export type VoiceId = "eve" | "ara" | "rex" | "sal" | "leo";

/**
 * Voice library for Voiceover mode.
 * Descriptions match official xAI TTS characteristics (not marketing fiction).
 * previewSrc: static public file when present; otherwise server getVoicePreview caches real TTS.
 */
export const VOICES: ReadonlyArray<{
  id: VoiceId;
  label: string;
  desc: string;
  previewSrc: string;
  sampleLine: string;
}> = [
  {
    id: "eve",
    label: "Eve",
    desc: "Energetic · Upbeat",
    previewSrc: "/voice-previews/eve.mp3",
    sampleLine: "Hi, I'm Eve — clear, energetic, and ready for your story.",
  },
  {
    id: "ara",
    label: "Ara",
    desc: "Warm · Friendly",
    previewSrc: "/voice-previews/ara.mp3",
    sampleLine: "Hello, I'm Ara. Warm, friendly, and easy to listen to.",
  },
  {
    id: "rex",
    label: "Rex",
    desc: "Confident · Clear",
    previewSrc: "/voice-previews/rex.mp3",
    sampleLine: "I'm Rex. Confident, clear, and built for strong narration.",
  },
  {
    id: "sal",
    label: "Sal",
    desc: "Smooth · Balanced",
    previewSrc: "/voice-previews/sal.mp3",
    sampleLine: "Hey, I'm Sal — smooth, balanced, and conversational.",
  },
  {
    id: "leo",
    label: "Leo",
    desc: "Authoritative · Strong",
    previewSrc: "/voice-previews/leo.mp3",
    sampleLine: "This is Leo. Authoritative, strong, and made to lead.",
  },
] as const;

export const VOICE_IDS = VOICES.map((v) => v.id);

export function isVoiceId(v: string): v is VoiceId {
  return (VOICE_IDS as readonly string[]).includes(v);
}

export const DURATIONS = [
  { s: 8, label: "8s" },
  { s: 15, label: "15s" },
  { s: 30, label: "30s" },
  { s: 60, label: "60s" },
];

export const SFX_CATEGORIES = [
  "cinematic", "nature", "weather", "machines", "ui", "crowd",
  "animals", "fantasy", "sci-fi", "ambience", "transitions",
] as const;

export const MUSIC_EXAMPLES: Array<{
  mode: MusicMode;
  title: string;
  prompt: string;
  genre?: string;
  mood?: string;
}> = [
  { mode: "song", title: "Cinematic", prompt: "Epic cinematic soundtrack for a futuristic city at night", genre: "cinematic", mood: "epic" },
  { mode: "instrumental", title: "Lo-fi", prompt: "Warm lo-fi beat for a rainy evening study session", genre: "lofi", mood: "chill" },
  { mode: "voiceover", title: "Documentary", prompt: "In a quiet valley at dawn, life begins again. Soft light touches the hills." },
  { mode: "sfx", title: "Thunder", prompt: "Heavy cinematic thunder with distant rain and wind through trees" },
];

export const LOADING_STEPS = ["Preparing…", "Analyzing…", "Generating…", "Processing audio…", "Finalizing…"];
