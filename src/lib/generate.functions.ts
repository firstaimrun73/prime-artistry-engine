import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_COST, type PlanId } from "@/lib/plans";
import { maxVideoDurationForPlan, videoCreditCost } from "@/lib/video-options";
import { getVideoModel, applyVideoStyle, estimateModelCredits } from "@/lib/video-model-registry";
import { buildVideoFromRegistry } from "@/lib/video-fal-step";
import {
  imageUpscaleFactor,
  videoResolutionMultiplier,
  videoResolutionUpscales,
} from "@/lib/quality-options";
import { computeImageExperienceCredits } from "@/lib/studio/image/image-experience-credits";
import {
  executeStandardImage,
  quoteStandardCredits,
  validateStandardImageRequest,
} from "@/lib/studio/image/standard";
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
    if (!st.ok) { delay = Math.min(delay * 1.3, 5000); continue; }
    const sj = (await st.json()) as { status?: string };
    if (sj.status && sj.status !== lastStatus) lastStatus = sj.status;
    if (sj.status === "COMPLETED") break;
    if (sj.status === "FAILED" || sj.status === "ERROR") {
      const body = await fetch(response_url, { headers }).then((r) => r.text()).catch(() => "");
      throw new Error(falErrorMessage(step.label, 500, body));
    }
    delay = Math.min(delay * 1.3, 5000);
  }
  if (lastStatus !== "COMPLETED") throw new Error(`${step.label} took too long and timed out. Please try again.`);
  const res = await fetch(response_url, { headers });
  if (!res.ok) throw new Error(falErrorMessage(step.label, res.status, await res.text()));
  const json = (await res.json()) as { image?: { url?: string }; images?: { url?: string }[]; video?: { url?: string } };
  const url = json.image?.url ?? json.images?.[0]?.url ?? json.video?.url ?? null;
  if (!url) throw new Error(`${step.label} returned no output. Please try again.`);
  return url;
}

function isPermanentError(msg: string): boolean {
  return /authentication|out of credits|safety filter|unsupported format|invalid or in an unsupported|Not enough credits/i.test(msg || "");
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
      if (isPermanentError(msg)) throw err;
      attempt++;
      if (attempt > maxRetries) break;
      await sleep(2000 * attempt);
    }
  }
  throw new Error(`${lastErr instanceof Error ? lastErr.message : "Generation failed."} (failed after ${maxRetries + 1} attempts)`);
}

const inputSchema = z.object({
  prompt: z.string().min(1).max(2000),
  type: z.enum(["image", "video"]),
  imageUrl: z.string().min(1).max(15_000_000).optional(),
  sourceKind: z.enum(["image", "video"]).optional(),
  strength: z.number().min(0.1).max(1).optional(),
  referenceImageUrls: z.array(z.string().min(1).max(15_000_000)).max(9).optional(),
  maskImageUrl: z.string().min(1).max(15_000_000).optional(),
  aspectRatio: z.enum(["1:1", "4:3", "16:9", "9:16", "3:4"]).optional(),
  videoDurationSeconds: z.number().int().min(1).max(30).optional(),
  videoModelId: z.string().optional(),
  videoGenerateAudio: z.boolean().optional(),
  videoNegativePrompt: z.string().max(500).optional(),
  videoStyleId: z.string().optional(),
  videoAspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3"]).optional(),
  imageQuality: z.enum(["sd", "hd", "2k", "4k", "8k"]).optional(),
  videoResolution: z.enum(["480p", "720p", "1080p", "4k"]).optional(),
  videoMode: z.enum(["transform", "enhance"]).optional(),
  keepWatermark: z.boolean().optional(),
  /** Image Studio Experience (internal id). Server validates via Zod enum. */
  studioTier: z.enum(["standard", "pro", "premium"]).optional(),
  circleInstant: z.boolean().optional(),
  circlePrepCredits: z.number().int().min(0).max(100).optional(),
});

