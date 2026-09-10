/**
 * Auto Edit — fal.ai FLUX Kontext LoRA execution (server-only).
 *
 * Model: fal-ai/flux-kontext-lora
 * Auth: FAL_API_KEY only.
 * ONE image_url + Gemini final_edit_prompt.
 *
 * Billing: shared @/lib/billing lifecycle (quote → reserve → generate → finalize/release).
 * Legacy credit amounts used as bridge until final economics review.
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
import { quoteForProduct, runWithBillingLifecycle } from "@/lib/billing";

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

type KontextEditResult = {
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
  const submit = await fetch(`${FAL_QUEUE}${AUTO_EDIT_FAL_MODEL}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!submit.ok) {
    throw new Error(falErrorMessage("Auto Edit", submit.status, await submit.text()));
  }
  const { status_url, response_url } = (await submit.json()) as {
    status_url: string;
    response_url: string;
  };
  const deadline = Date.now() + 170_000;
  let delay = 1200;
  let lastStatus = "";
  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetch(status_url, { headers });
    if (!st.ok) throw new Error(falErrorMessage("Auto Edit", st.status, await st.text()));
    const bodySt = (await st.json()) as { status?: string };
    lastStatus = bodySt.status ?? "";
    if (lastStatus === "COMPLETED") break;
    if (lastStatus === "FAILED" || lastStatus === "ERROR") {
      const bodyTxt = await fetch(response_url, { headers }).then((r) => r.text()).catch(() => "");
      throw new Error(falErrorMessage("Auto Edit", 500, bodyTxt || lastStatus));
    }
    delay = Math.min(delay + 400, 4000);
  }
  if (lastStatus !== "COMPLETED") throw new Error("Auto Edit timed out. Please retry.");
  const res = await fetch(response_url, { headers });
  if (!res.ok) throw new Error(falErrorMessage("Auto Edit", res.status, await res.text()));
  const result = (await res.json()) as {
    images?: { url?: string; width?: number; height?: number }[];
    image?: { url?: string; width?: number; height?: number };
  };
  const img = result.images?.[0] ?? result.image;
  const url = img?.url;
  if (!url || typeof url !== "string") throw new Error("Auto Edit returned no image URL.");
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

  // Server quote via shared lifecycle. Legacy customer credits bridge until final economics.
  // providerCogsUsd: 0 until Auto Edit has a dedicated provider-cost estimator (internal only).
  const quote = quoteForProduct({
    userId: args.userId,
    product: "auto_edit",
    operation: "kontext_edit",
    provider: "fal",
    modelId: AUTO_EDIT_FAL_MODEL,
    endpoint: AUTO_EDIT_FAL_MODEL,
    providerCogsUsd: 0,
    legacyCustomerCredits: cost,
    idempotencyKey: `auto_edit:${args.userId}:${quality}:${args.imageUrl.slice(-48)}:${args.editPrompt.slice(0, 64)}`,
    resolution: quality,
    metadata: { quality, targetMegapixels: targetMp },
  });

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
  let creditsChargedFromLifecycle = 0;
  try {
    const billed = await runWithBillingLifecycle({
      admin: args.supabaseAdmin,
      quote,
      availableCredits: args.profile.credits,
      isAdmin: args.isAdmin,
      execute: async () => {
        return Promise.race([
          runKontextQueue(body, falKey),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Generation timed out. Please retry.")), 180_000),
          ),
        ]);
      },
    });
    kontext = billed.result;
    creditsChargedFromLifecycle = billed.creditsCharged;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("INSUFFICIENT_CREDITS") ||
      (err as { details?: { code?: string } })?.details?.code === "INSUFFICIENT_CREDITS"
    ) {
      throw new Error(
        `INSUFFICIENT_CREDITS: need ${cost} Motio2edit credits (you have ${args.profile.credits}). Generation not started.`,
      );
    }
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
      const { stampImageWatermark } = await import("@/lib/watermark/image");
      outputUrl = await stampImageWatermark({
        sourceUrl: outputUrl,
        mode: wmMode,
        position: AUTO_EDIT_WATERMARK_POSITION,
      });
    } catch (e) {
      console.error("[auto-edit/kontext] stamp failed (no credits charged):", e);
      if (e instanceof Error && e.message === PREPARE_FAILED) throw e;
      throw new Error(PREPARE_FAILED);
    }
  }

  // Credits already reserved+finalized by runWithBillingLifecycle (or 0 for admin).
  let creditsCharged = creditsChargedFromLifecycle;
  let newCredits = args.profile.credits;
  if (!args.isAdmin && creditsCharged > 0) {
    const { data: bal } = await args.supabase.from("profiles").select("credits").eq("id", args.userId).single();
    newCredits = bal?.credits ?? Math.max(0, args.profile.credits - creditsCharged);
    console.log("[auto-edit/kontext] lifecycle charged", creditsCharged, "credits → remaining", newCredits);
  }

  const historyBase = {
    user_id: args.userId,
    type: "image" as const,
    prompt: "Maluto AI Auto Edit",
    input_url: args.imageUrl.startsWith("https://") ? args.imageUrl : null,
    output_url: outputUrl,
    status: "success" as const,
  };
  const historyMeta = {
    experience: "auto-edit",
    source: "standalone_auto",
    operation: "auto_edit",
    analysis_model: AUTO_EDIT_VISION_LLM,
    analysis_provider: "fal.ai",
    primary_model: AUTO_EDIT_FAL_MODEL,
    quality,
    target_megapixels: targetMp,
    actual_megapixels: kontext.actualMegapixels ?? null,
    credits_charged: creditsCharged,
    credits_used: creditsCharged,
    watermark_position: AUTO_EDIT_WATERMARK_POSITION,
    single_image: true,
    analysis_completed: true,
    edit_completed: true,
  };
  let histErr = (
    await args.supabaseAdmin.from("generations").insert({ ...historyBase, metadata: historyMeta })
  ).error;
  if (histErr && /metadata|column|schema/i.test(histErr.message + (histErr.details ?? ""))) {
    console.warn("[auto-edit/kontext] metadata column missing — retrying without metadata");
    histErr = (await args.supabaseAdmin.from("generations").insert(historyBase)).error;
  }
  if (histErr) {
    console.error(
      "[auto-edit/kontext] history insert failed:",
      histErr.message,
      histErr.code,
      histErr.details,
      histErr.hint,
    );
  } else {
    console.log("[auto-edit/kontext] history saved for user", args.userId);
  }

  return {
    outputUrl,
    credits: newCredits,
    creditsCharged,
    primaryModel: AUTO_EDIT_FAL_MODEL,
    targetMegapixels: targetMp,
    actualMegapixels: kontext.actualMegapixels,
  };
}
