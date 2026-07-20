// AI Music Studio server function.
//
// Uses fal.ai's Stable Audio via the async queue API. The queue API is the
// same pattern the image/video generator uses in generate.functions.ts — it
// tolerates long jobs (music generation can take 20–60s) without holding a
// synchronous HTTP connection open.
//
// Contract:
//   • Auth is required (requireSupabaseAuth middleware).
//   • Credits are deducted ONLY after a successful audio URL is returned.
//     A failed / empty generation never charges the user.
//   • Every successful generation is persisted to public.generations with
//     type='music' so it appears in /history alongside images and videos.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_COST } from "@/lib/plans";

const FAL_QUEUE = "https://queue.fal.run/";
const MUSIC_MODEL = "cassetteai/music-generator";
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

const inputSchema = z.object({
  prompt: z.string().trim().min(1, "Describe the music you want.").max(1000),
  genre: z.enum(GENRES).optional(),
  mood: z.enum(MOODS).optional(),
  // CassetteAI supports up to 3 minutes (180s) per generation.
  durationSeconds: z.number().int().min(5).max(180),
  // Model tier — "lite" is faster/cheaper (Stable Audio, 50 credits),
  // "pro" is the higher-quality CassetteAI generator (100 credits).
  tier: z.enum(["lite", "pro"]).optional().default("pro"),
});

// Compose the descriptive prompt Stable Audio responds to best. It benefits
// from a comma-separated list of style, mood, instrumentation and quality
// descriptors — free-form English works but this framing yields tighter,
// more musical results.
function composeMusicPrompt({
  prompt,
  genre,
  mood,
}: {
  prompt: string;
  genre?: string;
  mood?: string;
}): string {
  const parts = [prompt.trim()];
  if (genre) parts.push(`${genre} genre`);
  if (mood) parts.push(`${mood} mood`);
  parts.push("professional production", "clean mix", "high fidelity", "instrumental");
  return parts.filter(Boolean).join(", ");
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
    return "This prompt was blocked by the safety filter. Try a different description.";
  if (detail) return `Music generation failed: ${detail.slice(0, 160)}`;
  return `Music generation failed (status ${status}). Please try again.`;
}

// Submit → poll → fetch, returns the URL of the generated audio file.
async function runStableAudio(
  body: Record<string, unknown>,
  falKey: string,
): Promise<string> {
  const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };
  console.log("[music] ▶ submit", JSON.stringify(safePayload(body)));

  const submit = await fetch(`${FAL_QUEUE}${MUSIC_MODEL}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!submit.ok) {
    const txt = await submit.text();
    console.error("[music] ✖ submit failed", submit.status, txt.slice(0, 500));
    throw new Error(friendlyError(submit.status, txt));
  }
  const { request_id, status_url, response_url } = (await submit.json()) as {
    request_id: string;
    status_url: string;
    response_url: string;
  };
  console.log("[music]   queued request_id:", request_id);

  const deadline = Date.now() + 180_000; // 3 min cap
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
    if (sj.status && sj.status !== lastStatus) {
      lastStatus = sj.status;
      console.log("[music]   status:", sj.status);
    }
    if (sj.status === "COMPLETED") break;
    if (sj.status === "FAILED" || sj.status === "ERROR") {
      const body = await fetch(response_url, { headers })
        .then((r) => r.text())
        .catch(() => "");
      throw new Error(friendlyError(500, body));
    }
    delay = Math.min(delay * 1.3, 5000);
  }
  if (lastStatus !== "COMPLETED") {
    throw new Error("Music generation took too long and timed out. Please try again.");
  }

  const res = await fetch(response_url, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(friendlyError(res.status, txt));
  }
  const json = (await res.json()) as {
    audio_file?: { url?: string; content_type?: string };
    audio?: { url?: string };
  };
  const url = json.audio_file?.url ?? json.audio?.url ?? null;
  console.log("[music] ✔ done →", url ?? "none");
  if (!url) throw new Error("Music generation returned no audio. Please try again.");
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

    // Credit rule: 100 credits per generation. Admin (ADMIN_EMAIL) bypasses.
    const cost = CREDIT_COST.music;
    const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const isAdmin =
      !!adminEmail &&
      !!profile.email &&
      profile.email.toLowerCase() === adminEmail;
    if (!isAdmin && profile.credits < cost) {
      throw new Error(
        `Not enough credits. Music generation costs ${cost} credits. Buy credits or upgrade your plan.`,
      );
    }

    const falKey = process.env.FAL_API_KEY;
    if (!falKey) throw new Error("Music service unavailable.");

    const composed = composeMusicPrompt({
      prompt: data.prompt,
      genre: data.genre,
      mood: data.mood,
    });
    console.log("[music] prompt:", composed);

    let outputUrl: string;
    try {
      outputUrl = await runStableAudio(
        {
          prompt: composed,
          duration: data.durationSeconds,
        },
        falKey,
      );
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Generation failed.";
      console.error("[music] failed (no credits charged):", raw);
      throw new Error(`${raw} — Credits not charged.`);
    }

    if (!outputUrl || outputUrl.trim().length === 0) {
      throw new Error("Music generation returned no output. Credits not charged.");
    }

    // Charge credits only after a confirmed successful output. Admin bypass: no charge.
    let newCredits = profile.credits;
    if (!isAdmin) {
      const { data: deduction, error: dErr } = await supabaseAdmin.rpc("deduct_credits", {
        _amount: cost,
        _gen_type: "music",
        _user_id: userId,
      });
      if (dErr || !deduction) {
        if (dErr?.message?.includes("INSUFFICIENT_CREDITS")) {
          throw new Error(`Not enough credits. Music generation costs ${cost} credits.`);
        }
        console.error("[music] credit deduction failed:", dErr?.message);
        throw new Error(`Could not charge credits: ${dErr?.message || "unknown error"}`);
      }
      const deducted = deduction as { transaction_id: string; credits: number };
      newCredits = deducted.credits;
      console.log("[music] charged", cost, "credits → remaining", newCredits);
    } else {
      console.log("[music] admin bypass — no credits charged");
    }

    // Save to history so it shows up in /history alongside images and videos.
    const { error: histErr } = await supabase.from("generations").insert({
      user_id: userId,
      type: "music",
      prompt: composed,
      input_url: null,
      output_url: outputUrl,
      status: "success",
    });
    if (histErr) console.error("[music] history insert failed:", histErr.message);

    return {
      outputUrl,
      credits: newCredits,
      durationSeconds: data.durationSeconds,
    };
  });

export const MUSIC_GENRES = GENRES;
export const MUSIC_MOODS = MOODS;
