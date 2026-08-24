/**
 * Auto Edit — fal.ai FLUX Kontext LoRA execution (server-only).
 *
 * Model: fal-ai/flux-kontext-lora
 * Auth: FAL_API_KEY only.
 * ONE image_url + Gemini final_edit_prompt.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getWatermarkMode } from "@/lib/policy";
import {
  AUTO_EDIT_FAL_MODEL,
  AUTO_EDIT_VISION_LLM,
  AUTO_EDIT_WATERMARK_POSITION,
  autoEditCreditCost,
  autoEditTargetMegapixels,
  type AutoEditQuality,
} from "./constants";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PREPARE_FAILED =
  "Couldn't finish preparing your image. Please try again or contact support.";

function falErrorMessage(label: string, status: number, txt: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(txt) as { detail?: unknown };
    if (typeof parsed.detail === "string") detail = parsed.detail;
    else if (Array.isArray(parsed.detail))
      detail = (parsed.detail as { msg?: string }[])
        .map((d) => d?.msg)
        .filter(Boolean)
        .join("; ");
  } catch {
    detail = txt.slice(0, 200);
  }
  if (status === 429) return "AI service is rate-limited right now. Please retry in a moment.";
  if (status === 401 || status === 403)
    return "AI service authentication failed (invalid or expired API key).";
  if (/balance|locked|billing|top up|exhausted/i.test(detail))
    return "AI service is out of credits. Top up the fal.ai account balance to continue.";
  if (detail) return `${label} failed: ${detail.slice(0, 160)}`;
  return `${label} failed (status ${status}). Please try again.`;
}

/** Map quality tier → inference steps / guidance (Kontext has no explicit MP input). */
function qualityParams(quality: AutoEditQuality): {
  num_inference_steps: number;
  guidance_scale: number;
  acceleration: "none" | "regular" | "high";
} {
  switch (quality) {
    case "sd":
      return { num_inference_steps: 22, guidance_scale: 2.5, acceleration: "regular" };
    case "hd":
      return { num_inference_steps: 28, guidance_scale: 2.5, acceleration: "none" };
    case "2k":
      return { num_inference_steps: 32, guidance_scale: 2.8, acceleration: "none" };
    case "4k":
      return { num_inference_steps: 36, guidance_scale: 3.0, acceleration: "none" };
    case "8k":
      return { num_inference_steps: 40, guidance_scale: 3.2, acceleration: "none" };
    case "8k_max":
      return { num_inference_steps: 44, guidance_scale: 3.5, acceleration: "none" };
    default:
      return { num_inference_steps: 28, guidance_scale: 2.5, acceleration: "none" };
  }
}

export type KontextEditResult = {
  outputUrl: string;
  width?: number;
  height?: number;
  actualMegapixels?: number;
};

