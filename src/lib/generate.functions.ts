import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_COST, type PlanId } from "@/lib/plans";
import { maxVideoDurationForPlan, videoCreditCost } from "@/lib/video-options";
import { getVideoModel, applyVideoStyle, estimateModelCredits, is4kDurationLocked, MAX_4K_DURATION_SEC } from "@/lib/video-model-registry";
import { buildVideoFromRegistry } from "@/lib/video-fal-step";
import { imageUpscaleFactor, videoResolutionMultiplier, videoResolutionUpscales } from "@/lib/quality-options";
import { computeImageExperienceCredits } from "@/lib/studio/image/image-experience-credits";
import { isAdminClaims } from "@/lib/admin-guard.server";
import { executeStandardImage, quoteStandardCredits, validateStandardImageRequest } from "@/lib/studio/image/standard";
import { isPremiumMultiGptCandidate, planPremiumMultiGptImage2 } from "@/lib/studio/image/premium/multi-image";
import { isPremiumSingleCandidate, executePremiumImage, validatePremiumImageRequest, quotePremiumCredits } from "@/lib/studio/image/premium";
import { isUltraCandidate, executeUltraImage, validateUltraImageRequest, quoteUltraCredits } from "@/lib/studio/image/ultra";
import { buildFalRequest, buildImageEdit, buildImageEnhancementPipeline, buildImageInpaint, buildVideoEnhancement, buildImageUpscale, buildTextToVideo, buildImageToVideo, type FalStep } from "@/lib/fal-request";
import { understandIntent, isPureEnhanceIntent, buildFinalEditPrompt, expandPromptDeterministic, getIntentSettings, type EditorIntent } from "@/lib/image-edit/prompt-engine";
import { composeTaggedPrompt } from "@/lib/studio/image/tag-semantic-registry";
import { assertCircleAddAllowed, resolveCircleCharge } from "@/lib/circle-edit/server-charge";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DETERMINISTIC_INTENTS: ReadonlySet<EditorIntent> = new Set(["outfit_transfer", "outfit_single", "color", "remove_people", "object_remove", "add_subject", "restore", "colorize", "face_fix", "background", "small_add"]);
const PREPARE_FAILED = "Couldn't finish preparing your image. Please try again or contact support.";
const STANDARD_FALLBACK_COST = 25;

function falErrorMessage(label: string, status: number, txt: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(txt) as { detail?: unknown };
    if (typeof parsed.detail === "string") detail = parsed.detail;
    else if (Array.isArray(parsed.detail)) detail = (parsed.detail as { msg?: string }[]).map((d) => d?.msg).filter(Boolean).join("; ");
  } catch { detail = txt.slice(0, 200); }
  if (status === 429) return "AI service is rate-limited right now. Please retry in a moment.";
  if (status === 401 || status === 403) return "AI service authentication failed (invalid or expired API key).";
  if (/balance|locked|billing|top up|exhausted/i.test(detail)) return "AI service is out of credits. Top up the fal.ai account balance to continue.";
  if (detail) return `${label} failed: ${detail.slice(0, 160)}`;
  return `${label} failed (status ${status}). Please try again.`;
}

async function runFalStep(step: FalStep, falKey: string): Promise<string> {
  const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };
  console.log("[fal] submit:", step.label, step.model);
  const submit = await fetch(`${FAL_QUEUE}${step.model}`, { method: "POST", headers, body: JSON.stringify(step.body) });
  if (!submit.ok) throw new Error(falErrorMessage(step.label, submit.status, await submit.text()));
  const { status_url, response_url } = (await submit.json()) as { status_url: string; response_url: string };
  const deadline = Date.now() + 290_000;
  let delay = 1500;
  let lastStatus = "";
  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetch(status_url, { headers });
    if (!st.ok) throw new Error(falErrorMessage(step.label, st.status, await st.text()));
    const body = (await st.json()) as { status?: string };
    lastStatus = body.status ?? "";
    if (lastStatus === "COMPLETED") break;
    if (lastStatus === "FAILED" || lastStatus === "ERROR") {
      const bodyTxt = await fetch(response_url, { headers }).then((r) => r.text()).catch(() => "");
      throw new Error(falErrorMessage(step.label, 500, bodyTxt || lastStatus));
    }
    delay = Math.min(delay + 500, 5000);
  }
  if (lastStatus !== "COMPLETED") throw new Error(`${step.label} timed out. Please retry.`);
  const res = await fetch(response_url, { headers });
  if (!res.ok) throw new Error(falErrorMessage(step.label, res.status, await res.text()));
  const result = (await res.json()) as { images?: { url?: string }[]; image?: { url?: string }; video?: { url?: string }; video_url?: string };
  const url = result.images?.[0]?.url ?? result.image?.url ?? result.video?.url ?? result.video_url ?? null;
  if (!url || typeof url !== "string") throw new Error(`${step.label} returned no media URL.`);
  return url;
}

