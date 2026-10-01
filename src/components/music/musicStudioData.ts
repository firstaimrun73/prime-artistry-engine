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
  color: string;
  emoji: string;
}> = [
  {
    id: "eve",
    label: "Eve",
    desc: "Energetic · Upbeat",
    previewSrc: "/voice-previews/eve.mp3",
    sampleLine: "Hi, I'm Eve — clear, energetic, and ready for your story.",
    color: "from-rose-500 to-orange-500",
    emoji: "⚡",
  },
  {
    id: "ara",
    label: "Ara",
    desc: "Warm · Friendly",
    previewSrc: "/voice-previews/ara.mp3",
    sampleLine: "Hello, I'm Ara. Warm, friendly, and easy to listen to.",
    color: "from-amber-400 to-rose-400",
    emoji: "🌸",
  },
  {
    id: "rex",
    label: "Rex",
    desc: "Confident · Clear",
    previewSrc: "/voice-previews/rex.mp3",
    sampleLine: "I'm Rex. Confident, clear, and built for strong narration.",
    color: "from-sky-500 to-indigo-600",
    emoji: "🎯",
  },
  {
    id: "sal",
    label: "Sal",
    desc: "Smooth · Balanced",
    previewSrc: "/voice-previews/sal.mp3",
    sampleLine: "Hey, I'm Sal — smooth, balanced, and conversational.",
    color: "from-emerald-500 to-teal-600",
    emoji: "🌊",
  },
  {
    id: "leo",
    label: "Leo",
    desc: "Authoritative · Strong",
    previewSrc: "/voice-previews/leo.mp3",
    sampleLine: "This is Leo. Authoritative, strong, and made to lead.",
    color: "from-violet-500 to-purple-700",
    emoji: "🦁",
  },
] as const;

export const VOICE_IDS = VOICES.map((v) => v.id);

export function isVoiceId(v: string): v is VoiceId {
  return (VOICE_IDS as readonly string[]).includes(v);
}

/** Provider-backed durations only (MMAudio / pipeline max 30s). Do not expose 60s. */
export const DURATIONS = [
  { s: 8, label: "8s", emoji: "⏱" },
  { s: 15, label: "15s", emoji: "⏱" },
  { s: 30, label: "30s", emoji: "⏱" },
] as const;

/** SFX categories with sticker emojis for fast scanning. */
export const SFX_CATEGORIES: ReadonlyArray<{ id: string; label: string; glyph: string }> = [
  { id: "cinematic", label: "Cinematic", glyph: "🎬" },
  { id: "nature", label: "Nature", glyph: "🌲" },
  { id: "weather", label: "Weather", glyph: "🌧" },
  { id: "machines", label: "Machines", glyph: "⚙️" },
  { id: "ui", label: "UI", glyph: "📱" },
  { id: "crowd", label: "Crowd", glyph: "👥" },
  { id: "animals", label: "Animals", glyph: "🐾" },
  { id: "fantasy", label: "Fantasy", glyph: "✨" },
  { id: "sci-fi", label: "Sci-fi", glyph: "🚀" },
  { id: "ambience", label: "Ambience", glyph: "🌙" },
  { id: "transitions", label: "Transitions", glyph: "↪️" },
];

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

export const LOADING_STEPS = [
  "Preparing…",
  "Composing…",
  "Generating…",
  "Processing audio…",
  "Finalizing…",
];

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
