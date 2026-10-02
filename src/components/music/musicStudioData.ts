import type { MusicMode } from "@/lib/music.functions";

/** Canonical xAI TTS voice IDs — must match xai/tts/v1 VoiceEnum. */
export type VoiceId = "eve" | "ara" | "rex" | "sal" | "leo";

/**
 * Voice library for AI Voice mode.
 * previewSrc: permanent R2 CDN sample — never generate on click.
 */
export const VOICES: ReadonlyArray<{
  id: VoiceId;
  label: string;
  desc: string;
  previewSrc: string;
  sampleLine: string;
  color: string;
  emoji: string;
}> = [
  {
    id: "eve",
    label: "Eve",
    desc: "Clear · Energetic",
    previewSrc: "https://assets.motio2edit.com/samples/media_6/Eve-Aivoice-sample_music-studio.mp3",
    sampleLine: "Hi, I'm Eve — clear, energetic, and ready for your story.",
    color: "from-orange-500 to-rose-500",
    emoji: "✨",
  },
  {
    id: "ara",
    label: "Ara",
    desc: "Warm · Friendly",
    previewSrc: "https://assets.motio2edit.com/samples/media_6/Ara-Aivoice-sample_music-studio.mp3",
    sampleLine: "Hello, I'm Ara. Warm, friendly, and easy to listen to.",
    color: "from-pink-500 to-rose-600",
    emoji: "🌸",
  },
  {
    id: "rex",
    label: "Rex",
    desc: "Confident · Clear",
    previewSrc: "https://assets.motio2edit.com/samples/media_6/Rex-Aivoice-sample_music-studio.mp3",
    sampleLine: "I'm Rex. Confident, clear, and built for strong narration.",
    color: "from-sky-500 to-indigo-600",
    emoji: "🎯",
  },
  {
    id: "sal",
    label: "Sal",
    desc: "Smooth · Balanced",
    previewSrc: "https://assets.motio2edit.com/samples/media_6/Sal-Aivoice-sample_music-studio.mp3",
    sampleLine: "Hey, I'm Sal — smooth, balanced, and conversational.",
    color: "from-emerald-500 to-teal-600",
    emoji: "🌊",
  },
  {
    id: "leo",
    label: "Leo",
    desc: "Authoritative · Strong",
    previewSrc: "https://assets.motio2edit.com/samples/media_6/Leo-Aivoice-sample_music-studio%20.mp3",
    sampleLine: "This is Leo. Authoritative, strong, and made to lead.",
    color: "from-violet-500 to-purple-700",
    emoji: "🦁",
  },
] as const;

export const VOICE_IDS = VOICES.map((v) => v.id);

export function isVoiceId(v: string): v is VoiceId {
  return (VOICE_IDS as readonly string[]).includes(v);
}

export const DURATIONS = [
  { s: 15, label: "15s" },
  { s: 30, label: "30s" },
  { s: 60, label: "60s" },
  { s: 90, label: "90s" },
  { s: 120, label: "120s" },
] as const;

export const SFX_DURATIONS = [
  { s: 5, label: "5s" },
  { s: 10, label: "10s" },
  { s: 15, label: "15s" },
  { s: 30, label: "30s" },
] as const;

export const SFX_CATEGORIES: ReadonlyArray<{ id: string; label: string; glyph: string }> = [
  { id: "ambience", label: "Ambience", glyph: "🌫️" },
  { id: "nature", label: "Nature", glyph: "🌿" },
  { id: "urban", label: "Urban", glyph: "🏙️" },
  { id: "foley", label: "Foley", glyph: "👣" },
  { id: "sci-fi", label: "Sci-Fi", glyph: "🛸" },
  { id: "horror", label: "Horror", glyph: "👻" },
  { id: "comedy", label: "Comedy", glyph: "😄" },
  { id: "impact", label: "Impact", glyph: "💥" },
];

export const MOOD_CHIPS: ReadonlyArray<{ id: string; label: string; glyph: string }> = [
  { id: "epic", label: "Epic", glyph: "⚔️" },
  { id: "uplifting", label: "Uplifting", glyph: "☀️" },
  { id: "chill", label: "Chill", glyph: "😌" },
  { id: "sad", label: "Sad", glyph: "😢" },
  { id: "romantic", label: "Romantic", glyph: "💕" },
  { id: "energetic", label: "Energetic", glyph: "⚡" },
  { id: "mysterious", label: "Mysterious", glyph: "🔮" },
  { id: "dark", label: "Dark", glyph: "🌑" },
  { id: "peaceful", label: "Peaceful", glyph: "🕊️" },
  { id: "dreamy", label: "Dreamy", glyph: "✨" },
];

export const LOADING_STEPS = [
  "Tuning instruments…",
  "Writing the arrangement…",
  "Mixing the track…",
  "Mastering…",
  "Almost ready…",
] as const;

export function musicModeBadge(mode: string): { emoji: string; label: string } {
  switch (mode) {
    case "song":
      return { emoji: "🎵", label: "Music" };
    case "instrumental":
      return { emoji: "🎹", label: "Instrumental" };
    case "bgm":
      return { emoji: "📻", label: "BGM" };
    case "voiceover":
      return { emoji: "🎙️", label: "AI Voice" };
    case "sfx":
      return { emoji: "🔊", label: "Sound" };
    case "video_music":
      return { emoji: "🎬", label: "Video Music" };
    default:
      return { emoji: "🎵", label: mode || "Music" };
  }
}
