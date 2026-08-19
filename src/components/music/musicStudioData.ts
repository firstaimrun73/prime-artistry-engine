import type { MusicMode } from "@/lib/music.functions";

export const VOICES = [
  { id: "eve", label: "Eve", desc: "Warm · Natural" },
  { id: "ara", label: "Ara", desc: "Professional · Clear" },
  { id: "rex", label: "Rex", desc: "Deep · Powerful" },
  { id: "sal", label: "Sal", desc: "Friendly · Conversational" },
  { id: "leo", label: "Leo", desc: "Energetic · Young" },
] as const;

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
