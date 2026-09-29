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
  prompt: z.string().trim().max(12_000).optional().default(""),
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
  const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };
  const submit = await fetch(`${FAL_QUEUE}${model}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!submit.ok) throw new Error(friendlyError(submit.status, await submit.text()));
  const { status_url, response_url, request_id } = (await submit.json()) as {
    status_url: string;
    response_url: string;
    request_id?: string;
  };
  const deadline = Date.now() + 180_000;
  let delay = 1500;
  let lastStatus = "";
  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetch(status_url, { headers });
    if (!st.ok) {
      delay = Math.min(delay * 1.3, 5000);
      continue;
    }
    const sj = (await st.json()) as { status?: string };
    if (sj.status) lastStatus = sj.status;
    if (sj.status === "COMPLETED") break;
    if (sj.status === "FAILED" || sj.status === "ERROR") {
      throw new Error(`${label} failed${request_id ? ` (${request_id})` : ""}.`);
    }
    delay = Math.min(delay * 1.3, 5000);
  }
  if (lastStatus !== "COMPLETED") {
    throw new Error(`${label} timed out${request_id ? ` (${request_id})` : ""}.`);
  }
  const res = await fetch(response_url, { headers });
  if (!res.ok) throw new Error(friendlyError(res.status, await res.text()));
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
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 160,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "url", url: imageUrl } },
              {
                type: "text",
                text: "Analyze this image for music generation. Max 40 words: mood, atmosphere, energy, genre, tempo, instruments.",
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return "";
    const json = (await res.json()) as { content?: { type?: string; text?: string }[] };
    return (json.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join(" ")
      .trim()
      .slice(0, 280);
  } catch {
    return "";
  }
}

function isSafeExternalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host.startsWith("127.") || host.startsWith("10."))
      return false;
    return true;
  } catch {
    return false;
  }
}

/** Voice library preview — no credits. Prefer permanent R2 assets. */
export const getVoicePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ voice: z.enum(XAI_VOICES) }).parse(data))
  .handler(async ({ data }) => {
    const voice = data.voice as XaiVoiceId;

    const configured = getConfiguredVoicePreviewUrl(voice);
    if (configured) return { url: configured, voice, cached: true as const, source: "r2" as const };

    const falKey = process.env.FAL_API_KEY;
    if (!falKey) throw new Error("Preview service unavailable.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storagePath = `system/voice-previews/${voice}.mp3`;

    try {
      const { data: signed } = await supabaseAdmin.storage
        .from("uploads")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) {
        const probe = await fetch(signed.signedUrl, { method: "HEAD" });
        if (probe.ok) return { url: signed.signedUrl, voice, cached: true as const, source: "storage" as const };
      }
    } catch {
      /* generate below */
    }

    const json = await runFalQueue(
      "xai/tts/v1",
      { text: PREVIEW_LINES[voice], voice, language: "en" },
      falKey,
      "xAI TTS preview",
    );
    const remoteUrl = extractAudioUrl(json);
    if (!remoteUrl) throw new Error("Preview returned no audio.");

    try {
      const bin = await fetch(remoteUrl).then((r) => r.arrayBuffer());
      await supabaseAdmin.storage.from("uploads").upload(storagePath, bin, {
        contentType: "audio/mpeg",
        upsert: true,
      });
      const { data: signed } = await supabaseAdmin.storage
        .from("uploads")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) return { url: signed.signedUrl, voice, cached: false as const, source: "generated" as const };
    } catch {
      /* fall through */
    }

    return { url: remoteUrl, voice, cached: false as const, source: "generated" as const };
  });

/** Public capability contract for future frontend. */
export const getMusicCapabilities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, credits, email")
      .eq("id", userId)
      .single();
    const plan = (profile?.plan ?? "free") as PlanId;
    const credits = profile?.credits ?? 0;
    const isAdmin = isAdminEmail(profile?.email);
    const caps = isAdmin
      ? getMusicPlanCapabilities("business")
      : getMusicPlanCapabilities(plan);
    return musicCapabilitiesPublicPayload(isAdmin ? "business" : plan, isAdmin ? credits : credits, caps);
  });

export const generateMusic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan, credits, email")
      .eq("id", userId)
      .single();
    if (pErr || !profile) throw new Error("Could not load your account.");

    const isAdmin = isAdminEmail(profile.email);
    const plan = (profile.plan ?? "free") as PlanId;
    const caps = isAdmin ? getMusicPlanCapabilities("business") : getMusicPlanCapabilities(plan);

    if (!caps.musicEnabled && !isAdmin) {
      throw new Error("Music Studio requires Lite or a higher plan. Upgrade to unlock Music Studio.");
    }

    // Plan-level prompt / lyrics validation (before provider)
    if ((data.prompt || "").length > caps.promptMaxChars) {
      throw new Error(`Prompt exceeds your plan limit of ${caps.promptMaxChars} characters.`);
    }
    if ((data.lyrics || "").length > caps.lyricsMaxChars) {
      throw new Error(`Lyrics exceed your plan limit of ${caps.lyricsMaxChars} characters.`);
    }

    const mode = data.mode as MusicMode;
    const qualityTier = (data.qualityTier ?? "standard") as MusicQualityTier;
    const hasVideo = !!(data.videoUrl && isSafeExternalUrl(data.videoUrl));
    const hasImage = !!(data.imageUrl && isSafeExternalUrl(data.imageUrl));
    const durationSeconds = data.durationSeconds ?? 30;
    const videoAudioMode = data.videoAudioMode ?? "replace";

    if (hasVideo && data.videoUrl && !isSafeExternalUrl(data.videoUrl)) {
      throw new Error("Invalid video URL.");
    }
    if (hasImage && data.imageUrl && !isSafeExternalUrl(data.imageUrl)) {
      throw new Error("Invalid image URL.");
    }

    // Authoritative quote — same engine as estimate
    const quote = quoteMusicGeneration({
      plan: isAdmin ? "business" : plan,
      mode,
      qualityTier,
      durationSeconds,
      characters: (data.prompt || "").length,
      lyricsCharacters: (data.lyrics || "").length,
      hasVideo,
      hasImage,
      videoAudioMode,
    });

    if (!quote.allowed) {
      throw new Error(quote.reason || "This music request is not allowed on your plan.");
    }

    const cost = quote.customerCredits;
    if (!isAdmin && (profile.credits ?? 0) < cost) {
      throw new Error(`Not enough credits. This music job costs ${cost} credits.`);
    }

    const falKey = process.env.FAL_API_KEY;
    if (!falKey) throw new Error("Music service unavailable.");

    // Idempotency: if key provided and a successful generation already exists, return it
    if (data.idempotencyKey) {
      const { data: existing } = await supabaseAdmin
        .from("generations")
        .select("id, output_url, metadata, title")
        .eq("user_id", userId)
        .eq("type", "music")
        .eq("status", "success")
        .contains("metadata", { idempotency_key: data.idempotencyKey })
        .maybeSingle();
      if (existing?.output_url) {
        return {
          outputUrl: existing.output_url as string,
          videoUrl: (existing.metadata as { video_url?: string } | null)?.video_url ?? null,
          credits: profile.credits,
          durationSeconds,
          model: quote.modelLabel,
          mode: quote.mode,
          creditsCharged: 0,
          trackTitle: (existing.title as string) || "Track",
          imageMood: null,
          voice: null,
          originalAudioRemoved: videoAudioMode === "replace",
          outputType: (existing.metadata as { output_type?: string } | null)?.output_type === "video" ? "video" : "audio",
          pricingVersion: MUSIC_PRICING_VERSION,
          idempotentReplay: true,
        };
      }
    }

    let imageMoodText = "";
    if (hasImage && data.imageUrl && (quote.mode === "song" || quote.mode === "instrumental" || quote.mode === "bgm")) {
      imageMoodText = await analyzeImageMoodServer(data.imageUrl);
    }

    const instrumental =
      data.instrumental === true ||
      quote.mode === "instrumental" ||
      quote.mode === "bgm" ||
      quote.mode === "sfx";

    const textForBrief = [
      data.prompt || data.lyrics || "",
      imageMoodText ? `Visual atmosphere: ${imageMoodText}` : "",
      data.instrument ? `instrument: ${data.instrument}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    const brief = buildMusicBrief({
      text: textForBrief,
      imageUrl: data.imageUrl,
      videoUrl: data.videoUrl,
      preferredGenre: data.genre,
      preferredMood: data.mood,
      instrumental,
    });

    const composed = composeMusicPrompts({
      mode: quote.mode,
      qualityTier: quote.qualityTier,
      userPrompt: data.prompt || "",
      lyrics: data.lyrics,
      instrumental,
      imageMood: imageMoodText,
      genre: data.genre || brief.genre,
      mood: data.mood || brief.emotion,
      briefSummary: brief.summaryPrompt,
    });

    let outputUrl: string;
    let videoUrl: string | null = null;
    let originalAudioRemoved = false;
    let outputType: "audio" | "video" = "audio";
    const usedModel = quote.modelId;
    const selectedVoice = normalizeVoice(data.voice);

    try {
      if (quote.mode === "voiceover") {
        if (!composed.ttsText || composed.ttsText.length < 2) {
          throw new Error("Please enter text for the voiceover.");
        }
        const json = await runFalQueue(
          usedModel,
          { text: composed.ttsText, voice: selectedVoice, language: "auto" },
          falKey,
          "xAI TTS",
        );
        const url = extractAudioUrl(json);
        if (!url) throw new Error("Voiceover returned no audio.");
        outputUrl = url;
      } else if (quote.mode === "video_music") {
        if (!hasVideo || !data.videoUrl) throw new Error("Video URL required for Video→Music.");
        // Enforce provider segment limit — no silent truncation
        const billable = Math.min(durationSeconds, MMAUDIO_MAX_SEGMENT_SECONDS);
        if (durationSeconds > MMAUDIO_MAX_SEGMENT_SECONDS) {
          throw new Error(
            `Video audio generation is limited to ${MMAUDIO_MAX_SEGMENT_SECONDS}s per segment. ` +
              `Your request was ${durationSeconds}s. Please use a clip ≤ ${MMAUDIO_MAX_SEGMENT_SECONDS}s ` +
              `(multi-segment pipeline for longer videos is not available on this deployment).`,
          );
        }
        const json = await runFalQueue(
          usedModel,
          {
            video_url: data.videoUrl,
            prompt: composed.videoPrompt,
            num_steps: 25,
            duration: billable,
            cfg_strength: 4.5,
          },
          falKey,
          "MMAudio video",
        );
        // Prefer video output (frames + new audio). MMAudio generates new audio conditioned on visuals.
        const vUrl = extractVideoUrl(json);
        const aUrl = extractAudioUrl(json);
        if (vUrl && videoAudioMode === "replace") {
          videoUrl = vUrl;
          outputUrl = vUrl;
          outputType = "video";
          originalAudioRemoved = true;
        } else if (aUrl) {
          outputUrl = aUrl;
          // Audio-only: original video audio not muxed away without FFmpeg on this deployment
          originalAudioRemoved = false;
        } else {
          throw new Error("Video→music returned no media.");
        }
      } else if (quote.mode === "sfx") {
        if (durationSeconds > MMAUDIO_MAX_SEGMENT_SECONDS) {
          throw new Error(`SFX maximum duration is ${MMAUDIO_MAX_SEGMENT_SECONDS} seconds.`);
        }
        const json = await runFalQueue(
          usedModel,
          {
            prompt: composed.sfxPrompt,
            duration: Math.min(durationSeconds, MMAUDIO_MAX_SEGMENT_SECONDS),
            num_steps: 25,
            cfg_strength: 4.5,
          },
          falKey,
          "MMAudio SFX",
        );
        const url = extractAudioUrl(json);
        if (!url) throw new Error("SFX returned no audio.");
        outputUrl = url;
      } else {
        // song | instrumental | bgm via MiniMax
        if (composed.stylePrompt.length < 10) {
          throw new Error("Please describe the music you want.");
        }
        const json = await runFalQueue(
          usedModel,
          {
            prompt: composed.stylePrompt,
            lyrics_prompt: composed.lyricsPrompt || undefined,
          },
          falKey,
          "MiniMax",
        );
        const url = extractAudioUrl(json);
        if (!url) throw new Error("Music returned no audio.");
        outputUrl = url;
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Generation failed.";
      // Credits not charged yet — safe failure
      throw new Error(`Music generation failed. Credits not charged. (${raw})`);
    }

    // Charge only after successful provider output
    let newCredits = profile.credits ?? 0;
    if (!isAdmin) {
      const { data: deduction, error: dErr } = await supabaseAdmin.rpc("deduct_credits", {
        _amount: cost,
        _gen_type: "music",
        _user_id: userId,
      });
      if (dErr || !deduction) {
        if (dErr?.message?.includes("INSUFFICIENT_CREDITS")) {
          throw new Error(`Not enough credits. This job costs ${cost} credits.`);
        }
        // Provider succeeded but charge failed — mark recoverable
        console.error("[music] deduct_credits failed after generation", dErr?.message);
        throw new Error(
          `Generation succeeded but credits could not be charged (${dErr?.message || "unknown"}). Contact support with your output link if needed.`,
        );
      }
      newCredits = (deduction as { credits: number }).credits;
    }

    const trackTitle =
      (data.prompt || "").trim().slice(0, 60) || `Track ${new Date().toLocaleDateString()}`;

    const retain = await shouldRetainAsHistoryServer({
      supabaseAdmin: supabaseAdmin as never,
      userId,
      isPrivate: true,
    });

    const metadata = {
      product: "music",
      mode: quote.mode,
      quality_tier: quote.qualityTier,
      provider: "fal",
      model: usedModel,
      model_label: quote.modelLabel,
      credits_charged: isAdmin ? 0 : cost,
      provider_cost_usd: quote.providerCostUsd,
      duration_seconds: durationSeconds,
      duration_billable: quote.durationBillable,
      segments: quote.segments,
      prompt_characters: (data.prompt || "").length,
      lyrics_characters: (data.lyrics || "").length,
      plan,
      source_type: hasVideo ? "video" : hasImage ? "image" : "text",
      history_saved: retain,
      image_mood: imageMoodText || null,
      voice: quote.mode === "voiceover" ? selectedVoice : null,
      video_audio_mode: hasVideo ? videoAudioMode : null,
      original_audio_removed: originalAudioRemoved,
      output_type: outputType,
      video_url: videoUrl,
      pricing_version: MUSIC_PRICING_VERSION,
      registry_id: quote.registryId,
      idempotency_key: data.idempotencyKey ?? null,
      admin: isAdmin
        ? {
            provider_cost_usd: quote.providerCostUsd,
            customer_credits: cost,
            customer_value_usd: Number((cost * (4 / 350)).toFixed(4)),
            gross_spread_usd: Number((cost * (4 / 350) - quote.providerCostUsd).toFixed(4)),
          }
        : undefined,
    };

    // Private user R2: copy provider audio/video into users/{userId}/
    let musicR2Key: string | null = null;
    let musicStorageProvider: string | null = null;
    if (outputUrl && outputUrl.startsWith("https://")) {
      try {
        const { ingestProviderMediaToUserR2 } = await import("@/lib/user-media.server");
        const kind = outputType === "video" ? "video" : "music";
        const ingested = await ingestProviderMediaToUserR2({
          userId,
          sourceUrl: outputUrl,
          kind,
          plan: profile.plan,
          preferPrivateR2: isAdmin,
        });
        if (ingested) {
          musicR2Key = ingested.objectKey;
          musicStorageProvider = ingested.storageProvider; // blob (free) or r2 (paid/admin)
          outputUrl = ingested.deliveryUrl;
          if (outputType === "video") videoUrl = ingested.deliveryUrl;
        }
      } catch (e) {
        console.warn("[music] user R2 ingest skipped:", e);
      }
    }

    const { data: genRow, error: genErr } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        type: "music",
        prompt: brief.summaryPrompt.slice(0, 500),
        title: trackTitle,
        input_url: data.videoUrl || data.imageUrl || null,
        output_url: outputUrl,
        status: "success",
        retained_as_history: retain,
        storage_provider: musicStorageProvider,
        r2_object_key: musicR2Key,
        metadata,
      })
      .select("id")
      .maybeSingle();

    if (genErr) {
      console.error("[music] generations insert failed", genErr.message);
    }

    const generationId = (genRow as { id?: string } | null)?.id ?? null;

    // music_history — required for product History
    const historyPayload: Record<string, unknown> = {
      user_id: userId,
      track_title: trackTitle,
      prompt: (data.prompt || brief.summaryPrompt).slice(0, 500),
      genre: data.genre || brief.genre || null,
      mood: data.mood || brief.emotion || null,
      duration: durationSeconds,
      audio_url: outputUrl,
      retained_as_history: retain,
    };
    // Extended columns (migration) — ignore if not present yet
    historyPayload.mode = quote.mode;
    historyPayload.quality_tier = quote.qualityTier;
    historyPayload.model_id = usedModel;
    historyPayload.credits_charged = isAdmin ? 0 : cost;
    historyPayload.provider_cost_usd = quote.providerCostUsd;
    historyPayload.source_type = hasVideo ? "video" : hasImage ? "image" : "text";
    historyPayload.source_url = data.videoUrl || data.imageUrl || null;
    historyPayload.generation_id = generationId;
    historyPayload.video_url = videoUrl;
    historyPayload.original_audio_removed = originalAudioRemoved;

    const { error: histErr } = await supabase.from("music_history").insert(historyPayload);
    if (histErr) {
      // Retry minimal columns only
      const { error: histErr2 } = await supabase.from("music_history").insert({
        user_id: userId,
        track_title: trackTitle,
        prompt: (data.prompt || brief.summaryPrompt).slice(0, 500),
        genre: data.genre || brief.genre || null,
        mood: data.mood || brief.emotion || null,
        duration: durationSeconds,
        audio_url: outputUrl,
        retained_as_history: retain,
      });
      if (histErr2) {
        console.error("[music] music_history insert failed", histErr2.message);
      }
    }

    return {
      outputUrl,
      videoUrl,
      credits: newCredits,
      durationSeconds,
      model: quote.modelLabel,
      mode: quote.mode,
      qualityTier: quote.qualityTier,
      creditsCharged: isAdmin ? 0 : cost,
      trackTitle,
      imageMood: imageMoodText || null,
      voice: quote.mode === "voiceover" ? selectedVoice : null,
      originalAudioRemoved,
      outputType,
      pricingVersion: MUSIC_PRICING_VERSION,
      brief: {
        emotion: brief.emotion,
        genre: brief.genre,
        tempo: brief.tempo,
        mood: brief.mood,
        sources: brief.sources,
      },
      usedFallback: false,
      generationId,
    };
  });