async function runKontextQueue(
  body: Record<string, unknown>,
  falKey: string,
): Promise<KontextEditResult> {
  const headers = {
    Authorization: `Key ${falKey}`,
    "Content-Type": "application/json",
  };
  const label = "FLUX Kontext LoRA";

  console.log("[auto-edit/kontext] ▶", AUTO_EDIT_FAL_MODEL, "|", {
    steps: body.num_inference_steps,
    guidance: body.guidance_scale,
    resolution_mode: body.resolution_mode,
    promptChars: typeof body.prompt === "string" ? (body.prompt as string).length : 0,
  });

  const submit = await fetch(`${FAL_QUEUE}${AUTO_EDIT_FAL_MODEL}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!submit.ok) {
    const txt = await submit.text();
    throw new Error(falErrorMessage(label, submit.status, txt));
  }

  const { status_url, response_url } = (await submit.json()) as {
    request_id: string;
    status_url: string;
    response_url: string;
  };

  const deadline = Date.now() + 290_000;
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
      throw new Error(falErrorMessage(label, 500, bodyTxt));
    }
    delay = Math.min(delay * 1.3, 5000);
  }
  if (lastStatus !== "COMPLETED") {
    throw new Error(`${label} took too long and timed out. Please try again.`);
  }

  const res = await fetch(response_url, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(falErrorMessage(label, res.status, txt));
  }
  const json = (await res.json()) as {
    images?: { url?: string; width?: number; height?: number }[];
    image?: { url?: string; width?: number; height?: number };
  };
  const img = json.images?.[0] ?? json.image;
  const url = img?.url ?? null;
  if (!url) throw new Error(`${label} returned no output. Please try again.`);
  const width = img?.width;
  const height = img?.height;
  const actualMegapixels =
    width && height && width > 0 && height > 0
      ? Math.round(((width * height) / 1_000_000) * 100) / 100
      : undefined;
  return { outputUrl: url, width, height, actualMegapixels };
}

export type RunAutoKontextEditArgs = {
  supabase: SupabaseClient;
  supabaseAdmin: SupabaseClient;
  userId: string;
  profile: { plan: string; credits: number; email?: string | null };
  isAdmin: boolean;
  editPrompt: string;
  imageUrl: string;
  quality: AutoEditQuality;
  keepWatermark?: boolean;
};

export type RunAutoKontextEditResult = {
  outputUrl: string;
  credits: number;
  creditsCharged: number;
  primaryModel: typeof AUTO_EDIT_FAL_MODEL;
  targetMegapixels: number;
  actualMegapixels?: number;
};

export async function runAutoKontextEdit(
  args: RunAutoKontextEditArgs,
): Promise<RunAutoKontextEditResult> {
  const falKey = process.env.FAL_API_KEY;
  if (!falKey) throw new Error("AI service unavailable.");

  if (!args.imageUrl.startsWith("https://")) {
    throw new Error("Image must be a secure https URL.");
  }
  if (!args.editPrompt.trim()) {
    throw new Error("Edit prompt is empty.");
  }

  const quality = args.quality;
  const cost = autoEditCreditCost(quality);
  const targetMp = autoEditTargetMegapixels(quality);
  if (!args.isAdmin && args.profile.credits < cost) {
    throw new Error(`Not enough credits. Auto Edit costs ${cost} credits.`);
  }

  const qp = qualityParams(quality);
  const body: Record<string, unknown> = {
    prompt: args.editPrompt,
    image_url: args.imageUrl,
    num_inference_steps: qp.num_inference_steps,
    guidance_scale: qp.guidance_scale,
    num_images: 1,
    enable_safety_checker: true,
    output_format: "jpeg",
    acceleration: qp.acceleration,
    resolution_mode: "match_input",
  };

  let kontext: KontextEditResult;
  try {
    kontext = await Promise.race([
      runKontextQueue(body, falKey),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Generation timed out. Please retry.")), 180_000),
      ),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${msg} — Generation failed. Credits not charged.`);
  }

  let outputUrl = kontext.outputUrl;

  const wmMode = getWatermarkMode({
    plan: args.profile.plan as "free" | "plus" | "pro" | "studio" | "business",
    email: args.profile.email,
    isAdmin: args.isAdmin,
    keepWatermark: args.keepWatermark === true,
  });
  if (wmMode !== "none") {
    try {
      const { applyServerWatermark, fetchImageBuffer } = await import("@/lib/watermark.server");
      const raw = await fetchImageBuffer(outputUrl);
      const stamped = await applyServerWatermark(raw, wmMode);
      const path = `${args.userId}/out-wm-auto-${Date.now()}.jpg`;
      const { error: upErr } = await args.supabaseAdmin.storage
        .from("uploads")
        .upload(path, stamped, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw new Error(PREPARE_FAILED);
      const { data: signed } = await args.supabaseAdmin.storage
        .from("uploads")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (!signed?.signedUrl) throw new Error(PREPARE_FAILED);
      outputUrl = signed.signedUrl;
    } catch (e) {
      console.error("[auto-edit/kontext] stamp failed (no credits charged):", e);
      if (e instanceof Error && e.message === PREPARE_FAILED) throw e;
      throw new Error(PREPARE_FAILED);
    }
  }

  let newCredits = args.profile.credits;
  let creditsCharged = 0;
  if (!args.isAdmin) {
    const { data: deduction, error: dErr } = await args.supabaseAdmin.rpc("deduct_credits", {
      _amount: cost,
      _gen_type: "image",
      _user_id: args.userId,
    });
    if (dErr || !deduction) {
      if (dErr?.message?.includes("INSUFFICIENT_CREDITS")) {
        throw new Error(`Not enough credits. Auto Edit costs ${cost} credits.`);
      }
      throw new Error(`Could not charge credits: ${dErr?.message || "unknown error"}`);
    }
    newCredits = (deduction as { credits: number }).credits;
    creditsCharged = cost;
    console.log("[auto-edit/kontext] charged", cost, "credits → remaining", newCredits);

    // Free-plan one-time counter
    if (args.profile.plan === "free") {
      await args.supabaseAdmin
        .from("profiles")
        .update({
          auto_edit_used_count: 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", args.userId)
        .eq("plan", "free");
    }
  }

  // Persist with admin client so RLS cannot silently drop History rows.
  const { error: histErr } = await args.supabaseAdmin.from("generations").insert({
    user_id: args.userId,
    type: "image",
    prompt: "Maluto AI Auto Edit",
    input_url: args.imageUrl.startsWith("https://") ? args.imageUrl : "uploaded",
    output_url: outputUrl,
    status: "success",
    metadata: {
      experience: "auto-edit",
      source: "standalone_auto",
      analysis_model: AUTO_EDIT_VISION_LLM,
      analysis_provider: "fal.ai",
      primary_model: AUTO_EDIT_FAL_MODEL,
      quality,
      target_megapixels: targetMp,
      actual_megapixels: kontext.actualMegapixels ?? null,
      credits_charged: creditsCharged,
      watermark_position: AUTO_EDIT_WATERMARK_POSITION,
      single_image: true,
      analysis_completed: true,
      edit_completed: true,
    },
  });
  if (histErr) console.error("[auto-edit/kontext] history insert failed:", histErr.message);

  return {
    outputUrl,
    credits: newCredits,
    creditsCharged,
    primaryModel: AUTO_EDIT_FAL_MODEL,
    targetMegapixels: targetMp,
    actualMegapixels: kontext.actualMegapixels,
  };
}
