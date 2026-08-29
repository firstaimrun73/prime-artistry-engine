import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_COST, type PlanId } from "@/lib/plans";
import { maxVideoDurationForPlan, videoCreditCost } from "@/lib/video-options";
import { getVideoModel, applyVideoStyle, estimateModelCredits, is4kDurationLocked, MAX_4K_DURATION_SEC } from "@/lib/video-model-registry";
import { buildVideoFromRegistry } from "@/lib/video-fal-step";
import {
  imageUpscaleFactor,
  videoResolutionMultiplier,
  videoResolutionUpscales,
} from "@/lib/quality-options";
import { computeImageExperienceCredits } from "@/lib/studio/image/image-experience-credits";
import { isAdminClaims } from "@/lib/admin-guard.server";
import {
  executeStandardImage,
  quoteStandardCredits,
  validateStandardImageRequest,
} from "@/lib/studio/image/standard";
 import {
  isPremiumMultiGptCandidate,
  planPremiumMultiGptImage2,
} from "@/lib/studio/image/premium/multi-image";
import {
  isPremiumSingleCandidate,
  executePremiumImage,
  validatePremiumImageRequest,
  quotePremiumCredits,
} from "@/lib/studio/image/premium";
import {
  isUltraCandidate,
  executeUltraImage,
  validateUltraImageRequest,
  quoteUltraCredits,
} from "@/lib/studio/image/ultra";
import {
  buildFalRequest,
  buildImageEdit,
  buildImageEnhancementPipeline,
  buildImageInpaint,
  buildVideoEnhancement,
  buildImageUpscale,
  buildTextToVideo,
  buildImageToVideo,
  type FalStep,
} from "@/lib/fal-request";
import {
  understandIntent,
  isPureEnhanceIntent,
  buildFinalEditPrompt,
  expandPromptDeterministic,
  getIntentSettings,
  type EditorIntent,
} from "@/lib/image-edit/prompt-engine";
import { composeTaggedPrompt } from "@/lib/studio/image/tag-semantic-registry";
import { assertCircleAddAllowed, resolveCircleCharge } from "@/lib/circle-edit/server-charge";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DETERMINISTIC_INTENTS: ReadonlySet<EditorIntent> = new Set([
  "outfit_transfer", "outfit_single", "color", "remove_people", "object_remove",
  "add_subject", "restore", "colorize", "face_fix", "background", "small_add",
]);

const PREPARE_FAILED =
  "Couldn't finish preparing your image. Please try again or contact support.";

function falErrorMessage(label: string, status: number, txt: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(txt) as { detail?: unknown };
    if (typeof parsed.detail === "string") detail = parsed.detail;
    else if (Array.isArray(parsed.detail))
      detail = (parsed.detail as { msg?: string }[]).map((d) => d?.msg).filter(Boolean).join("; ");
  } catch { detail = txt.slice(0, 200); }
  if (status === 429) return "AI service is rate-limited right now. Please retry in a moment.";
  if (status === 401 || status === 403) return "AI service authentication failed (invalid or expired API key).";
  if (/balance|locked|billing|top up|exhausted/i.test(detail)) return "AI service is out of credits. Top up the fal.ai account balance to continue.";
  if (/file_download_error|download the file/i.test(detail)) return "The uploaded media could not be fetched by the AI. Please re-upload and try again.";
  if (/image_load_error|corrupted|supported format/i.test(detail)) return "The uploaded image is invalid or in an unsupported format. Try a JPG or PNG.";
  if (/nsfw|safety/i.test(detail)) return "The request was blocked by the safety filter. Try a different prompt or image.";
  if (detail) return `${label} failed: ${detail.slice(0, 160)}`;
  return `${label} failed (status ${status}). Please try again.`;
}