export const estimateMusicCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        mode: z.enum(MUSIC_MODES).default("instrumental"),
        durationSeconds: z.number().int().min(1).max(30).optional().default(30),
        promptLength: z.number().int().min(0).max(20_000).optional().default(0),
        hasVideo: z.boolean().optional().default(false),
        hasImage: z.boolean().optional().default(false),
        qualityTier: z.enum(["standard", "premium"]).optional().default("standard"),
        videoAudioMode: z.enum(["replace", "mix"]).optional().default("replace"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, email")
      .eq("id", userId)
      .single();
    const isAdmin = isAdminEmail(profile?.email);
    const plan = (profile?.plan ?? "free") as PlanId;

    const quote = quoteMusicGeneration({
      plan: isAdmin ? "business" : plan,
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
      providerCostUsd: isAdmin ? quote.providerCostUsd : undefined,
      mode: quote.mode,
      quality: quote.qualityTier,
      provider: "fal",
      model: quote.modelLabel,
      duration: quote.durationBillable,
      promptLimit: quote.promptMaxChars,
      lyricsLimit: quote.lyricsMaxChars,
      reason: quote.reason,
      pricingVersion: quote.pricingVersion,
      videoAudioMode: quote.videoAudioMode,
      // legacy fields
      modelId: quote.modelLabel,
      billingNote:
        quote.mode === "voiceover"
          ? "Scales with script length"
          : quote.mode === "sfx" || quote.mode === "video_music"
            ? "Scales with duration"
            : "Flat rate per track",
    };
  });

export const MUSIC_GENRES = GENRES;
export const MUSIC_MOODS = MOODS;
export const MUSIC_INSTRUMENTS = INSTRUMENTS;
export { estimateMusicCustomerCredits } from "@/lib/music/music-quote";
export { XAI_VOICES, normalizeVoice };
export type { MusicMode, MusicQualityTier };
