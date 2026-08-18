import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_COST, type PlanId } from "@/lib/plans";
import { maxVideoDurationForPlan, videoCreditCost } from "@/lib/video-options";
import {
  imageQualityCost,
  imageUpscaleFactor,
  videoResolutionMultiplier,
  videoResolutionUpscales,
} from "@/lib/quality-options";
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
} from "@/lib/image-edit/prompt-engine";
import { getWatermarkMode } from "@/lib/policy";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** User-facing message when post-generation prep (incl. brand stamp) fails. */
const PREPARE_FAILED =
  "Couldn't finish preparing your image. Please try again or contact support.";

function safePayload(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    out[k] =
      typeof v === "string" && v.length > 80 ? `${v.slice(0, 64)}… (${v.length} chars)` : v;
  }
  return out;
}

function isPixelLimitError(msg: string): boolean {
  return /4095|4096|maximum should be|too large|max(imum)?\s*(image\s*)?(size|dimension|pixels)|exceeds|resolution too high/i.test(
    msg || "",
  );
}

function falErrorMessage(label: string, status: number, txt: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(txt) as { detail?: unknown };
    if (typeof parsed.detail === "string") detail = parsed.detail;
    else if (Array.isArray(parsed.detail))
      detail = (parsed.detail as { msg?: string }[]).map((d) => d?.msg).filter(Boolean).join("; ");
  } catch {
    detail = txt.slice(0, 200);
  }
  if (status === 429) return "AI service is rate-limited right now. Please retry in a moment.";
  if (status === 401 || status === 403)
    return "AI service authentication failed (invalid or expired API key).";
  if (/balance|locked|billing|top up|exhausted/i.test(detail))
    return "AI service is out of credits. Top up the fal.ai account balance to continue.";
  if (/file_download_error|download the file/i.test(detail))
    return "The uploaded media could not be fetched by the AI. Please re-upload and try again.";
  if (/image_load_error|corrupted|supported format/i.test(detail))
    return "The uploaded image is invalid or in an unsupported format. Try a JPG or PNG.";
  if (/nsfw|safety/i.test(detail))
    return "The request was blocked by the safety filter. Try a different prompt or image.";
  if (detail) return `${label} failed: ${detail.slice(0, 160)}`;
  return `${label} failed (status ${status}). Please try again.`;
}

async function runFalStep(step: FalStep, falKey: string): Promise<string> {
  const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };
  console.log("[fal] ▶ submit:", step.label, "| model:", step.model);
  console.log("[fal]   payload:", JSON.stringify(safePayload(step.body)));

  const submit = await fetch(`${FAL_QUEUE}${step.model}`, {
    method: "POST", headers, body: JSON.stringify(step.body) });
  if (!submit.ok) {
    const txt = await submit.text();
    console.error("[fal] ✖ submit failed", step.label, submit.status, txt.slice(0, 500));
    throw new Error(falErrorMessage(step.label, submit.status, txt));
  }
  const { request_id, status_url, response_url } = (await submit.json()) as {
    request_id: string; status_url: string; response_url: string;
  };
  console.log("[fal]   queued request_id:", request_id);

  const deadline = Date.now() + 290_000;
  let delay = 1500;
  let lastStatus = "";
  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetch(status_url, { headers });
    if (!st.ok) { delay = Math.min(delay * 1.3, 5000); continue; }
    const sj = (await st.json()) as { status?: string };
    if (sj.status && sj.status !== lastStatus) {
      lastStatus = sj.status;
      console.log("[fal]   status:", sj.status);
    }
    if (sj.status === "COMPLETED") break;
    if (sj.status === "FAILED" || sj.status === "ERROR") {
      const body = await fetch(response_url, { headers }).then((r) => r.text()).catch(() => "");
      console.error("[fal] ✖ job failed", step.label, body.slice(0, 500));
      throw new Error(falErrorMessage(step.label, 500, body));
    }
    delay = Math.min(delay * 1.3, 5000);
  }
  if (lastStatus !== "COMPLETED") {
    console.error("[fal] ✖ timed out waiting for", step.label);
    throw new Error(`${step.label} took too long and timed out. Please try again.`);
  }

  const res = await fetch(response_url, { headers });
  if (!res.ok) {
    const txt = await res.text();
    console.error("[fal] ✖ result fetch failed", step.label, res.status, txt.slice(0, 500));
    throw new Error(falErrorMessage(step.label, res.status, txt));
  }
  const json = (await res.json()) as {
    image?: { url?: string }; images?: { url?: string }[]; video?: { url?: string };
  };
  const url = json.image?.url ?? json.images?.[0]?.url ?? json.video?.url ?? null;
  console.log("[fal] ✔ done:", step.label, "→", url ?? "none");
  if (!url) throw new Error(`${step.label} returned no output. Please try again.`);
  return url;
}