/** Standard path when tier is standard or omitted (base experience). Pro/Premium keep legacy pipelines. */
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
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = !!adminEmail && !!profile.email && profile.email.toLowerCase() === adminEmail.toLowerCase();
    if (!isAdmin && data.type === "video" && profile.plan === "free") throw new Error("Video generation requires a paid plan.");
    const requestedDuration = data.videoDurationSeconds ?? 5;
    const maxDuration = maxVideoDurationForPlan(profile.plan);
    const videoDuration = isAdmin ? requestedDuration : Math.min(requestedDuration, maxDuration);
    const isVideoEnhance = data.type === "video" && data.sourceKind === "video";
    const CIRCLE_INSTANT_CREDITS = 25;

    const cost = isVideoEnhance
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
              if (!validated.ok) {
                // Allow pre-check message; actual throw happens at execute
                return STANDARD_FALLBACK_COST;
              }
              const q = quoteStandardCredits({
                mode: validated.mode,
                referenceCount: validated.referenceImageUrls.length,
                imageQuality: validated.imageQuality,
              });
              return q.credits + (data.circlePrepCredits ?? 0);
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
              return credit.credits + (data.circlePrepCredits ?? 0);
            })();

    if (!isAdmin && profile.credits < cost) {
      throw new Error(`Not enough credits. ${data.type === "video" ? "Video" : "Image"} generation costs ${cost} credits.`);
    }
    const falKey = process.env.FAL_API_KEY;
    if (!falKey) throw new Error("AI service unavailable.");
    let outputUrl: string | null = null;
    /** Actual charge after Standard success (may refine vs pre-check). */
    let standardCharge: number | null = null;

    try {
    if (data.type === "image" && useStandardImagePath(data.studioTier)) {
      // ——— STANDARD IMAGE STUDIO (locked models / credits) ———
      const result = await executeStandardImage(
        {
          prompt: data.prompt,
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
      standardCharge = result.credits + (data.circlePrepCredits ?? 0);
    } else if (data.type === "image") {
      // ——— Pro / Premium (existing pipelines; unchanged) ———
      if (data.imageUrl) {
        const rawRefs = data.referenceImageUrls ?? [];
        const validRefs = rawRefs.filter((u) => u.startsWith("https://"));
        const hasRefs = validRefs.length > 0;
        const intent = understandIntent(data.prompt, hasRefs);
        if (data.maskImageUrl) {
          const step = buildImageInpaint({ prompt: data.prompt, imageUrl: data.imageUrl, maskUrl: data.maskImageUrl });
          outputUrl = await runFalStepResilient(step, falKey);
        } else if (intent === "pure_enhance" || isPureEnhanceIntent(data.prompt)) {
          const pipeline = buildImageEnhancementPipeline({ prompt: data.prompt, imageUrl: data.imageUrl, strength: data.strength ?? 0.85 });
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
          if (DETERMINISTIC_INTENTS.has(intent)) {
            finalPrompt = buildFinalEditPrompt({ rawPrompt: data.prompt, enhancedOrExpanded: expandPromptDeterministic(data.prompt, intent, refs.length), intent, referenceCount: refs.length });
          } else {
            const enhancedPrompt = await enhancePrompt({ prompt: data.prompt, isEdit: true });
            finalPrompt = buildFinalEditPrompt({ rawPrompt: data.prompt, enhancedOrExpanded: enhancedPrompt, intent, referenceCount: refs.length });
          }
          const settings = getIntentSettings(intent);
          const step = buildImageEdit({ prompt: finalPrompt, rawPrompt: data.prompt, imageUrl: data.imageUrl, strength: data.strength, referenceImageUrls: refs.length > 0 ? refs : undefined, guidanceOverride: settings.guidance_scale });
          outputUrl = await runFalStepResilient(step, falKey);
        }
      } else {
        const { enhancePrompt } = await import("@/lib/prompt-enhance.server");
        const enhancedPrompt = await enhancePrompt({ prompt: data.prompt, isEdit: false });
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
        if (videoDuration > registryModel.maxDuration) {
          throw new Error(`Duration ${videoDuration}s exceeds ${registryModel.name} limit of ${registryModel.maxDuration}s.`);
        }
        const isV2V = data.sourceKind === "video";
        let endpoint: string | null = null;
        if (isV2V) {
          endpoint = registryModel.videoEndpoint;
          if (!endpoint) step = buildVideoEnhancement({ videoUrl: data.imageUrl! });
        } else if (data.imageUrl) {
          endpoint = registryModel.imageEndpoint;
        } else {
          endpoint = registryModel.textEndpoint;
        }
        if (!step) {
          if (!endpoint) throw new Error(`${registryModel.name} does not support this mode.`);
          const enhanced = await enhancePrompt({ prompt: styledPrompt, isEdit: false });
          step = buildVideoFromRegistry({
            endpoint,
            prompt: enhanced,
            imageUrl: isV2V ? undefined : (data.imageUrl || undefined),
            videoUrl: isV2V ? data.imageUrl : undefined,
            durationSeconds: videoDuration,
            aspectRatio: data.videoAspectRatio ?? "16:9",
            resolution: data.videoResolution ?? registryModel.resolutions[0],
            generateAudio: data.videoGenerateAudio === true && registryModel.nativeAudio,
            negativePrompt: data.videoNegativePrompt || undefined,
          });
        }
      } else if (!data.imageUrl) {
        const enhanced = await enhancePrompt({ prompt: styledPrompt, isEdit: false });
        step = buildTextToVideo({ prompt: enhanced, durationSeconds: videoDuration, aspectRatio: data.videoAspectRatio ?? "16:9" });
      } else if (data.sourceKind === "video") {
        step = buildVideoEnhancement({ videoUrl: data.imageUrl });
      } else {
        const enhanced = await enhancePrompt({ prompt: styledPrompt, isEdit: false });
        step = buildImageToVideo({ prompt: enhanced, imageUrl: data.imageUrl, durationSeconds: videoDuration, aspectRatio: data.videoAspectRatio ?? "16:9" });
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

    const chargeAmount = standardCharge ?? cost;
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
    await supabase.from("generations").insert({
      user_id: userId, type: data.type, prompt: data.prompt,
      input_url: data.imageUrl ? "uploaded" : null, output_url: outputUrl, status: "success",
      metadata: data.type === "video" ? { duration: data.videoDurationSeconds ?? 5, resolution: data.videoResolution ?? null, aspect_ratio: data.videoAspectRatio ?? null, model: data.videoModelId ?? null } : null,
    }).then(({ error }) => { if (error) console.error("[generate] history insert failed:", error.message); });
    return { outputUrl, credits: newCredits, plan: profile.plan };
  });

/** Safe pre-check floor when validation fails early in cost estimator. */
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