async function runFalStep(step: FalStep, falKey: string): Promise<string> {
  const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };
  console.log("[fal] ▶ submit:", step.label, "| model:", step.model);
  const submit = await fetch(`${FAL_QUEUE}${step.model}`, { method: "POST", headers, body: JSON.stringify(step.body) });
  if (!submit.ok) {
    const txt = await submit.text();
    throw new Error(falErrorMessage(step.label, submit.status, txt));
  }
  const { request_id, status_url, response_url } = (await submit.json()) as { request_id: string; status_url: string; response_url: string };
  void request_id;
  const deadline = Date.now() + 290_000;
  let delay = 1500;
  let lastStatus = "";
  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetch(status_url, { headers });
    if (!st.ok) {
      const txt = await st.text();
      throw new Error(falErrorMessage(step.label, st.status, txt));
    }
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
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(falErrorMessage(step.label, res.status, txt));
  }
  const result = (await res.json()) as {
    images?: { url?: string }[];
    image?: { url?: string };
    video?: { url?: string };
    video_url?: string;
  };
  const url =
    result.images?.[0]?.url ??
    result.image?.url ??
    result.video?.url ??
    result.video_url ??
    null;
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
    assertCircleAddAllowed({
      isAdmin,
      plan: profile.plan,
      maskImageUrl: data.maskImageUrl,
      circleInstant: data.circleInstant,
    });
    const requestedDuration = data.videoDurationSeconds ?? 5;
    const maxDuration = maxVideoDurationForPlan(profile.plan);
    const videoDuration = isAdmin ? requestedDuration : Math.min(requestedDuration, maxDuration);
    const isVideoEnhance = data.type === "video" && data.sourceKind === "video";
    const CIRCLE_INSTANT_CREDITS = 25;

    if (
      data.type === "video" &&
      is4kDurationLocked(
        videoDuration,
        (data.videoResolution as "480p" | "720p" | "1080p" | "4k") || "1080p",
      )
    ) {
      throw new Error(`4K is limited to ${MAX_4K_DURATION_SEC}s maximum.`);
    }

    if (data.type === "image") {
      const { assertImageExperienceAccess } = await import("@/lib/studio/image/image-experience-access");
      assertImageExperienceAccess(profile.plan, data.studioTier ?? "standard", isAdmin);
    }

    const modelPrompt =
      data.type === "image"
        ? composeTaggedPrompt(data.prompt, data.contextTags)
        : data.prompt;

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
        : useStandardImagePath(data.studioTier)
          ? (() => {
              const validated = validateStandardImageRequest({
                prompt: data.prompt,
                imageUrl: data.imageUrl,
                referenceImageUrls: data.referenceImageUrls,
                maskImageUrl: data.maskImageUrl,
                aspectRatio: data.aspectRatio,
                imageQuality: data.imageQuality === "hd" ? "hd" : "sd",
                strength: data.strength,
                circleInstant: data.circleInstant,
              });
              if (!validated.ok) return STANDARD_FALLBACK_COST;
              const totalImages =
                validated.mode === "multi_image_to_image"
                  ? (validated.imageUrl ? 1 : 0) + validated.referenceImageUrls.length
                  : validated.referenceImageUrls.length;
              const q = quoteStandardCredits({
                mode: validated.mode,
                referenceCount: totalImages,
                imageQuality: validated.imageQuality,
              });
              return q.credits + 0;
            })()
          : isPremiumMultiGptCandidate({
                studioTier: data.studioTier,
                imageUrl: data.imageUrl,
                referenceImageUrls: data.referenceImageUrls,
                maskImageUrl: data.maskImageUrl,
                circleInstant: data.circleInstant,
              })
            ? (() => {
                const planned = planPremiumMultiGptImage2({
                  prompt: data.prompt,
                  imageUrl: data.imageUrl,
                  referenceImageUrls: data.referenceImageUrls,
                  imageQuality: data.imageQuality,
                  aspectRatio: data.aspectRatio,
                });
                if (!planned.ok) {
                  if (planned.error === "not_multi") {
                    const refs = (data.referenceImageUrls ?? []).filter(
                      (u) => typeof u === "string" && u.startsWith("https://"),
                    );
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
                  }
                  return STANDARD_FALLBACK_COST;
                }
                return planned.credits + 0;
              })()
            : isUltraCandidate({
      studioTier: data.studioTier,
      maskImageUrl: data.maskImageUrl,
      circleInstant: data.circleInstant,
    })
  ? (() => {
      const validated = validateUltraImageRequest({
        prompt: data.prompt,
        imageUrl: data.imageUrl,
        referenceImageUrls: data.referenceImageUrls,
        imageQuality: data.imageQuality,
        aspectRatio: data.aspectRatio,
      });
      if (!validated.ok) return STANDARD_FALLBACK_COST;
      const q = quoteUltraCredits({
        mode: validated.mode,
        quality: validated.quality,
        referenceCount: validated.referenceCount,
      });
       return q.credits + 0;
    })()
  : isPremiumSingleCandidate({
      studioTier: data.studioTier,
      maskImageUrl: data.maskImageUrl,
      circleInstant: data.circleInstant,
      imageUrl: data.imageUrl,
      referenceImageUrls: data.referenceImageUrls,
    })
  ? (() => {
      const validated = validatePremiumImageRequest({
        prompt: data.prompt,
        imageUrl: data.imageUrl,
        referenceImageUrls: data.referenceImageUrls,
        imageQuality: data.imageQuality,
        aspectRatio: data.aspectRatio,
        strength: data.strength,
      });
      if (!validated.ok) return STANDARD_FALLBACK_COST;
      const q = quotePremiumCredits({
        mode: validated.mode,
        quality: validated.quality,
      });
      return q.credits + 0;
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
    } else if (
      data.type === "image" &&
      isPremiumMultiGptCandidate({
        studioTier: data.studioTier,
        imageUrl: data.imageUrl,
        referenceImageUrls: data.referenceImageUrls,
        maskImageUrl: data.maskImageUrl,
        circleInstant: data.circleInstant,
      })
    ) {
      const planned = planPremiumMultiGptImage2({
        prompt: modelPrompt,
        imageUrl: data.imageUrl,
        referenceImageUrls: data.referenceImageUrls,
        imageQuality: data.imageQuality,
        aspectRatio: data.aspectRatio,
      });
      if (!planned.ok) {
        throw new Error(planned.error === "not_multi" ? "Multiple Image requires at least 2 images." : planned.error);
      }
      if (planned.step.body.quality !== "low") {
        throw new Error("GPT Image 2 multi path must use quality low.");
      }
      outputUrl = await runFalStepResilient(
        {
          label: planned.step.label,
          model: planned.step.model,
          endpoint: `https://fal.run/${planned.step.model}`,
          body: planned.step.body as Record<string, unknown>,
          outputKind: "image",
        },
        falKey,
      );
      if (!outputUrl) throw new Error("Premium multi generation returned no image.");
      standardCharge = planned.credits + 0;
    } else if (
      data.type === "image" &&
      isPremiumSingleCandidate({
        studioTier: data.studioTier,
        maskImageUrl: data.maskImageUrl,
        circleInstant: data.circleInstant,
        imageUrl: data.imageUrl,
        referenceImageUrls: data.referenceImageUrls,
      })
    ) {
      const result = await executePremiumImage(
        {
          prompt: modelPrompt,
          imageUrl: data.imageUrl,
          referenceImageUrls: data.referenceImageUrls,
          imageQuality: data.imageQuality,
          aspectRatio: data.aspectRatio,
          strength: data.strength,
        },
        {
          falKey,
          runStep: async (step) =>
            runFalStepResilient(
              {
                label: step.label,
                model: step.model,
                endpoint: `https://fal.run/${step.model}`,
                body: step.body,
                outputKind: "image",
              },
              falKey,
            ),
        },
      );
      outputUrl = result.outputUrl;
      standardCharge = result.credits + 0;
    } else if (
      data.type === "image" &&
      isUltraCandidate({
        studioTier: data.studioTier,
        maskImageUrl: data.maskImageUrl,
        circleInstant: data.circleInstant,
      })
    ) {
      const result = await executeUltraImage(
        { prompt: modelPrompt, imageUrl: data.imageUrl, referenceImageUrls: data.referenceImageUrls, imageQuality: data.imageQuality, aspectRatio: data.aspectRatio },
        { falKey, runStep: async (step) => runFalStepResilient({ label: step.label, model: step.model, endpoint: `https://fal.run/${step.model}`, body: step.body, outputKind: "image" }, falKey) },
      );
      outputUrl = result.outputUrl;
      standardCharge = result.credits + 0;
    } else if (data.type === "image") {
      if (data.imageUrl) {
        const rawRefs = data.referenceImageUrls ?? [];
        const validRefs = rawRefs.filter((u) => u.startsWith("https://"));
        const hasRefs = validRefs.length > 0;
        const intent = understandIntent(modelPrompt, hasRefs);
        if (data.maskImageUrl) {
          const step = buildImageInpaint({ prompt: modelPrompt, imageUrl: data.imageUrl, maskUrl: data.maskImageUrl });
          outputUrl = await runFalStepResilient(step, falKey);
        } else if (intent === "pure_enhance" || isPureEnhanceIntent(data.prompt)) {
          const pipeline = buildImageEnhancementPipeline({ prompt: modelPrompt, imageUrl: data.imageUrl, strength: data.strength ?? 0.85 });
          let current = data.imageUrl;
          for (const step of pipeline) {
            step.body.image_url = current;
            current = await runFalStepResilient(step, falKey);
          }
          outputUrl = current;
        } else {
          const { enhancePrompt } = await import("@/lib/prompt-enhance.server");
          const { getPlanLimits } = await import("@/utils/planLimits");
          const maxImages = getPlanLimits(profile.plan).maxImages;
          const refs = validRefs.slice(0, Math.max(0, maxImages - 1));
          let finalPrompt: string;
          const settings = getIntentSettings(intent);
          if (DETERMINISTIC_INTENTS.has(intent)) {
            finalPrompt = buildFinalEditPrompt({ rawPrompt: modelPrompt, enhancedOrExpanded: expandPromptDeterministic(modelPrompt, intent, refs.length), intent, referenceCount: refs.length });
          } else {
            const enhancedPrompt = await enhancePrompt({ prompt: modelPrompt, isEdit: true });
            finalPrompt = buildFinalEditPrompt({ rawPrompt: modelPrompt, enhancedOrExpanded: enhancedPrompt, intent, referenceCount: refs.length });
          }
          const step = buildImageEdit({ prompt: finalPrompt, rawPrompt: modelPrompt, imageUrl: data.imageUrl, strength: data.strength, referenceImageUrls: refs.length > 0 ? refs : undefined, guidanceOverride: settings.guidance_scale });
          outputUrl = await runFalStepResilient(step, falKey);
        }
      } else {
        const { enhancePrompt } = await import("@/lib/prompt-enhance.server");
        const enhancedPrompt = await enhancePrompt({ prompt: modelPrompt, isEdit: false });
        const { aspectToImageSize } = await import("@/lib/prompt-suggestions");
        const req = buildFalRequest({ prompt: enhancedPrompt, imageSize: aspectToImageSize(data.aspectRatio) });
        outputUrl = await runFalStepResilient({ label: req.workflow, model: req.model, endpoint: req.endpoint, body: req.body, outputKind: "image" }, falKey);
      }
      if (!outputUrl) throw new Error("Generation returned no image.");
      const upFactor = imageUpscaleFactor(data.imageQuality);
      if (upFactor > 1) {
        try {
          const up = await runFalStepResilient(buildImageUpscale({ imageUrl: outputUrl, factor: upFactor }), falKey);
          if (up) outputUrl = up;
        } catch (e) { console.error("[generate] quality upscale failed:", e); }
      }
    } else {
      const { enhancePrompt } = await import("@/lib/prompt-enhance.server");
      let step: FalStep | undefined;
      const registryModel = data.videoModelId ? getVideoModel(data.videoModelId) : undefined;
      const styledPrompt = applyVideoStyle(data.prompt || "", data.videoStyleId);
      if (registryModel) {
        const enhanced = await enhancePrompt({ prompt: styledPrompt, isEdit: false });
        step = buildVideoFromRegistry({
          model: registryModel,
          prompt: enhanced,
          imageUrl: data.imageUrl,
          durationSeconds: videoDuration,
          aspectRatio: data.videoAspectRatio ?? "16:9",
          resolution: data.videoResolution,
          generateAudio: data.videoGenerateAudio === true,
        });
      } else if (data.imageUrl) {
        const enhanced = await enhancePrompt({ prompt: styledPrompt, isEdit: false });
        step = buildImageToVideo({ prompt: enhanced, imageUrl: data.imageUrl, durationSeconds: videoDuration, aspectRatio: data.videoAspectRatio ?? "16:9" });
      } else {
        const enhanced = await enhancePrompt({ prompt: styledPrompt, isEdit: false });
        step = buildTextToVideo({ prompt: enhanced, durationSeconds: videoDuration, aspectRatio: data.videoAspectRatio ?? "16:9" });
      }
      if (isVideoEnhance && data.imageUrl) {
        step = buildVideoEnhancement({ videoUrl: data.imageUrl });
      }
      if (!step) throw new Error("No video pipeline selected.");
      outputUrl = await runFalStepResilient(step, falKey);
      if (!outputUrl) throw new Error("Video generation returned no output.");
      if (data.sourceKind !== "video" && videoResolutionUpscales(data.videoResolution) && !registryModel) {
        try {
          const up = await runFalStepResilient(buildVideoEnhancement({ videoUrl: outputUrl }), falKey);
          if (up) outputUrl = up;
        } catch (e) { console.error("[generate] video upscale failed:", e); }
      }
    }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Generation failed.";
      throw new Error(`${raw} — Generation failed. Credits not charged.`);
    }
    if (!outputUrl || outputUrl.trim().length === 0) throw new Error("Generation returned no output. Credits not charged.");
    try {
      const { finalizeMediaAsset } = await import("@/lib/watermark/finalize");
      const finalized = await finalizeMediaAsset({
        sourceUrl: outputUrl,
        mediaKind: data.type === "video" ? "video" : "image",
        plan: profile.plan, email: profile.email, isAdmin,
        keepWatermark: data.keepWatermark === true, userId,
      });
      outputUrl = finalized.finalUrl;
      console.log("[generate] finalized mode=%s watermarked=%s", finalized.mode, finalized.watermarked);
    } catch (e) {
      console.error("[generate] finalization failed (no credits charged):", e);
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
    const historyInputUrl =
      typeof data.imageUrl === "string" && data.imageUrl.startsWith("https://")
        ? data.imageUrl
        : null;
    const historyMetadata =
      data.type === "video"
        ? {
            duration: data.videoDurationSeconds ?? 5,
            resolution: data.videoResolution ?? null,
            aspect_ratio: data.videoAspectRatio ?? null,
            model: data.videoModelId ?? null,
          }
        : {
            experience: data.studioTier ?? "standard",
            quality: data.imageQuality ?? "sd",
            aspect_ratio: data.aspectRatio ?? null,
            has_source_image: !!historyInputUrl,
            reference_count: data.referenceImageUrls?.length ?? 0,
            credits_charged: chargeAmount,
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
    if (historyErr) {
      console.error("[generate] history insert failed:", historyErr.message, historyErr.code);
    }
    return { outputUrl, credits: newCredits, plan: profile.plan };
  });

const STANDARD_FALLBACK_COST = 25;

const checkoutSchema = z.object({
  plan: z.enum(["free", "plus", "pro", "studio", "business"]),
  currency: z.string().min(1).max(8),
});

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