async function runFalStepResilient(step: FalStep, falKey: string, opts: { timeoutMs?: number; maxRetries?: number } = {}): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? (step.outputKind === "video" ? 300_000 : 120_000);
  const maxRetries = opts.maxRetries ?? 2;
  let attempt = 0;
  let lastErr: unknown;
  while (attempt <= maxRetries) {
    try {
      const url = await Promise.race([
        runFalStep(step, falKey),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Generation timed out. Please retry.")), timeoutMs)),
      ]);
      if (url && url.trim().length > 0) return url;
      throw new Error("No output received");
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (/timed out|rate-limited|429|503|502|network|fetch failed/i.test(msg) && attempt < maxRetries) {
        attempt += 1;
        await sleep(1500 * attempt);
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

const inputSchema = z.object({
  type: z.enum(["image", "video"]),
  prompt: z.string().min(1).max(10_000),
  imageUrl: z.string().min(1).max(15_000_000).optional(),
  maskImageUrl: z.string().min(1).max(15_000_000).optional(),
  referenceImageUrls: z.array(z.string().min(1).max(15_000_000)).max(9).optional(),
  strength: z.number().min(0).max(1).optional(),
  aspectRatio: z.string().optional(),
  imageQuality: z.string().optional(),
  videoDurationSeconds: z.number().int().min(1).max(60).optional(),
  videoResolution: z.string().optional(),
  videoAspectRatio: z.string().optional(),
  videoModelId: z.string().optional(),
  videoStyleId: z.string().optional(),
  videoGenerateAudio: z.boolean().optional(),
  sourceKind: z.enum(["image", "video"]).optional(),
  keepWatermark: z.boolean().optional(),
  studioTier: z.enum(["standard", "pro", "premium"]).optional(),
  circleInstant: z.boolean().optional(),
  circlePrepCredits: z.number().int().min(0).max(100).optional(),
  circleAssetId: z.string().max(80).optional(),
  sourceWidth: z.number().int().min(1).max(30000).optional(),
  sourceHeight: z.number().int().min(1).max(30000).optional(),
  contextTags: z.array(z.string().max(40)).max(10).optional(),
});

function useStandardImagePath(studioTier: "standard" | "pro" | "premium" | undefined): boolean {
  return studioTier === "standard" || studioTier === undefined;
}

export const generateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: pErr } = await supabase.from("profiles").select("plan, credits, email").eq("id", userId).single();
    if (pErr || !profile) throw new Error("Could not load your account.");
    const isAdmin = isAdminClaims({ email: profile.email ?? undefined });
    if (!isAdmin && data.type === "video" && profile.plan === "free") throw new Error("Video generation requires a paid plan.");
    assertCircleAddAllowed({ isAdmin, plan: profile.plan, maskImageUrl: data.maskImageUrl, circleInstant: data.circleInstant });
    const requestedDuration = data.videoDurationSeconds ?? 5;
    const maxDuration = maxVideoDurationForPlan(profile.plan);
    const videoDuration = isAdmin ? requestedDuration : Math.min(requestedDuration, maxDuration);
    const isVideoEnhance = data.type === "video" && data.sourceKind === "video";
    const CIRCLE_INSTANT_CREDITS = 25;

    if (data.type === "video" && is4kDurationLocked(videoDuration, (data.videoResolution as "480p" | "720p" | "1080p" | "4k") || "1080p")) {
      throw new Error(`4K is limited to ${MAX_4K_DURATION_SEC}s maximum.`);
    }
    if (data.type === "image") {
      const { assertImageExperienceAccess } = await import("@/lib/studio/image/image-experience-access");
      assertImageExperienceAccess(profile.plan, data.studioTier ?? "standard", isAdmin);
    }

    // Circle Add ONLY: server resolves backendPrompt from catalog assetId (authoritative).
    // Remove (circleInstant true) and all other paths: unchanged composeTaggedPrompt path.
    let modelPrompt: string;
    if (data.type === "image" && data.circleInstant === false) {
      const { resolveCircleAddPrompt } = await import("@/lib/circle-edit/resolve-circle-add-prompt");
      const resolved = resolveCircleAddPrompt({ circleAssetId: data.circleAssetId, clientPrompt: data.prompt });
      modelPrompt = resolved.prompt;
      if (process.env.NODE_ENV !== "production") {
        console.log("[CIRCLE ADD] serverPromptResolved", {
          assetId: resolved.assetId,
          assetName: resolved.assetName,
          creditCost: resolved.creditCost,
          promptLen: resolved.prompt.length,
          promptHead: resolved.prompt.slice(0, 120),
        });
      }
    } else {
      modelPrompt = data.type === "image" ? composeTaggedPrompt(data.prompt, data.contextTags) : data.prompt;
    }

    let cost = isVideoEnhance
      ? CREDIT_COST.video_enhance
      : data.type === "video"
        ? (() => {
            const m = data.videoModelId ? getVideoModel(data.videoModelId) : undefined;
            if (m) {
              return estimateModelCredits({
                model: m,
                durationSec: videoDuration,
                resolution: (data.videoResolution as "480p" | "720p" | "1080p" | "4k") || m.resolutions[0],
                soundOn: data.videoGenerateAudio === true && m.nativeAudio,
                mode: data.sourceKind === "video" ? "video" : data.imageUrl ? "image" : "text",
              });
            }
            return Math.round(videoCreditCost(videoDuration as 5 | 10 | 15 | 20 | 25 | 30) * videoResolutionMultiplier(data.videoResolution));
          })()
        : (() => {
            const refs = (data.referenceImageUrls ?? []).filter((u) => typeof u === "string" && u.startsWith("https://"));
            const credit = computeImageExperienceCredits({
              studioTier: data.studioTier,
              hasSourceImage: !!data.imageUrl,
              referenceCount: refs.length,
              imageQuality: data.imageQuality,
              plan: profile.plan,
              isAdmin,
              circleInstant: !!(data.circleInstant && data.maskImageUrl),
              circleInstantCredits: CIRCLE_INSTANT_CREDITS,
            });
            return credit.credits + 0;
          })();

    {
      const circleCharge = resolveCircleCharge({
        circleInstant: data.circleInstant,
        maskImageUrl: data.maskImageUrl,
        circleAssetId: data.circleAssetId,
        sourceWidth: data.sourceWidth,
        sourceHeight: data.sourceHeight,
      });
      if (circleCharge != null) cost = circleCharge;
    }
    if (!isAdmin && profile.credits < cost) {
      throw new Error(`Not enough credits. ${data.type === "video" ? "Video" : "Image"} generation costs ${cost} credits.`);
    }
    const falKey = process.env.FAL_API_KEY;
    if (!falKey) throw new Error("AI service unavailable.");
    let outputUrl: string | null = null;
    let standardCharge: number | null = null;

    try {
      if (data.type === "image" && useStandardImagePath(data.studioTier)) {
        // Standard path includes circle_to_remove and circle_to_add via validation router
        const result = await executeStandardImage(
          {
            prompt: modelPrompt,
            imageUrl: data.imageUrl,
            referenceImageUrls: data.referenceImageUrls,
            maskImageUrl: data.maskImageUrl,
            aspectRatio: data.aspectRatio,
            imageQuality: data.imageQuality === "hd" ? "hd" : "sd",
            strength: data.strength,
            circleInstant: data.circleInstant,
          },
          { falKey },
        );
        outputUrl = result.outputUrl;
        standardCharge = result.credits + 0;
      } else if (data.type === "image" && data.imageUrl && data.maskImageUrl) {
        const step = buildImageInpaint({ prompt: modelPrompt, imageUrl: data.imageUrl, maskUrl: data.maskImageUrl });
        outputUrl = await runFalStepResilient(step, falKey);
      } else if (data.type === "image" && data.imageUrl) {
        const step = buildImageEdit({ prompt: modelPrompt, rawPrompt: data.prompt, imageUrl: data.imageUrl, strength: data.strength });
        outputUrl = await runFalStepResilient(step, falKey);
      } else if (data.type === "image") {
        const { aspectToImageSize } = await import("@/lib/prompt-suggestions");
        const req = buildFalRequest({ prompt: modelPrompt, imageSize: aspectToImageSize(data.aspectRatio) });
        outputUrl = await runFalStepResilient({ label: req.workflow, model: req.model, endpoint: req.endpoint, body: req.body, outputKind: "image" }, falKey);
      } else if (data.type === "video") {
        const registryModel = data.videoModelId ? getVideoModel(data.videoModelId) : undefined;
        const styledPrompt = applyVideoStyle(data.prompt || "", data.videoStyleId);
        let step: FalStep | undefined;
        if (registryModel) {
          step = buildVideoFromRegistry({
            model: registryModel,
            prompt: styledPrompt,
            imageUrl: data.imageUrl,
            durationSeconds: videoDuration,
            aspectRatio: data.videoAspectRatio ?? "16:9",
            resolution: data.videoResolution,
            generateAudio: data.videoGenerateAudio === true,
          });
        } else if (data.imageUrl) {
          step = buildImageToVideo({ prompt: styledPrompt, imageUrl: data.imageUrl, durationSeconds: videoDuration, aspectRatio: data.videoAspectRatio ?? "16:9" });
        } else {
          step = buildTextToVideo({ prompt: styledPrompt, durationSeconds: videoDuration, aspectRatio: data.videoAspectRatio ?? "16:9" });
        }
        if (isVideoEnhance && data.imageUrl) step = buildVideoEnhancement({ videoUrl: data.imageUrl });
        if (!step) throw new Error("No video pipeline selected.");
        outputUrl = await runFalStepResilient(step, falKey);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Generation failed.";
      throw new Error(`${raw} — Generation failed. Credits not charged.`);
    }
    if (!outputUrl || outputUrl.trim().length === 0) throw new Error("Generation returned no output. Credits not charged.");
    if (data.imageUrl && outputUrl === data.imageUrl) {
      throw new Error("Generation returned the original image. Credits not charged.");
    }

    try {
      const { finalizeMediaAsset } = await import("@/lib/watermark/finalize");
      const finalized = await finalizeMediaAsset({
        sourceUrl: outputUrl,
        mediaKind: data.type === "video" ? "video" : "image",
        plan: profile.plan,
        email: profile.email,
        isAdmin,
        keepWatermark: data.keepWatermark === true,
        userId,
      });
      outputUrl = finalized.finalUrl;
    } catch (e) {
      console.error("[generate] finalization failed:", e);
      throw new Error(PREPARE_FAILED);
    }

    let chargeAmount = standardCharge ?? cost;
    {
      const circleFinal = resolveCircleCharge({
        circleInstant: data.circleInstant,
        maskImageUrl: data.maskImageUrl,
        circleAssetId: data.circleAssetId,
        sourceWidth: data.sourceWidth,
        sourceHeight: data.sourceHeight,
      });
      if (circleFinal != null) chargeAmount = circleFinal;
    }
    if (!isAdmin && chargeAmount > profile.credits) {
      throw new Error(`Not enough credits. Image generation costs ${chargeAmount} credits.`);
    }

    let newCredits = profile.credits;
    if (!isAdmin) {
      const { data: deduction, error: dErr } = await supabaseAdmin.rpc("deduct_credits", { _amount: chargeAmount, _gen_type: data.type, _user_id: userId });
      if (dErr || !deduction) {
        if (dErr?.message?.includes("INSUFFICIENT_CREDITS")) {
          throw new Error(`Not enough credits. ${data.type === "video" ? "Video" : "Image"} generation costs ${chargeAmount} credits.`);
        }
        throw new Error(`Could not charge credits: ${dErr?.message || "unknown error"}`);
      }
      newCredits = (deduction as { credits: number }).credits;
    }

    const historyInputUrl = typeof data.imageUrl === "string" && data.imageUrl.startsWith("https://") ? data.imageUrl : null;
    const historyMetadata =
      data.type === "video"
        ? { duration: data.videoDurationSeconds ?? 5, resolution: data.videoResolution ?? null, aspect_ratio: data.videoAspectRatio ?? null, model: data.videoModelId ?? null }
        : {
            experience: data.studioTier ?? "standard",
            quality: data.imageQuality ?? "sd",
            aspect_ratio: data.aspectRatio ?? null,
            has_source_image: !!historyInputUrl,
            reference_count: data.referenceImageUrls?.length ?? 0,
            credits_charged: chargeAmount,
            ...(data.maskImageUrl
              ? {
                  circle_operation: data.circleInstant === true ? "remove" : data.circleInstant === false ? "add" : "mask",
                  circle_asset_id: data.circleAssetId ?? null,
                  circle_source_width: data.sourceWidth ?? null,
                  circle_source_height: data.sourceHeight ?? null,
                }
              : {}),
          };

    const { error: historyErr } = await supabase.from("generations").insert({
      user_id: userId,
      type: data.type,
      prompt: data.prompt,
      input_url: historyInputUrl,
      output_url: outputUrl,
      status: "success",
      metadata: historyMetadata,
    });
    if (historyErr) console.error("[generate] history insert failed:", historyErr.message);
    return { outputUrl, credits: newCredits, plan: profile.plan };
  });

const checkoutSchema = z.object({ plan: z.enum(["free", "plus", "pro", "studio", "business"]), currency: z.string().min(1).max(8) });

export const completeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.plan !== "free") throw new Error("Paid plans must be purchased through the secure payment checkout.");
    const { error } = await supabase.from("profiles").update({ plan: "free", currency: data.currency, updated_at: new Date().toISOString() }).eq("id", userId);
    if (error) throw new Error("Could not update your plan.");
    return { ok: true, plan: "free" as PlanId, credits: 0 };
  });