function isPermanentError(msg: string): boolean {
  return /authentication|out of credits|safety filter|unsupported format|invalid or in an unsupported|Not enough credits/i.test(msg || "");
}

async function runFalStepResilient(
  step: FalStep, falKey: string,
  opts: { timeoutMs?: number; maxRetries?: number } = {},
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? (step.outputKind === "video" ? 300_000 : 120_000);
  const maxRetries = opts.maxRetries ?? 2;
  let attempt = 0;
  let lastErr: unknown;
  while (attempt <= maxRetries) {
    try {
      if (attempt > 0) console.log(`[fal] retry attempt ${attempt} for ${step.label}…`);
      const url = await Promise.race([
        runFalStep(step, falKey),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Generation timed out. Please retry.")), timeoutMs),
        ),
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
  const finalMsg = lastErr instanceof Error ? lastErr.message : "Generation failed.";
  throw new Error(`${finalMsg} (failed after ${maxRetries + 1} attempts)`);
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
  videoDurationSeconds: z.union([
    z.literal(5), z.literal(10), z.literal(15),
    z.literal(20), z.literal(25), z.literal(30),
  ]).optional(),
  videoAspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3"]).optional(),
  imageQuality: z.enum(["hd", "2k", "4k"]).optional(),
  videoResolution: z.enum(["720p", "1080p", "4k"]).optional(),
  videoMode: z.enum(["transform", "enhance"]).optional(),
  keepWatermark: z.boolean().optional(),
});

export const generateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("plan, credits, email").eq("id", userId).single();

    if (pErr || !profile) throw new Error("Could not load your account.");

    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin =
      !!adminEmail && !!profile.email &&
      profile.email.toLowerCase() === adminEmail.toLowerCase();

    if (!isAdmin && data.type === "video" && profile.plan === "free") {
      throw new Error("Video generation requires a paid plan.");
    }

    const requestedDuration = data.videoDurationSeconds ?? 5;
    const maxDuration = maxVideoDurationForPlan(profile.plan);
    const videoDuration = isAdmin
      ? requestedDuration
      : (Math.min(requestedDuration, maxDuration) as typeof requestedDuration);
    const isVideoEnhance = data.type === "video" && data.sourceKind === "video";
    const cost = isVideoEnhance
      ? CREDIT_COST.video_enhance
      : data.type === "video"
        ? Math.round(videoCreditCost(videoDuration) * videoResolutionMultiplier(data.videoResolution))
        : imageQualityCost(data.imageQuality);

    if (!isAdmin && profile.credits < cost) {
      throw new Error(
        `Not enough credits. ${data.type === "video" ? "Video" : "Image"} generation costs ${cost} credits.`,
      );
    }

    const falKey = process.env.FAL_API_KEY;
    if (!falKey) throw new Error("AI service unavailable.");

    let outputUrl: string | null = null;

    try {
    if (data.type === "image") {
      console.log("[generate] user prompt:", data.prompt);
      console.log(
        "[generate] uploaded image url:",
        data.imageUrl ? `${data.imageUrl.slice(0, 64)}… (${data.imageUrl.length} chars)` : "none",
      );

      if (data.imageUrl) {
        const rawRefs = data.referenceImageUrls ?? [];
        const validRefs = rawRefs.filter((u) => u.startsWith("https://"));
        const hasRefs = validRefs.length > 0;
        const intent = understandIntent(data.prompt, hasRefs);
        console.log("[generate] understood intent:", intent, "| refs:", validRefs.length);

        if (data.maskImageUrl) {
          console.log("[generate] mode: masked inpaint | mask url:", data.maskImageUrl.slice(0, 64));
          const step = buildImageInpaint({
            prompt: data.prompt, imageUrl: data.imageUrl, maskUrl: data.maskImageUrl,
          });
          outputUrl = await runFalStepResilient(step, falKey);
        } else if (intent === "pure_enhance" || isPureEnhanceIntent(data.prompt)) {
          const pipeline = buildImageEnhancementPipeline({
            prompt: data.prompt, imageUrl: data.imageUrl, strength: data.strength ?? 0.85,
          });
          console.log("[generate] mode: pure enhance | steps:", pipeline.map((s) => s.label).join(" → "));
          try {
            let current = data.imageUrl;
            for (const step of pipeline) {
              step.body.image_url = current;
              current = await runFalStepResilient(step, falKey);
            }
            outputUrl = current;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "";
            if (isPixelLimitError(msg)) {
              console.warn("[generate] enhance hit size limit — kontext fallback with NO-REMOVE lock");
              const step = buildImageEdit({
                prompt:
                  "Enhance this exact photo: increase sharpness, clarity and fine detail, reduce noise and blur. " +
                  "Keep composition, every person, every object, colors and framing identical. Do NOT remove any person or object.",
                rawPrompt: data.prompt,
                imageUrl: data.imageUrl,
              });
              outputUrl = await runFalStepResilient(step, falKey);
            } else {
              throw err;
            }
          }
        } else {
          const { enhancePrompt } = await import("@/lib/prompt-enhance.server");
          const { getPlanLimits } = await import("@/utils/planLimits");
          const maxImages = getPlanLimits(profile.plan).maxImages;
          const refs = validRefs.slice(0, Math.max(0, maxImages - 1));

          let finalPrompt: string;
          if (intent === "outfit_transfer" || intent === "color" || intent === "outfit_single") {
            finalPrompt = buildFinalEditPrompt({
              rawPrompt: data.prompt,
              enhancedOrExpanded: expandPromptDeterministic(data.prompt, intent, refs.length),
              intent,
              referenceCount: refs.length,
            });
            console.log(
              "[generate] mode: kontext edit | intent:", intent,
              "| promptChars:", finalPrompt.length, "| alreadyEngineBuilt: true",
            );
          } else {
            const enhancedPrompt = await enhancePrompt({ prompt: data.prompt, isEdit: true });
            finalPrompt = buildFinalEditPrompt({
              rawPrompt: data.prompt,
              enhancedOrExpanded: enhancedPrompt,
              intent,
              referenceCount: refs.length,
            });
            console.log("[generate] mode: edit (flux kontext) | intent:", intent, "| promptChars:", finalPrompt.length);
          }

          console.log(`[generate] images sent to FAL: 1 primary + ${refs.length} reference(s)`);

          const settings = getIntentSettings(intent);
          const step = buildImageEdit({
            prompt: finalPrompt,
            rawPrompt: data.prompt,
            imageUrl: data.imageUrl,
            strength: data.strength,
            referenceImageUrls: refs.length > 0 ? refs : undefined,
            guidanceOverride: settings.guidance_scale,
          });
          console.log(
            "[generate] fal step meta:",
            JSON.stringify({
              model: step.model,
              label: step.label,
              guidance: step.body.guidance_scale,
              hasImageUrl: typeof step.body.image_url === "string",
              hasImageUrls: Array.isArray(step.body.image_urls),
            }),
          );
          outputUrl = await runFalStepResilient(step, falKey);
          console.log(
            "[generate] output received:",
            outputUrl ? `${outputUrl.slice(0, 48)}…` : "none",
            "| differsFromInput:", !!outputUrl && outputUrl !== data.imageUrl,
          );
        }
      } else {
        const { enhancePrompt } = await import("@/lib/prompt-enhance.server");
        const enhancedPrompt = await enhancePrompt({ prompt: data.prompt, isEdit: false });
        console.log("[generate] enhanced prompt:", enhancedPrompt);
        const { aspectToImageSize } = await import("@/lib/prompt-suggestions");
        const req = buildFalRequest({
          prompt: enhancedPrompt,
          imageSize: aspectToImageSize(data.aspectRatio),
        });
        outputUrl = await runFalStepResilient(
          { label: req.workflow, model: req.model, endpoint: req.endpoint, body: req.body, outputKind: "image" },
          falKey,
        );
      }
      if (!outputUrl) throw new Error("Generation returned no image.");

      const upFactor = imageUpscaleFactor(data.imageQuality);
      if (upFactor > 1) {
        try {
          console.log("[generate] quality tier:", data.imageQuality, "→ upscale", upFactor, "x");
          const up = await runFalStepResilient(
            buildImageUpscale({ imageUrl: outputUrl, factor: upFactor }), falKey,
          );
          if (up) outputUrl = up;
        } catch (e) {
          console.error("[generate] quality upscale failed, keeping base output:", e);
        }
      }
    } else {
      console.log("[generate] video | sourceKind:", data.sourceKind ?? "none");
      const { enhancePrompt } = await import("@/lib/prompt-enhance.server");
      let step: FalStep;
      if (!data.imageUrl) {
        const enhanced = await enhancePrompt({ prompt: data.prompt, isEdit: false });
        console.log("[generate] mode: text-to-video | enhanced:", enhanced);
        step = buildTextToVideo({
          prompt: enhanced, durationSeconds: videoDuration,
          aspectRatio: data.videoAspectRatio ?? "16:9",
        });
      } else if (data.sourceKind === "video") {
        console.log("[generate] mode: video-to-video (enhance)");
        step = buildVideoEnhancement({ videoUrl: data.imageUrl });
      } else {
        const enhanced = await enhancePrompt({ prompt: data.prompt, isEdit: false });
        console.log("[generate] mode: image-to-video | enhanced:", enhanced);
        step = buildImageToVideo({
          prompt: enhanced, imageUrl: data.imageUrl,
          durationSeconds: videoDuration, aspectRatio: data.videoAspectRatio ?? "16:9",
        });
      }
      console.log("[generate] video step:", step.label);
      outputUrl = await runFalStepResilient(step, falKey);
      if (!outputUrl) throw new Error("Video generation returned no output.");
      if (data.sourceKind !== "video" && videoResolutionUpscales(data.videoResolution)) {
        try {
          console.log("[generate] video quality tier 4k → topaz upscale pass");
          const up = await runFalStepResilient(buildVideoEnhancement({ videoUrl: outputUrl }), falKey);
          if (up) outputUrl = up;
        } catch (e) {
          console.error("[generate] video quality upscale failed, keeping base output:", e);
        }
      }
    }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Generation failed.";
      console.error("[generate] generation failed (no credits charged):", raw);
      throw new Error(`${raw} — Generation failed. Credits not charged.`);
    }

    if (!outputUrl || outputUrl.trim().length === 0) {
      throw new Error("Generation returned no output. Credits not charged.");
    }

    if (data.type === "image") {
      const wmMode = getWatermarkMode({
        plan: profile.plan, email: profile.email, isAdmin,
        keepWatermark: data.keepWatermark === true,
      });
      if (wmMode !== "none") {
        try {
          const { applyServerWatermark, fetchImageBuffer } = await import("@/lib/watermark.server");
          const raw = await fetchImageBuffer(outputUrl);
          const stamped = await applyServerWatermark(raw, wmMode);
          const path = `${userId}/out-wm-${Date.now()}.jpg`;
          const { error: upErr } = await supabaseAdmin.storage
            .from("uploads").upload(path, stamped, { contentType: "image/jpeg", upsert: true });
          if (upErr) {
            console.error("[generate] wm upload failed (no credits charged):", upErr.message);
            throw new Error(PREPARE_FAILED);
          }
          const { data: signed } = await supabaseAdmin.storage
            .from("uploads").createSignedUrl(path, 60 * 60 * 24 * 7);
          if (!signed?.signedUrl) {
            console.error("[generate] wm signed URL failed (no credits charged)");
            throw new Error(PREPARE_FAILED);
          }
          outputUrl = signed.signedUrl;
          console.log("[generate] output stamped server-side:", wmMode);
        } catch (e) {
          console.error("[generate] server stamp failed (no credits charged):", e);
          if (e instanceof Error && e.message === PREPARE_FAILED) throw e;
          throw new Error(PREPARE_FAILED);
        }
      }
    }

    let newCredits = profile.credits;
    if (isAdmin) {
      console.log("[generate] admin account — skipping credit deduction");
    } else {
      const { data: deduction, error: dErr } = await supabaseAdmin.rpc("deduct_credits", {
        _amount: cost, _gen_type: data.type, _user_id: userId,
      });
      if (dErr || !deduction) {
        if (dErr?.message?.includes("INSUFFICIENT_CREDITS")) {
          throw new Error(
            `Not enough credits. ${data.type === "video" ? "Video" : "Image"} generation costs ${cost} credits.`,
          );
        }
        console.error("[generate] credit deduction failed:", {
          message: dErr?.message, userId, amount: cost, genType: data.type,
        });
        throw new Error(`Could not charge credits: ${dErr?.message || "unknown error"}`);
      }
      const deducted = deduction as { transaction_id: string; credits: number };
      newCredits = deducted.credits;
      console.log("[generate] charged", cost, "credits → remaining", newCredits, "tx", deducted.transaction_id);
    }

    console.log("[generate] output ready:", outputUrl.slice(0, 80));

    const { error: histErr } = await supabase.from("generations").insert({
      user_id: userId, type: data.type, prompt: data.prompt,
      input_url: data.imageUrl ? "uploaded" : null,
      output_url: outputUrl, status: "success",
      metadata: data.type === "video"
        ? { duration: data.videoDurationSeconds ?? 5, resolution: data.videoResolution ?? null, aspect_ratio: data.videoAspectRatio ?? null }
        : null,
    });
    if (histErr) console.error("[generate] history insert failed:", histErr.message);

    return { outputUrl, credits: newCredits, plan: profile.plan };
  });

const checkoutSchema = z.object({
  plan: z.enum(["free", "plus", "pro", "studio", "business"]),
  currency: z.string().min(1).max(8),
});

export const completeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.plan !== "free") {
      throw new Error("Paid plans must be purchased through the secure payment checkout.");
    }
    const { error } = await supabase
      .from("profiles")
      .update({ plan: "free", currency: data.currency, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error("Could not update your plan.");
    return { ok: true, plan: "free" as PlanId, credits: 0 };
  });
