/**
 * Compose user prompts into provider-safe payloads.
 * Plan allows long prompts; providers have hard limits — never blind-slice creative intent.
 */
import type { MusicMode, MusicQualityTier } from "@/lib/music/music-plan-capabilities";

/** Documented provider limits (MiniMax / MMAudio / xAI). */
export const PROVIDER_LIMITS = {
  minimax_v2: { styleMax: 300, lyricsMax: 3000 },
  minimax_v26: { styleMax: 2000, lyricsMax: 3500 },
  mmaudio: { promptMax: 500 },
  xai_tts: { textMax: 15_000 },
} as const;

export type ComposedMusicPrompt = {
  stylePrompt: string;
  lyricsPrompt: string | null;
  videoPrompt: string;
  sfxPrompt: string;
  ttsText: string;
  truncated: boolean;
  notes: string[];
};

function prioritizeKeep(text: string, max: number): { text: string; truncated: boolean } {
  const t = text.trim();
  if (t.length <= max) return { text: t, truncated: false };
  // Prefer keeping the start (user intent) + a short tail of keywords
  const head = t.slice(0, Math.floor(max * 0.75));
  const tail = t.slice(-Math.floor(max * 0.2));
  const joined = `${head.trim()} … ${tail.trim()}`;
  if (joined.length <= max) return { text: joined, truncated: true };
  return { text: t.slice(0, max), truncated: true };
}

/**
 * Build provider-ready prompts from a long user brief.
 */
export function composeMusicPrompts(input: {
  mode: MusicMode;
  qualityTier: MusicQualityTier;
  userPrompt: string;
  lyrics?: string | null;
  instrumental?: boolean;
  imageMood?: string | null;
  genre?: string | null;
  mood?: string | null;
  briefSummary?: string | null;
}): ComposedMusicPrompt {
  const notes: string[] = [];
  const isPremium = input.qualityTier === "premium";
  const styleCap = isPremium ? PROVIDER_LIMITS.minimax_v26.styleMax : PROVIDER_LIMITS.minimax_v2.styleMax;
  const lyricsCap = isPremium ? PROVIDER_LIMITS.minimax_v26.lyricsMax : PROVIDER_LIMITS.minimax_v2.lyricsMax;

  const parts = [
    input.userPrompt?.trim(),
    input.briefSummary?.trim(),
    input.imageMood ? `Visual atmosphere: ${input.imageMood}` : "",
    input.genre ? `${input.genre} genre` : "",
    input.mood ? `${input.mood} mood` : "",
  ].filter(Boolean);

  const fullStyle = parts.join(". ");
  const style = prioritizeKeep(fullStyle, styleCap);
  if (style.truncated) notes.push(`Style prompt compressed to ${styleCap} chars for provider.`);

  const instrumental =
    input.instrumental === true ||
    input.mode === "instrumental" ||
    input.mode === "bgm" ||
    input.mode === "sfx";

  let lyricsPrompt: string | null = null;
  if (!instrumental && (input.mode === "song" || input.mode === "video_music")) {
    const raw = (input.lyrics || input.userPrompt || "[Verse]\nMelody\n[Chorus]\nTheme").trim();
    const ly = prioritizeKeep(raw, lyricsCap);
    lyricsPrompt = ly.text;
    if (ly.truncated) notes.push(`Lyrics compressed to ${lyricsCap} chars for provider.`);
  } else if (instrumental && (input.mode === "song" || input.mode === "instrumental" || input.mode === "bgm")) {
    lyricsPrompt =
      "## instrumental arrangement ##\n[Intro]\n[Verse]\n[Chorus]\n[Outro]\n(no sung vocals)";
  }

  const videoBase = [
    "Generate an original synchronized soundtrack based on the visual events, environment, movement, pacing and atmosphere of the supplied video.",
    "Do not preserve, copy or rely on the original soundtrack. Create a new audio track.",
    "Synchronize important sound events with visible actions.",
    input.mode === "bgm" || input.mode === "instrumental" ? "Background music only — no foreground vocals." : "",
    input.userPrompt?.trim(),
    input.briefSummary?.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  const video = prioritizeKeep(videoBase, PROVIDER_LIMITS.mmaudio.promptMax);
  if (video.truncated) notes.push("Video prompt compressed for MMAudio.");

  const sfx = prioritizeKeep(
    [input.userPrompt, input.briefSummary].filter(Boolean).join(". ") || "cinematic sound design",
    PROVIDER_LIMITS.mmaudio.promptMax,
  );

  const tts = prioritizeKeep(input.userPrompt || "", PROVIDER_LIMITS.xai_tts.textMax);

  return {
    stylePrompt: style.text,
    lyricsPrompt,
    videoPrompt: video.text,
    sfxPrompt: sfx.text,
    ttsText: tts.text,
    truncated: style.truncated || video.truncated || sfx.truncated || tts.truncated,
    notes,
  };
}
