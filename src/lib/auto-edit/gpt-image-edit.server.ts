/**
 * Auto Edit — fal.ai GPT Image 2 edit execution (server-only).
 *
 * Model: openai/gpt-image-2/edit
 * Auth: FAL_API_KEY only (no OPENAI_API_KEY, no Anthropic).
 *
 * Schema (fal docs):
 *   prompt: string (required)
 *   image_urls: string[] (required) — single photo for Auto Edit
 *   image_size: "auto" | presets
 *   quality: "low" | "medium" | "high" | "auto"
 *   num_images: 1
 *   output_format: jpeg | png | webp
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getWatermarkMode } from "@/lib/policy";
import {
  AUTO_EDIT_CREDIT_COST,
  AUTO_EDIT_FAL_MODEL,
  AUTO_EDIT_GPT_QUALITY,
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

async function runGptImageEditQueue(
  body: Record<string, unknown>,
  falKey: string,
): Promise<string> {
  const headers = {
    Authorization: `Key ${falKey}`,
    "Content-Type": "application/json",
  };
  const label = "GPT Image 2 Edit";

  console.log("[auto-edit/gpt] ▶", AUTO_EDIT_FAL_MODEL, "|", {
    quality: body.quality,
    image_size: body.image_size,
    promptChars: typeof body.prompt === "string" ? body.prompt.length : 0,
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
    images?: { url?: string }[];
    image?: { url?: string };
  };
  const url = json.images?.[0]?.url ?? json.image?.url ?? null;
  if (!url) throw new Error(`${label} returned no output. Please try again.`);
  return url;
}

export type RunAutoGptImageEditArgs = {
  supabase: SupabaseClient;
  supabaseAdmin: SupabaseClient;
  userId: string;
  profile: { plan: string; credits: number; email?: string | null };
  isAdmin: boolean;
  /** Backend-built instruction — never sent to the client */
  internalPrompt: string;
  imageUrl: string;
  keepWatermark?: boolean;
};

export type RunAutoGptImageEditResult = {
  outputUrl: string;
  credits: number;
  creditsCharged: number;
  primaryModel: typeof AUTO_EDIT_FAL_MODEL;
};

/**
 * One fal.ai GPT Image 2 edit + watermark + single credit charge.
 */
export async function runAutoGptImageEdit(
  args: RunAutoGptImageEditArgs,
): Promise<RunAutoGptImageEditResult> {
  const falKey = process.env.FAL_API_KEY;
  if (!falKey) throw new Error("AI service unavailable.");

  if (!args.imageUrl.startsWith("https://")) {
    throw new Error("Image must be a secure https URL.");
  }

  const cost = AUTO_EDIT_CREDIT_COST;
  if (!args.isAdmin && args.profile.credits < cost) {
    throw new Error(`Not enough credits. Auto Edit costs ${cost} credits.`);
  }

  const body: Record<string, unknown> = {
    prompt: args.internalPrompt,
    image_urls: [args.imageUrl],
    image_size: "auto",
    quality: AUTO_EDIT_GPT_QUALITY,
    num_images: 1,
    output_format: "jpeg",
  };

  let outputUrl: string;
  try {
    outputUrl = await Promise.race([
      runGptImageEditQueue(body, falKey),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Generation timed out. Please retry.")), 180_000),
      ),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${msg} — Generation failed. Credits not charged.`);
  }

  // Watermark before deduct
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
      console.error("[auto-edit/gpt] stamp failed (no credits charged):", e);
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
    console.log("[auto-edit/gpt] charged", cost, "credits → remaining", newCredits);
  }

  const { error: histErr } = await args.supabase.from("generations").insert({
    user_id: args.userId,
    type: "image",
    prompt: "[motio2edit-auto]",
    input_url: "uploaded",
    output_url: outputUrl,
    status: "success",
    metadata: {
      source: "standalone_auto",
      primary_model: AUTO_EDIT_FAL_MODEL,
      gpt_quality: AUTO_EDIT_GPT_QUALITY,
      credits_charged: creditsCharged,
    },
  });
  if (histErr) console.error("[auto-edit/gpt] history insert failed:", histErr.message);

  return {
    outputUrl,
    credits: newCredits,
    creditsCharged,
    primaryModel: AUTO_EDIT_FAL_MODEL,
  };
}
