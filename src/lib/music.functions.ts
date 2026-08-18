/**
 * MOTIO2EDIT Music Studio — server functions.
 *
 * Modes:
 *   song         → fal-ai/minimax-music/v2 (text style + lyrics)
 *   instrumental → fal-ai/minimax-music/v2 (instrumental / style prompt)
 *   voiceover    → xai/tts/v1
 *   sfx          → fal-ai/mmaudio-v2/text-to-audio  OR  fal-ai/mmaudio-v2 (video+text)
 *
 * Credits: generation-cost-registry (provider → Motio2edit credits).
 * Charge only after a valid audio URL. Free plan blocked via canAccessMusic.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canAccessMusic } from "@/lib/policy";
import { buildMusicBrief } from "@/lib/music/music-brief";
import {
  estimateCredits,
  getRegistryEntry,
  type RegistryEntry,
} from "@/lib/generation-cost-registry";

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

export type MusicMode = "song" | "instrumental" | "voiceover" | "sfx";

const inputSchema = z.object({
  mode: z.enum(["song", "instrumental", "voiceover", "sfx"]).default("instrumental"),
  prompt: z.string().trim().max(4000).optional().default(""),
  lyrics: z.string().trim().max(3500).optional(),
  genre: z.enum(GENRES).optional(),
  mood: z.enum(MOODS).optional(),
  durationSeconds: z.number().int().min(1).max(180).optional().default(30),
  imageUrl: z.string().url().max(8000).optional(),
  videoUrl: z.string().url().max(8000).optional(),
  audioUrl: z.string().url().max(8000).optional(),
  voice: z.string().max(40).optional(),
  instrumental: z.boolean().optional(),
  tier: z.enum(["lite", "pro"]).optional(),
});

function registryForMode(mode: MusicMode, hasVideo: boolean): RegistryEntry {
  if (mode === "voiceover") {
    const e = getRegistryEntry("tts_xai");
    if (!e) throw new Error("Voiceover model is not configured.");
    return e;
  }
  if (mode === "sfx") {
    if (hasVideo) {
      const e = getRegistryEntry("sfx_mmaudio_v2");
      if (!e) throw new Error("Video→audio model is not configured.");
      return e;
    }
    const e = getRegistryEntry("sfx_mmaudio_text");
    if (!e) throw new Error("SFX model is not configured.");
    return e;
  }
  const e = getRegistryEntry("music_minimax_v2");
  if (!e) throw new Error("Music model is not configured.");
  return e;
}

function costFor(entry: RegistryEntry, opts: { durationSeconds?: number; characters?: number }) {
  return estimateCredits(entry, opts);
}

function safePayload(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    out[k] = typeof v === "string" && v.length > 120 ? `${v.slice(0, 100)}…` : v;
  }
  return out;
}

function friendlyError(status: number, txt: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(txt) as { detail?: unknown };
    if (typeof parsed.detail === "string") detail = parsed.detail;
    else if (Array.isArray(parsed.detail)) {
      detail = (parsed.detail as { msg?: string }[])
        .map((d) => d?.msg)
        .filter(Boolean)
        .join("; ");
    }
  } catch {
    detail = txt.slice(0, 200);
  }
  if (status === 429) return "Music service is rate-limited. Please retry in a moment.";
  if (status === 401 || status === 403)
    return "Music service authentication failed. Please try again shortly.";
  if (/balance|billing|top up|exhausted/i.test(detail))
    return "The music AI service is temporarily unavailable. Please try again later.";
  if (/nsfw|safety/i.test(detail))
    return "This request was blocked by the safety filter. Try a different description.";
  if (detail) return `Music generation failed: ${detail.slice(0, 160)}`;
  return `Music generation failed (status ${status}). Please try again.`;
}

async function runFalQueue(
  model: string,
  body: Record<string, unknown>,
  falKey: string,
  label: string,
): Promise<Record<string, unknown>> {
  const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };
  console.log("[music] ▶", label, model, JSON.stringify(safePayload(body)));

  const submit = await fetch(`${FAL_QUEUE}${model}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!submit.ok) {
    const txt = await submit.text();
    console.error("[music] ✖ submit", submit.status, txt.slice(0, 400));
    throw new Error(friendlyError(submit.status, txt));
  }
  const { status_url, response_url } = (await submit.json()) as {
    request_id: string;
    status_url: string;
    response_url: string;
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
      const bodyTxt = await fetch(response_url, { headers })
        .then((r) => r.text())
        .catch(() => "");
      throw new Error(friendlyError(500, bodyTxt));
    }
    delay = Math.min(delay * 1.3, 5000);
  }
  if (lastStatus !== "COMPLETED") {
    throw new Error(`${label} timed out. Please try again.`);
  }

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

const MIN_AUDIO_BYTES = 8_000;
async function isPlayableAudio(url: string): Promise<boolean> {
  if (!url?.startsWith("http")) return false;
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (!head.ok) return false;
    const len = Number(head.headers.get("content-length") ?? "0");
    if (len && len < MIN_AUDIO_BYTES) {
      console.warn("[music] audio too small:", len);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function generateMinimaxMusic(args: {
  falKey: string;
  stylePrompt: string;
  lyrics?: string;
  instrumental: boolean;
}): Promise<string> {
  const model = "fal-ai/minimax-music/v2";
  let style = args.stylePrompt.trim().slice(0, 300);
  if (style.length < 10) style = `${style} professional cinematic music production`.slice(0, 300);

  let lyricsPrompt: string;
  if (args.instrumental) {
    lyricsPrompt =
      "## instrumental arrangement ##\n[Intro]\n[Verse]\n[Chorus]\n[Outro]\n" +
      "(no sung vocals — instrumental only)";
  } else {
    lyricsPrompt = (args.lyrics || args.stylePrompt).trim();
    if (lyricsPrompt.length < 10) {
      lyricsPrompt = `[Verse]\n${lyricsPrompt || "Wordless melody"}\n[Chorus]\n${lyricsPrompt || "Melodic theme"}`;
    }
    lyricsPrompt = lyricsPrompt.slice(0, 3000);
  }

  const json = await runFalQueue(
    model,
    { prompt: style, lyrics_prompt: lyricsPrompt },
    args.falKey,
    "MiniMax Music v2",
  );
  const url = extractAudioUrl(json);
  if (!url) throw new Error("Music generation returned no audio.");
  return url;
}

async function generateMmaudio(args: {
  falKey: string;
  prompt: string;
  videoUrl?: string;
  durationSeconds: number;
}): Promise<{ url: string; model: string }> {
  const duration = Math.min(30, Math.max(1, args.durationSeconds));
  const prompt = (args.prompt || "ambient cinematic soundscape").slice(0, 500);

  if (args.videoUrl) {
    const model = "fal-ai/mmaudio-v2";
    const json = await runFalQueue(
      model,
      {
        video_url: args.videoUrl,
        prompt,
        num_steps: 25,
        duration,
        cfg_strength: 4.5,
      },
      args.falKey,
      "MMAudio V2 video→audio",
    );
    const url = extractAudioUrl(json);
    if (!url) throw new Error("Video→music returned no audio.");
    return { url, model };
  }

  const model = "fal-ai/mmaudio-v2/text-to-audio";
  const json = await runFalQueue(
    model,
    { prompt, duration, num_steps: 25, cfg_strength: 4.5 },
    args.falKey,
    "MMAudio text SFX",
  );
  const url = extractAudioUrl(json);
  if (!url) throw new Error("SFX generation returned no audio.");
  return { url, model };
}

async function generateVoiceover(args: {
  falKey: string;
  text: string;
  voice?: string;
}): Promise<string> {
  const model = "xai/tts/v1";
  const text = args.text.trim().slice(0, 15000);
  if (text.length < 1) throw new Error("Voiceover requires a script.");
  const voice = (args.voice || "eve").toLowerCase();
  const allowed = new Set(["eve", "ara", "rex", "sal", "leo"]);
  const json = await runFalQueue(
    model,
    {
      text,
      voice: allowed.has(voice) ? voice : "eve",
      language: "auto",
    },
    args.falKey,
    "xAI TTS",
  );
  const url = extractAudioUrl(json);
  if (!url) throw new Error("Voiceover returned no audio.");
  return url;
}

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

    const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const isAdmin =
      !!adminEmail && !!profile.email && profile.email.toLowerCase() === adminEmail;

    if (!canAccessMusic({ plan: profile.plan, email: profile.email, isAdmin })) {
      throw new Error(
        "Music generation requires Lite or a higher plan. Upgrade to unlock Music Studio.",
      );
    }

    const mode: MusicMode = data.mode;
    const hasVideo = !!(data.videoUrl && data.videoUrl.startsWith("https://"));
    const entry = registryForMode(mode, hasVideo);

    const useVideoMusic =
      hasVideo && (mode === "sfx" || mode === "song" || mode === "instrumental");

    const durationSeconds = data.durationSeconds ?? 30;
    const characters = (data.prompt || "").length;

    const costEst = costFor(entry, {
      durationSeconds: useVideoMusic || mode === "sfx" ? durationSeconds : undefined,
      characters: mode === "voiceover" ? Math.max(characters, 1) : undefined,
    });
    const cost = costEst.credits;

    if (!isAdmin && profile.credits < cost) {
      throw new Error(
        `Not enough credits. This music job costs ${cost} credits (provider ≈ $${costEst.providerUsd.toFixed(3)}).`,
      );
    }

    const falKey = process.env.FAL_API_KEY;
    if (!falKey) throw new Error("Music service unavailable.");

    const instrumental =
      data.instrumental === true || mode === "instrumental" || mode === "sfx";
    const brief = buildMusicBrief({
      text: data.prompt || data.lyrics || "",
      imageUrl: data.imageUrl,
      videoUrl: data.videoUrl,
      audioUrl: data.audioUrl,
      preferredGenre: data.genre,
      preferredMood: data.mood,
      instrumental,
    });

    let outputUrl: string;
    let usedModel: string;
    try {
      if (mode === "voiceover") {
        usedModel = "xai/tts/v1";
        outputUrl = await generateVoiceover({
          falKey,
          text: data.prompt || "",
          voice: data.voice,
        });
      } else if (useVideoMusic) {
        const r = await generateMmaudio({
          falKey,
          prompt: brief.summaryPrompt,
          videoUrl: data.videoUrl,
          durationSeconds,
        });
        outputUrl = r.url;
        usedModel = r.model;
      } else if (mode === "sfx") {
        const r = await generateMmaudio({
          falKey,
          prompt: data.prompt || brief.summaryPrompt,
          durationSeconds: Math.min(30, durationSeconds),
        });
        outputUrl = r.url;
        usedModel = r.model;
      } else {
        usedModel = "fal-ai/minimax-music/v2";
        const style = [
          brief.summaryPrompt,
          data.genre ? `${data.genre} genre` : "",
          data.mood ? `${data.mood} mood` : "",
        ]
          .filter(Boolean)
          .join(". ")
          .slice(0, 300);
        outputUrl = await generateMinimaxMusic({
          falKey,
          stylePrompt: style,
          lyrics: data.lyrics || (mode === "song" ? data.prompt : undefined),
          instrumental: mode === "instrumental" || instrumental,
        });
      }

      if (!(await isPlayableAudio(outputUrl))) {
        if (!outputUrl.startsWith("http")) {
          throw new Error("Generation returned no playable media.");
        }
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Generation failed.";
      console.error("[music] failed (no credits charged):", raw);
      throw new Error(`Music generation failed. Credits not charged. (${raw})`);
    }

    let newCredits = profile.credits;
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
        throw new Error(`Could not charge credits: ${dErr?.message || "unknown error"}`);
      }
      newCredits = (deduction as { credits: number }).credits;
      console.log("[music] charged", cost, "credits →", newCredits);
    }

    const { error: histErr } = await supabase.from("generations").insert({
      user_id: userId,
      type: "music",
      prompt: brief.summaryPrompt.slice(0, 500),
      input_url: data.videoUrl || data.imageUrl || data.audioUrl || null,
      output_url: outputUrl,
      status: "success",
      metadata: {
        mode,
        model: usedModel,
        credits_charged: isAdmin ? 0 : cost,
        provider_usd_est: costEst.providerUsd,
        brief_emotion: brief.emotion,
        brief_genre: brief.genre,
        sources: brief.sources,
      },
    });
    if (histErr) console.error("[music] history insert failed:", histErr.message);

    return {
      outputUrl,
      credits: newCredits,
      durationSeconds,
      model: usedModel,
      mode,
      creditsCharged: isAdmin ? 0 : cost,
      providerUsdEstimate: costEst.providerUsd,
      brief: {
        emotion: brief.emotion,
        genre: brief.genre,
        tempo: brief.tempo,
        mood: brief.mood,
        sources: brief.sources,
      },
      usedFallback: false,
    };
  });

export const estimateMusicCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        mode: z.enum(["song", "instrumental", "voiceover", "sfx"]).default("instrumental"),
        durationSeconds: z.number().int().min(1).max(180).optional().default(30),
        promptLength: z.number().int().min(0).max(20000).optional().default(0),
        hasVideo: z.boolean().optional().default(false),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const entry = registryForMode(data.mode, !!data.hasVideo);
    const est = costFor(entry, {
      durationSeconds: data.durationSeconds,
      characters: data.mode === "voiceover" ? Math.max(1, data.promptLength) : undefined,
    });
    return {
      modelId: entry.modelId,
      credits: est.credits,
      providerUsd: est.providerUsd,
      customerValueUsd: est.customerValueUsd,
      mode: data.mode,
    };
  });

export const MUSIC_GENRES = GENRES;
export const MUSIC_MOODS = MOODS;
