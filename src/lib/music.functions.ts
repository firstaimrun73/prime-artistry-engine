/**
 * MOTIO2EDIT Music Studio — server functions.
 * Plan capabilities + quoteMusicGeneration are authoritative.
 * Never trust client plan, credits, model, quality, or price.
 * Generated media stays on the provider URL (no R2/Blob rehost).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "@/lib/admin-config";
import { resolveMusicPlanForRequest } from "@/lib/music/music-admin-plan";
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
  durationSeconds: z.number().int().min(1).max(120).optional().default(30),
  imageUrl: z.string().url().max(8000).optional(),
  videoUrl: z.string().url().max(8000).optional(),
  audioUrl: z.string().url().max(8000).optional(),
  voice: z.enum(XAI_VOICES).optional(),
  instrumental: z.boolean().optional(),
  qualityTier: z.enum(["standard", "premium"]).optional().default("standard"),
  videoAudioMode: z.enum(["replace", "mix"]).optional().default("replace"),
  idempotencyKey: z.string().uuid().optional(),
  adminTestPlan: z.enum(["free", "lite", "plus", "pro", "studio"]).optional(),
});

function friendlyError(status: number, _txt: string): string {
  if (status === 429) return "Music service is rate-limited. Please retry in a moment.";
  if (status === 401 || status === 403) return "Music service authentication failed. Please try again shortly.";
  return `Music generation failed (status ${status}). Please try again.`;
}

async function runFalQueue(
  model: string,
  body: Record<string, unknown>,
  falKey: string,
  label: string,
) {
  const submit = await fetch(`${FAL_QUEUE}${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!submit.ok) {
    const txt = await submit.text().catch(() => "");
    throw new Error(friendlyError(submit.status, txt));
  }
  const submitted = (await submit.json()) as { request_id?: string; status_url?: string; response_url?: string };
  const requestId = submitted.request_id;
  if (!requestId) throw new Error(`${label} did not return a request id.`);
  const statusUrl = submitted.status_url || `${FAL_QUEUE}${model}/requests/${requestId}/status`;
  const responseUrl = submitted.response_url || `${FAL_QUEUE}${model}/requests/${requestId}`;
  const started = Date.now();
  for (;;) {
    if (Date.now() - started > 240_000) throw new Error(`${label} timed out.`);
    await sleep(1500);
    const st = await fetch(statusUrl, { headers: { Authorization: `Key ${falKey}` } });
    if (!st.ok) continue;
    const sj = (await st.json()) as { status?: string };
    if (sj.status === "COMPLETED") break;
    if (sj.status === "FAILED" || sj.status === "CANCELLED") throw new Error(`${label} failed (${sj.status}).`);
  }
  const res = await fetch(responseUrl, { headers: { Authorization: `Key ${falKey}` } });
  if (!res.ok) throw new Error(friendlyError(res.status, await res.text().catch(() => "")));
  return (await res.json()) as Record<string, unknown>;
}

function extractAudioUrl(json: Record<string, unknown>): string | null {
  const audio = json.audio as { url?: string } | undefined;
  const audioFile = json.audio_file as { url?: string } | undefined;
  return audio?.url ?? audioFile?.url ?? null;
}

function extractVideoUrl(json: Record<string, unknown>): string | null {
  const video = json.video as { url?: string } | undefined;
  return video?.url ?? null;
}

async function analyzeImageMoodServer(imageUrl: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !imageUrl.startsWith("http")) return "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 160,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            { type: "text", text: "Analyze this image for music generation. Max 40 words: mood, atmosphere, energy, genre, tempo, instruments." },
          ],
        }],
      }),
    });
    if (!res.ok) return "";
    const json = (await res.json()) as { content?: { type?: string; text?: string }[] };
    return (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join(" ").trim().slice(0, 280);
  } catch {
    return "";
  }
}

function isSafeExternalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host.startsWith("127.") || host.startsWith("10.")) return false;
    return true;
  } catch {
    return false;
  }
}

export const getMusicCapabilities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ adminTestPlan: z.enum(["free", "lite", "plus", "pro", "studio"]).optional() }).optional().default({}).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("plan, credits, email").eq("id", userId).single();
    const isAdmin = isAdminEmail(profile?.email);
    const resolved = resolveMusicPlanForRequest({ isAdmin, profilePlan: profile?.plan, adminTestPlan: data?.adminTestPlan });
    return musicCapabilitiesPublicPayload(resolved.planForCaps, profile?.credits ?? 0, resolved.caps);
  });

export const generateMusic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: profile } = await supabaseAdmin.from("profiles").select("plan, credits, email").eq("id", userId).single();
    if (!profile) throw new Error("Profile not found.");

    const isAdmin = isAdminEmail(profile.email);
    const resolved = resolveMusicPlanForRequest({ isAdmin, profilePlan: profile.plan, adminTestPlan: data.adminTestPlan });
    const plan = resolved.planForCaps;
    const caps = resolved.caps;
    const shouldCharge = resolved.shouldCharge;

    if (!caps.musicEnabled) {
      throw new Error("Music Studio is limited on Free. Upgrade for full modes, longer tracks, and Premium quality.");
    }
    if ((data.prompt || "").length > caps.promptMaxChars) {
      throw new Error(`Prompt exceeds your plan limit of ${caps.promptMaxChars} characters.`);
    }
    if (data.lyrics && data.lyrics.length > caps.lyricsMaxChars) {
      throw new Error(`Lyrics exceed your plan limit of ${caps.lyricsMaxChars} characters.`);
    }

    const mode = data.mode as MusicMode;
    if (!caps.allowedModes.includes(mode)) throw new Error(`Mode "${mode}" is not available on your plan.`);
    const qualityTier = (data.qualityTier || "standard") as MusicQualityTier;
    if (!caps.allowedQualityTiers.includes(qualityTier)) {
      throw new Error("Premium Music is available on Pro and Studio plans only.");
    }

    const durationSeconds = data.durationSeconds ?? 30;
    const selectedVoice = data.voice ? normalizeVoice(data.voice) : undefined;
    if (mode === "voiceover") {
      if (!caps.voiceoverEnabled || caps.allowedVoices.length === 0) throw new Error("AI Voice is not available on your plan.");
      if (selectedVoice && !(caps.allowedVoices as readonly string[]).includes(selectedVoice)) {
        throw new Error("That voice is not available on your plan.");
      }
    }

    const hasVideo = Boolean(data.videoUrl);
    const hasImage = Boolean(data.imageUrl);
    if (hasVideo && data.videoUrl && !isSafeExternalUrl(data.videoUrl)) throw new Error("Invalid video URL.");
    if (hasImage && data.imageUrl && !isSafeExternalUrl(data.imageUrl)) throw new Error("Invalid image URL.");

    const quote = quoteMusicGeneration({
      plan, mode, qualityTier, durationSeconds,
      characters: (data.prompt || "").length,
      lyricsCharacters: (data.lyrics || "").length,
      hasVideo, hasImage, videoAudioMode: data.videoAudioMode,
    });
    if (!quote.allowed) throw new Error(quote.reason || "This music request is not allowed on your plan.");
    const cost = quote.customerCredits;
    if (shouldCharge && (profile.credits ?? 0) < cost) {
      throw new Error(`Not enough credits. This music job costs ${cost} credits.`);
    }

    const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
    if (!falKey && mode !== "voiceover") throw new Error("Music provider is not configured.");

    const imageMoodText = hasImage && data.imageUrl ? await analyzeImageMoodServer(data.imageUrl) : "";
    const brief = buildMusicBrief({
      mode, prompt: data.prompt || "", lyrics: data.lyrics, genre: data.genre, mood: data.mood,
      instrument: data.instrument, imageMood: imageMoodText || undefined,
    });
    const composed = composeMusicPrompts({
      brief,
      instrumental: mode === "instrumental" || mode === "bgm" || data.instrumental === true,
    });

    const usedModel = quote.modelId || quote.modelLabel;
    let outputUrl: string;
    let actualDurationSeconds: number = durationSeconds;
    let outVideoUrl: string | null = null;
    let originalAudioRemoved = false;
    let outputType: "audio" | "video" = "audio";

    try {
      if (mode === "voiceover") {
        const xaiKey = process.env.XAI_API_KEY;
        if (!xaiKey) throw new Error("Voice provider is not configured.");
        const ttsRes = await fetch("https://api.x.ai/v1/tts", {
          method: "POST",
          headers: { Authorization: `Bearer ${xaiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ text: (data.prompt || "").slice(0, caps.promptMaxChars), voice: selectedVoice || "eve" }),
        });
        if (!ttsRes.ok) throw new Error("Voice generation failed.");
        const ttsJson = (await ttsRes.json()) as { url?: string; audio?: { url?: string } };
        const url = ttsJson.url || ttsJson.audio?.url;
        if (!url) throw new Error("Voice returned no audio.");
        outputUrl = url;
      } else if (mode === "video_music") {
        if (!data.videoUrl) throw new Error("Upload a video for Video Music.");
        if (!caps.videoToMusic) throw new Error("Video→Music is not available on your plan.");
        const billable = Math.min(durationSeconds, MMAUDIO_MAX_SEGMENT_SECONDS);
        if (durationSeconds > MMAUDIO_MAX_SEGMENT_SECONDS) {
          throw new Error(`Video Music is limited to ${MMAUDIO_MAX_SEGMENT_SECONDS}s clips on the current provider.`);
        }
        const json = await runFalQueue(
          usedModel,
          { prompt: composed.stylePrompt || composed.sfxPrompt || data.prompt, video_url: data.videoUrl, duration: billable, num_steps: 25, cfg_strength: 4.5 },
          falKey!, "MMAudio Video Music",
        );
        const aUrl = extractAudioUrl(json);
        const vUrl = extractVideoUrl(json);
        if (vUrl) { outputUrl = vUrl; outVideoUrl = vUrl; outputType = "video"; originalAudioRemoved = data.videoAudioMode === "replace"; }
        else if (aUrl) outputUrl = aUrl;
        else throw new Error("Video Music returned no media.");
        actualDurationSeconds = billable;
      } else if (mode === "sfx") {
        if (durationSeconds > MMAUDIO_MAX_SEGMENT_SECONDS) {
          throw new Error(`SFX maximum duration is ${MMAUDIO_MAX_SEGMENT_SECONDS} seconds.`);
        }
        const json = await runFalQueue(
          usedModel,
          { prompt: composed.sfxPrompt || data.prompt, duration: Math.min(durationSeconds, MMAUDIO_MAX_SEGMENT_SECONDS), num_steps: 25, cfg_strength: 4.5 },
          falKey!, "MMAudio SFX",
        );
        const url = extractAudioUrl(json);
        if (!url) throw new Error("SFX returned no audio.");
        outputUrl = url;
        actualDurationSeconds = Math.min(durationSeconds, MMAUDIO_MAX_SEGMENT_SECONDS);
      } else {
        if ((composed.stylePrompt || "").length < 10) throw new Error("Please describe the music you want.");
        const requestedDuration = Math.min(Math.max(durationSeconds, 10), 120);
        const json = await runFalQueue(
          usedModel,
          { prompt: composed.stylePrompt, lyrics: composed.lyricsPrompt || undefined, duration: requestedDuration },
          falKey!, "MiniMax Music 3",
        );
        const url = extractAudioUrl(json);
        if (!url) throw new Error("Music returned no audio.");
        outputUrl = url;
        if (typeof json.duration === "number" && json.duration > 0) actualDurationSeconds = Math.round(json.duration);
        else actualDurationSeconds = requestedDuration;
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Generation failed.";
      throw new Error(`Music generation failed. Credits not charged. (${raw})`);
    }

    let newCredits = profile.credits ?? 0;
    if (shouldCharge) {
      const { data: deduction, error: dErr } = await supabaseAdmin.rpc("deduct_credits", {
        p_user_id: userId, p_amount: cost, p_reason: "music_generation",
      });
      if (dErr) {
        if (String(dErr.message || "").toLowerCase().includes("insufficient")) {
          throw new Error(`Not enough credits. This job costs ${cost} credits.`);
        }
        throw new Error(`Generation succeeded but credits could not be charged (${dErr.message}).`);
      }
      if (typeof deduction === "number") newCredits = deduction;
      else newCredits = Math.max(0, (profile.credits ?? 0) - cost);
    }

    const trackTitle = (brief.summaryPrompt || data.prompt || "Generated track").slice(0, 80);
    const retain = await shouldRetainAsHistoryServer({
      userId,
      product: "music",
      planId: plan,
      historyEnabled: caps.historyEnabled,
    });

    // Provider URL preserved — do not copy generated Music media to R2/Blob.
    try {
      await supabaseAdmin.from("generations").insert({
        user_id: userId,
        type: "music",
        prompt: (brief.summaryPrompt || data.prompt || "").slice(0, 500),
        title: trackTitle,
        input_url: data.videoUrl || data.imageUrl || null,
        output_url: outputUrl,
        status: "success",
        retained_as_history: retain,
        metadata: {
          product: "music",
          mode: quote.mode,
          quality_tier: quote.qualityTier,
          model_id: usedModel,
          credits_charged: shouldCharge ? cost : 0,
          duration_seconds: actualDurationSeconds,
          duration_requested: durationSeconds,
          history_saved: retain,
          pricing_version: MUSIC_PRICING_VERSION,
          admin: isAdmin,
          admin_test_plan: resolved.usingAdminTestPlan ? plan : undefined,
          output_type: outputType,
        },
      });
    } catch (e) {
      console.error("[music] generations insert failed", e);
    }

    return {
      outputUrl,
      videoUrl: outVideoUrl,
      credits: newCredits,
      durationSeconds: actualDurationSeconds,
      durationRequested: durationSeconds,
      model: quote.modelLabel,
      mode: quote.mode,
      qualityTier: quote.qualityTier,
      creditsCharged: shouldCharge ? cost : 0,
      trackTitle,
      outputType,
      originalAudioRemoved,
      pricingVersion: MUSIC_PRICING_VERSION,
    };
  });

export const estimateMusicCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      mode: z.enum(MUSIC_MODES).default("instrumental"),
      durationSeconds: z.number().int().min(1).max(120).optional().default(30),
      promptLength: z.number().int().min(0).max(20_000).optional().default(0),
      hasVideo: z.boolean().optional().default(false),
      hasImage: z.boolean().optional().default(false),
      qualityTier: z.enum(["standard", "premium"]).optional().default("standard"),
      videoAudioMode: z.enum(["replace", "mix"]).optional().default("replace"),
      adminTestPlan: z.enum(["free", "lite", "plus", "pro", "studio"]).optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("plan, email").eq("id", userId).single();
    const isAdmin = isAdminEmail(profile?.email);
    const resolved = resolveMusicPlanForRequest({ isAdmin, profilePlan: profile?.plan, adminTestPlan: data.adminTestPlan });
    const quote = quoteMusicGeneration({
      plan: resolved.planForCaps,
      mode: data.mode as MusicMode,
      qualityTier: data.qualityTier as MusicQualityTier,
      durationSeconds: data.durationSeconds,
      characters: data.promptLength,
      hasVideo: data.hasVideo,
      hasImage: data.hasImage,
      videoAudioMode: data.videoAudioMode,
    });
    return {
      allowed: quote.allowed,
      credits: quote.customerCredits,
      mode: quote.mode,
      quality: quote.qualityTier,
      duration: quote.durationBillable,
      reason: quote.reason,
      pricingVersion: quote.pricingVersion,
    };
  });

export const MUSIC_GENRES = GENRES;
export const MUSIC_MOODS = MOODS;
export const MUSIC_INSTRUMENTS = INSTRUMENTS;
export { estimateMusicCustomerCredits } from "@/lib/music/music-quote";
export { XAI_VOICES, normalizeVoice };
export type { MusicMode, MusicQualityTier };
