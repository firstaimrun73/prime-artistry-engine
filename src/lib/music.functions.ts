/**
 * MOTIO2EDIT Music Studio — server functions.
 * Customer credits: music/music-pricing.ts
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canAccessMusic } from "@/lib/policy";
import { buildMusicBrief } from "@/lib/music/music-brief";
import { estimateMusicCustomerCredits, type MusicQualityTier } from "@/lib/music/music-pricing";

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

/** Official xai/tts/v1 voices — single source of truth for Voiceover. */
const XAI_VOICES = ["eve", "ara", "rex", "sal", "leo"] as const;
export type XaiVoiceId = (typeof XAI_VOICES)[number];

const PREVIEW_LINES: Record<XaiVoiceId, string> = {
  eve: "Hi, I'm Eve — clear, energetic, and ready for your story.",
  ara: "Hello, I'm Ara. Warm, friendly, and easy to listen to.",
  rex: "I'm Rex. Confident, clear, and built for strong narration.",
  sal: "Hey, I'm Sal — smooth, balanced, and conversational.",
  leo: "This is Leo. Authoritative, strong, and made to lead.",
};

function normalizeVoice(raw?: string | null): XaiVoiceId {
  const v = (raw || "eve").toLowerCase().trim();
  return (XAI_VOICES as readonly string[]).includes(v) ? (v as XaiVoiceId) : "eve";
}

export type MusicMode = "song" | "instrumental" | "voiceover" | "sfx";

const inputSchema = z.object({
  mode: z.enum(["song", "instrumental", "voiceover", "sfx"]).default("instrumental"),
  prompt: z.string().trim().max(4000).optional().default(""),
  lyrics: z.string().trim().max(3500).optional(),
  genre: z.enum(GENRES).optional(),
  mood: z.enum(MOODS).optional(),
  instrument: z.enum(INSTRUMENTS).optional(),
  durationSeconds: z.number().int().min(1).max(180).optional().default(30),
  imageUrl: z.string().url().max(8000).optional(),
  videoUrl: z.string().url().max(8000).optional(),
  audioUrl: z.string().url().max(8000).optional(),
  voice: z.enum(XAI_VOICES).optional(),
  instrumental: z.boolean().optional(),
  qualityTier: z.enum(["standard", "premium"]).optional().default("standard"),
});

function friendlyError(status: number, _txt: string): string {
  if (status === 429) return "Music service is rate-limited. Please retry in a moment.";
  if (status === 401 || status === 403) return "Music service authentication failed. Please try again shortly.";
  return `Music generation failed (status ${status}). Please try again.`;
}

