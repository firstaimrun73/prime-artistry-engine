import type { MusicMode } from "@/lib/music.functions";

/** Canonical xAI TTS voice IDs — must match xai/tts/v1 VoiceEnum. */
export type VoiceId = "eve" | "ara" | "rex" | "sal" | "leo";

/**
 * Voice library for Voiceover mode.
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

/** Provider-backed durations only (MMAudio / pipeline max 30s). Do not expose 60s. */
export const DURATIONS = [
  { s: 8, label: "8s" },
  { s: 15, label: "15s" },
  { s: 30, label: "30s" },
] as const;

export const SFX_CATEGORIES = [
  "cinematic", "nature", "weather", "machines", "ui", "crowd",
  "animals", "fantasy", "sci-fi", "ambience", "transitions",
] as const;

/** Mood chips with compact modern glyphs for scanability. */
export const MOOD_CHIPS: ReadonlyArray<{ id: string; label: string; glyph: string }> = [
  { id: "epic", label: "Epic", glyph: "✨" },
  { id: "uplifting", label: "Uplifting", glyph: "☀️" },
  { id: "chill", label: "Chill", glyph: "🌿" },
  { id: "sad", label: "Sad", glyph: "🌧" },
  { id: "romantic", label: "Romantic", glyph: "❤️" },
  { id: "energetic", label: "Energetic", glyph: "⚡" },
  { id: "mysterious", label: "Mysterious", glyph: "🔮" },
  { id: "dark", label: "Dark", glyph: "🌙" },
  { id: "peaceful", label: "Peaceful", glyph: "😌" },
  { id: "dreamy", label: "Dreamy", glyph: "💭" },
  { id: "playful", label: "Playful", glyph: "🎈" },
  { id: "aggressive", label: "Aggressive", glyph: "🔥" },
  { id: "hopeful", label: "Hopeful", glyph: "🌅" },
  { id: "nostalgic", label: "Nostalgic", glyph: "📷" },
  { id: "tense", label: "Tense", glyph: "⏱" },
  { id: "triumphant", label: "Triumphant", glyph: "🏆" },
];

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

export const LOADING_STEPS = ["Preparing…", "Composing…", "Generating…", "Processing audio…", "Finalizing…"];

/** Compact type badges for results / history. */
export function musicModeBadge(mode: string): { emoji: string; label: string } {
  switch (mode) {
    case "voiceover":
      return { emoji: "🎙", label: "Voiceover" };
    case "instrumental":
    case "bgm":
      return { emoji: "🎹", label: "Instrumental" };
    case "sfx":
      return { emoji: "🔊", label: "Sound Effect" };
    case "video_music":
      return { emoji: "🎬", label: "Video Music" };
    case "song":
    default:
      return { emoji: "🎵", label: "Music" };
  }
}
