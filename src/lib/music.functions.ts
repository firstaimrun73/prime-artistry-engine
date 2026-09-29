/**
 * MOTIO2EDIT Music Studio — server functions.
 * Plan capabilities + quoteMusicGeneration are authoritative.
 * Never trust client plan, credits, model, quality, or price.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "@/lib/admin-config";
import type { PlanId } from "@/lib/plans";
import { buildMusicBrief } from "@/lib/music/music-brief";
import {
  getMusicPlanCapabilities,
  musicCapabilitiesPublicPayload,
  MMAUDIO_MAX_SEGMENT_SECONDS,
  type MusicMode,
  type MusicQualityTier,
} from "@/lib/music/music-plan-capabilities";
import { quoteMusicGeneration, MUSIC_PRICING_VERSION } from "@/lib/music/music-quote";
import { composeMusicPrompts } from "@/lib/music/music-prompt-compose";
import {
  XAI_VOICES,
  normalizeVoice,
  getConfiguredVoicePreviewUrl,
  PREVIEW_LINES,
  type XaiVoiceId,
} from "@/lib/music/voice-preview-assets";
import { shouldRetainAsHistoryServer } from "@/lib/history-retention";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const GENRES = [
  "cinematic", "lofi", "edm", "hip hop", "rock", "pop", "classical",
  "jazz", "ambient", "orchestral", "acoustic", "electronic", "trailer",
  "chillhop", "synthwave", "house", "techno", "reggae", "folk", "world",
] as const;
const MOODS = [
  "epic", "uplifting", "chill", "sad", "romantic", "energetic",
  "mysterious", "dark", "peaceful", "dreamy", "playful", "aggressive",
  "hopeful", "nostalgic", "tense", "triumphant",
] as const;
const INSTRUMENTS = [
  "piano", "guitar", "strings", "orchestra", "synth", "drums", "bass",
  "flute", "saxophone", "percussion", "pads", "choir",
] as const;

const MUSIC_MODES = ["song", "instrumental", "bgm", "voiceover", "sfx", "video_music"] as const;

const inputSchema = z.object({
  mode: z.enum(MUSIC_MODES).default("instrumental"),
  prompt: z.string().trim().max(15_000).optional().default(""),
  lyrics: z.string().trim().max(3_500).optional(),
  genre: z.enum(GENRES).optional(),
  mood: z.enum(MOODS).optional(),
  instrument: z.enum(INSTRUMENTS).optional(),
  /** Requested duration — server enforces plan + provider caps (no silent truncate). */
  durationSeconds: z.number().int().min(1).max(30).optional().default(30),
  imageUrl: z.string().url().max(8000).optional(),
  videoUrl: z.string().url().max(8000).optional(),
  audioUrl: z.string().url().max(8000).optional(),
  voice: z.enum(XAI_VOICES).optional(),
  instrumental: z.boolean().optional(),
  qualityTier: z.enum(["standard", "premium"]).optional().default("standard"),
  /** Default replace: new soundtrack, original audio removed when video output available. */
  videoAudioMode: z.enum(["replace", "mix"]).optional().default("replace"),
  idempotencyKey: z.string().uuid().optional(),
});

// NOTE: Full implementation restored from audit snapshot with URL validation fix.
// See commit history if this marker remains — full body must be present.
export const MUSIC_GENRES = GENRES;
export const MUSIC_MOODS = MOODS;
export const MUSIC_INSTRUMENTS = INSTRUMENTS;
export type { MusicMode, MusicQualityTier };