async function runFalQueue(model: string, body: Record<string, unknown>, falKey: string, label: string) {
  const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };
  const submit = await fetch(`${FAL_QUEUE}${model}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!submit.ok) throw new Error(friendlyError(submit.status, await submit.text()));
  const { status_url, response_url } = (await submit.json()) as { status_url: string; response_url: string };
  const deadline = Date.now() + 180_000;
  let delay = 1500, lastStatus = "";
  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetch(status_url, { headers });
    if (!st.ok) { delay = Math.min(delay * 1.3, 5000); continue; }
    const sj = (await st.json()) as { status?: string };
    if (sj.status) lastStatus = sj.status;
    if (sj.status === "COMPLETED") break;
    if (sj.status === "FAILED" || sj.status === "ERROR") throw new Error(`${label} failed.`);
    delay = Math.min(delay * 1.3, 5000);
  }
  if (lastStatus !== "COMPLETED") throw new Error(`${label} timed out.`);
  const res = await fetch(response_url, { headers });
  if (!res.ok) throw new Error(friendlyError(res.status, await res.text()));
  return (await res.json()) as Record<string, unknown>;
}

function extractAudioUrl(json: Record<string, unknown>): string | null {
  const audio = json.audio as { url?: string } | undefined;
  const audioFile = json.audio_file as { url?: string } | undefined;
  const video = json.video as { url?: string } | undefined;
  return audio?.url ?? audioFile?.url ?? video?.url ?? null;
}

async function analyzeImageMoodServer(imageUrl: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !imageUrl.startsWith("http")) return "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5", max_tokens: 160,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "url", url: imageUrl } },
          { type: "text", text: "Analyze this image for music generation. Max 40 words: mood, atmosphere, energy, genre, tempo, instruments." },
        ]}],
      }),
    });
    if (!res.ok) return "";
    const json = (await res.json()) as { content?: { type?: string; text?: string }[] };
    return (json.content ?? []).filter(c => c.type === "text").map(c => c.text ?? "").join(" ").trim().slice(0, 280);
  } catch { return ""; }
}

/**
 * Short real xAI TTS sample for Voice Library preview.
 * Does NOT charge credits. Caches per-voice in Supabase storage when possible.
 */
export const getVoicePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ voice: z.enum(XAI_VOICES) }).parse(data))
  .handler(async ({ data }) => {
    const voice = data.voice;
    const falKey = process.env.FAL_API_KEY;
    if (!falKey) throw new Error("Preview service unavailable.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storagePath = `system/voice-previews/${voice}.mp3`;

    // 1) Cached object in storage
    try {
      const { data: signed } = await supabaseAdmin.storage.from("uploads").createSignedUrl(storagePath, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) {
        const probe = await fetch(signed.signedUrl, { method: "HEAD" });
        if (probe.ok) return { url: signed.signedUrl, voice, cached: true as const };
      }
    } catch { /* generate below */ }

    // 2) Generate once via xAI TTS
    const json = await runFalQueue(
      "xai/tts/v1",
      { text: PREVIEW_LINES[voice], voice, language: "en" },
      falKey,
      "xAI TTS preview",
    );
    const remoteUrl = extractAudioUrl(json);
    if (!remoteUrl) throw new Error("Preview returned no audio.");

    // 3) Persist for next callers (best-effort)
    try {
      const bin = await fetch(remoteUrl).then((r) => r.arrayBuffer());
      await supabaseAdmin.storage.from("uploads").upload(storagePath, bin, {
        contentType: "audio/mpeg",
        upsert: true,
      });
      const { data: signed } = await supabaseAdmin.storage.from("uploads").createSignedUrl(storagePath, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) return { url: signed.signedUrl, voice, cached: false as const };
    } catch { /* fall through */ }

    return { url: remoteUrl, voice, cached: false as const };
  });

export const generateMusic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: pErr } = await supabase.from("profiles").select("plan, credits, email").eq("id", userId).single();
    if (pErr || !profile) throw new Error("Could not load your account.");
    // Sole admin only — matches admin-guard.server.ts / admin-config.ts
    const isAdmin =
      !!profile.email &&
      profile.email.trim().toLowerCase() === "firstaimrun89@gmail.com";
    if (!canAccessMusic({ plan: profile.plan, email: profile.email, isAdmin })) {
      throw new Error("Music generation requires Lite or a higher plan. Upgrade to unlock Music Studio.");
    }
    const mode = data.mode as MusicMode;
    const hasVideo = !!(data.videoUrl && data.videoUrl.startsWith("https://"));
    const hasImage = !!(data.imageUrl && data.imageUrl.startsWith("https://"));
    const useVideoMusic = hasVideo && (mode === "sfx" || mode === "song" || mode === "instrumental");
    const durationSeconds = data.durationSeconds ?? 30;
    const qualityTier = (data.qualityTier ?? "standard") as MusicQualityTier;
    const price = estimateMusicCustomerCredits({
      mode, durationSeconds, characters: (data.prompt || "").length,
      hasVideo: useVideoMusic, hasImage: hasImage && (mode === "song" || mode === "instrumental"), qualityTier,
    });
    const cost = price.credits;
    if (!isAdmin && profile.credits < cost) throw new Error(`Not enough credits. This music job costs ${cost} credits.`);
    const falKey = process.env.FAL_API_KEY;
    if (!falKey) throw new Error("Music service unavailable.");

    let imageMoodText = "";
    if (hasImage && data.imageUrl && (mode === "song" || mode === "instrumental")) {
      imageMoodText = await analyzeImageMoodServer(data.imageUrl);
    }
    const instrumental = data.instrumental === true || mode === "instrumental" || mode === "sfx";
    const textForBrief = [data.prompt || data.lyrics || "", imageMoodText ? `Visual atmosphere: ${imageMoodText}` : "", data.instrument ? `instrument: ${data.instrument}` : ""].filter(Boolean).join(". ");
    const brief = buildMusicBrief({ text: textForBrief, imageUrl: data.imageUrl, videoUrl: data.videoUrl, preferredGenre: data.genre, preferredMood: data.mood, instrumental });

    let outputUrl: string;
    let usedModel: string;
    const selectedVoice = normalizeVoice(data.voice);
    try {
      if (mode === "voiceover") {
        usedModel = "xai/tts/v1";
        const json = await runFalQueue(
          usedModel,
          { text: (data.prompt || "").slice(0, 15000), voice: selectedVoice, language: "auto" },
          falKey,
          "xAI TTS",
        );
        const url = extractAudioUrl(json);
        if (!url) throw new Error("Voiceover returned no audio.");
        outputUrl = url;
      } else if (useVideoMusic) {
        usedModel = "fal-ai/mmaudio-v2";
        const json = await runFalQueue(usedModel, { video_url: data.videoUrl, prompt: brief.summaryPrompt.slice(0, 500), num_steps: 25, duration: Math.min(30, durationSeconds), cfg_strength: 4.5 }, falKey, "MMAudio video");
        const url = extractAudioUrl(json);
        if (!url) throw new Error("Video→music returned no audio.");
        outputUrl = url;
      } else if (mode === "sfx") {
        usedModel = "fal-ai/mmaudio-v2/text-to-audio";
        const json = await runFalQueue(usedModel, { prompt: (data.prompt || brief.summaryPrompt).slice(0, 500), duration: Math.min(30, durationSeconds), num_steps: 25, cfg_strength: 4.5 }, falKey, "MMAudio SFX");
        const url = extractAudioUrl(json);
        if (!url) throw new Error("SFX returned no audio.");
        outputUrl = url;
      } else {
        usedModel = qualityTier === "premium" ? "fal-ai/minimax-music/v2.6" : "fal-ai/minimax-music/v2";
        const style = [brief.summaryPrompt, data.genre ? `${data.genre} genre` : "", data.mood ? `${data.mood} mood` : "", imageMoodText].filter(Boolean).join(". ").slice(0, 300);
        let lyricsPrompt = instrumental
          ? "## instrumental arrangement ##\n[Intro]\n[Verse]\n[Chorus]\n[Outro]\n(no sung vocals)"
          : ((data.lyrics || data.prompt || "[Verse]\nMelody\n[Chorus]\nTheme").slice(0, 3000));
        if (style.length < 10) throw new Error("Please describe the music you want.");
        const json = await runFalQueue(usedModel, { prompt: style, lyrics_prompt: lyricsPrompt }, falKey, "MiniMax");
        const url = extractAudioUrl(json);
        if (!url) throw new Error("Music returned no audio.");
        outputUrl = url;
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Generation failed.";
      throw new Error(`Music generation failed. Credits not charged. (${raw})`);
    }

    let newCredits = profile.credits;
    if (!isAdmin) {
      const { data: deduction, error: dErr } = await supabaseAdmin.rpc("deduct_credits", { _amount: cost, _gen_type: "music", _user_id: userId });
      if (dErr || !deduction) {
        if (dErr?.message?.includes("INSUFFICIENT_CREDITS")) throw new Error(`Not enough credits. This job costs ${cost} credits.`);
        throw new Error(`Could not charge credits: ${dErr?.message || "unknown"}`);
      }
      newCredits = (deduction as { credits: number }).credits;
    }

    const trackTitle = (data.prompt || "").trim().slice(0, 60) || `Track ${new Date().toLocaleDateString()}`;
    await supabase.from("generations").insert({
      user_id: userId, type: "music", prompt: brief.summaryPrompt.slice(0, 500), title: trackTitle,
      input_url: data.videoUrl || data.imageUrl || null, output_url: outputUrl, status: "success",
      metadata: {
        mode, model: usedModel, credits_charged: isAdmin ? 0 : cost, duration_seconds: durationSeconds,
        quality_tier: qualityTier, image_mood: imageMoodText || null,
        voice: mode === "voiceover" ? selectedVoice : null,
      },
    });
    await supabase.from("music_history").insert({
      user_id: userId, track_title: trackTitle, prompt: (data.prompt || brief.summaryPrompt).slice(0, 500),
      genre: data.genre || brief.genre || null, mood: data.mood || brief.emotion || null, duration: durationSeconds, audio_url: outputUrl,
    });

    return {
      outputUrl, credits: newCredits, durationSeconds, model: usedModel, mode,
      creditsCharged: isAdmin ? 0 : cost, trackTitle, imageMood: imageMoodText || null,
      voice: mode === "voiceover" ? selectedVoice : null,
      brief: { emotion: brief.emotion, genre: brief.genre, tempo: brief.tempo, mood: brief.mood, sources: brief.sources },
      usedFallback: false,
    };
  });

export const estimateMusicCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({
    mode: z.enum(["song", "instrumental", "voiceover", "sfx"]).default("instrumental"),
    durationSeconds: z.number().int().min(1).max(180).optional().default(30),
    promptLength: z.number().int().min(0).max(20000).optional().default(0),
    hasVideo: z.boolean().optional().default(false),
    hasImage: z.boolean().optional().default(false),
    qualityTier: z.enum(["standard", "premium"]).optional().default("standard"),
  }).parse(data))
  .handler(async ({ data }) => {
    const price = estimateMusicCustomerCredits({
      mode: data.mode, durationSeconds: data.durationSeconds, characters: data.promptLength,
      hasVideo: data.hasVideo, hasImage: data.hasImage, qualityTier: data.qualityTier,
    });
    return { modelId: price.modelId, credits: price.credits, billingNote: price.billingNote, mode: data.mode };
  });

export const MUSIC_GENRES = GENRES;
export const MUSIC_MOODS = MOODS;
export const MUSIC_INSTRUMENTS = INSTRUMENTS;
export { estimateMusicCustomerCredits, XAI_VOICES, normalizeVoice };
