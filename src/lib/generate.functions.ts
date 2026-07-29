import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_COST, type PlanId } from "@/lib/plans";
import { maxVideoDurationForPlan, videoCreditCost } from "@/lib/video-options";
import {
  buildFalRequest,
  buildImageEdit,
  buildImageEnhancementPipeline,
  buildImageInpaint,
  buildVideoEnhancement,
  buildTextToVideo,
  buildImageToVideo,
  classifyEditSize,
  isEnhancementOnly,
  type FalStep,
} from "@/lib/fal-request";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Truncate any base64/data-URI fields so logs never blow the 256KB log limit.
function safePayload(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    out[k] =
      typeof v === "string" && v.length > 80 ? `${v.slice(0, 64)}… (${v.length} chars)` : v;
  }
  return out;
}

// Detect model "image too large" failures (e.g. fal post-processing rejects
// images above 4095×4095). Used to trigger a silent, quality-preserving
// fallback instead of showing users a technical pixel-limit error.
function isPixelLimitError(msg: string): boolean {
  return /4095|4096|maximum should be|too large|max(imum)?\s*(image\s*)?(size|dimension|pixels)|exceeds|resolution too high/i.test(
    msg || "",
  );
}


// Map a raw fal.ai error response to a specific, user-readable reason.
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

// Run one fal.ai model call via the async QUEUE API and return its output URL.
// The queue API submits the job, then polls for completion — this is what makes
// long-running video models (Kling, Topaz) reliable instead of timing out on a
// single held-open synchronous connection.
async function runFalStep(step: FalStep, falKey: string): Promise<string> {
  const headers = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };
  console.log("[fal] ▶ submit:", step.label, "| model:", step.model);
  console.log("[fal]   payload:", JSON.stringify(safePayload(step.body)));

  // 1) Submit to the queue.
  const submit = await fetch(`${FAL_QUEUE}${step.model}`, {
    method: "POST",
    headers,
    body: JSON.stringify(step.body),
  });
  if (!submit.ok) {
    const txt = await submit.text();
    console.error("[fal] ✖ submit failed", step.label, submit.status, txt.slice(0, 500));
    throw new Error(falErrorMessage(step.label, submit.status, txt));
  }
  const { request_id, status_url, response_url } = (await submit.json()) as {
    request_id: string;
    status_url: string;
    response_url: string;
  };
  console.log("[fal]   queued request_id:", request_id);

  // 2) Poll until the job completes (or fails / times out).
  const deadline = Date.now() + 290_000; // ~4.8 min hard cap
  let delay = 1500;
  let lastStatus = "";
  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetch(status_url, { headers });
    if (!st.ok) {
      console.warn("[fal]   status poll non-OK", st.status);
      delay = Math.min(delay * 1.3, 5000);
      continue;
    }
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

  // 3) Fetch the result.
  const res = await fetch(response_url, { headers });
  if (!res.ok) {
    const txt = await res.text();
    console.error("[fal] ✖ result fetch failed", step.label, res.status, txt.slice(0, 500));
    throw new Error(falErrorMessage(step.label, res.status, txt));
  }
  const json = (await res.json()) as {
    image?: { url?: string };
    images?: { url?: string }[];
    video?: { url?: string };
  };
  const url = json.image?.url ?? json.images?.[0]?.url ?? json.video?.url ?? null;
  console.log("[fal] ✔ done:", step.label, "→", url ?? "none");
  if (!url) throw new Error(`${step.label} returned no output. Please try again.`);
  return url;
}

// Errors that will never succeed on a retry (bad input, safety, auth, credits).
function isPermanentError(msg: string): boolean {
  return /authentication|out of credits|safety filter|unsupported format|invalid or in an unsupported|Not enough credits/i.test(
    msg || "",
  );
}

/**
 * Run a fal step with automatic retries (2 retries → 3 attempts total) and a
 * hard per-attempt timeout. Never charges credits — the caller only deducts
 * after a confirmed output URL.
 */
async function runFalStepResilient(
  step: FalStep,
  falKey: string,
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
          setTimeout(
            () => reject(new Error("Generation timed out. Please retry.")),
            timeoutMs,
          ),
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
  // Optional source media (data URI for images, or a signed URL for uploads).
  // Enables image-to-image, image-to-video and video-to-video workflows.
  imageUrl: z.string().min(1).max(15_000_000).optional(),
  // Tells the server what the uploaded media actually is so it routes correctly.
  sourceKind: z.enum(["image", "video"]).optional(),
  // Edit strength for image-to-image (0.1 – 1). Higher = more visible edits.
  strength: z.number().min(0.1).max(1).optional(),
  // Extra reference images for FLUX Kontext multi-image edits (plan-gated).
  referenceImageUrls: z.array(z.string().min(1).max(15_000_000)).max(9).optional(),
  // Optional black/white mask URL from Circle to Remove. White pixels are edited.
  maskImageUrl: z.string().min(1).max(15_000_000).optional(),
  // Text-to-image only. Aspect ratio chip selection.
  aspectRatio: z.enum(["1:1", "4:3", "16:9", "9:16", "3:4"]).optional(),
  // Video only. Requested clip length in seconds (plan-gated) + frame ratio.
  videoDurationSeconds: z.union([
    z.literal(5), z.literal(10), z.literal(15),
    z.literal(20), z.literal(25), z.literal(30),
  ]).optional(),
  videoAspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3"]).optional(),
});


export const generateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Credit RPCs are SECURITY DEFINER and only callable by service_role.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan, credits, email")
      .eq("id", userId)
      .single();

    if (pErr || !profile) {
      throw new Error("Could not load your account.");
    }

    // Admin account: unlimited access — no plan gating, no credit checks/charges.
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin =
      !!adminEmail &&
      !!profile.email &&
      profile.email.toLowerCase() === adminEmail.toLowerCase();

    if (!isAdmin && data.type === "video" && profile.plan === "free") {
      throw new Error("Video generation requires a paid plan.");
    }

    // Video cost scales with the requested duration; image cost is flat.
    const requestedDuration = data.videoDurationSeconds ?? 5;
    const maxDuration = maxVideoDurationForPlan(profile.plan);
    const videoDuration = isAdmin
      ? requestedDuration
      : (Math.min(requestedDuration, maxDuration) as typeof requestedDuration);
    const cost =
      data.type === "video" ? videoCreditCost(videoDuration) : CREDIT_COST[data.type];
    if (!isAdmin && profile.credits < cost) {
      throw new Error(
        `Not enough credits. ${data.type === "video" ? "Video" : "Image"} generation costs ${cost} credits.`,
      );
    }

    const falKey = process.env.FAL_API_KEY;
    if (!falKey) throw new Error("AI service unavailable.");

    // Credits are deducted ONLY after generation succeeds (see below), so a
    // failed FAL.ai call never charges the user. Balance was already checked
    // above; the atomic deduct_credits RPC re-checks at charge time to prevent
    // negative balances / concurrent double-spend.
    let outputUrl: string | null = null;

    try {

    if (data.type === "image") {
      console.log("[generate] user prompt:", data.prompt);
      console.log(
        "[generate] uploaded image url:",
        data.imageUrl ? `${data.imageUrl.slice(0, 64)}… (${data.imageUrl.length} chars)` : "none",
      );

      if (data.imageUrl) {
        if (data.maskImageUrl) {
          console.log("[generate] mode: masked inpaint | mask url:", data.maskImageUrl.slice(0, 64));
          const step = buildImageInpaint({
            prompt: data.prompt,
            imageUrl: data.imageUrl,
            maskUrl: data.maskImageUrl,
          });
          outputUrl = await runFalStep(step, falKey);
        } else if (isEnhancementOnly(data.prompt)) {
          // ── Pure enhancement path ───────────────────────────────────
          // Deterministic detail-preserving pipeline (deblur → smart
          // sharpen → optional Topaz upscale). Composition/colors stay
          // identical — only sharpness and fine detail improve.
          const pipeline = buildImageEnhancementPipeline({
            prompt: data.prompt,
            imageUrl: data.imageUrl,
            strength: data.strength,
          });
          console.log("[generate] mode: enhance | steps:", pipeline.map((s) => s.label).join(" → "));

          try {
            let current = data.imageUrl;
            for (const step of pipeline) {
              step.body.image_url = current;
              current = await runFalStep(step, falKey);
            }
            outputUrl = current;
          } catch (err) {
            // Some enhancement models reject very large photos (e.g. the
            // "maximum should be 4095×4095" limit common on mobile/DSLR
            // shots). Never surface that to the user — fall back to the
            // instruction-edit model, which downscales internally, with an
            // enhancement-only instruction so the result is still a sharper,
            // more detailed version of the SAME image.
            const msg = err instanceof Error ? err.message : "";
            if (isPixelLimitError(msg)) {
              console.warn("[generate] enhance hit a size limit — falling back to kontext enhance");
              const step = buildImageEdit({
                prompt:
                  "Enhance this exact photo: increase sharpness, clarity and fine detail, reduce noise and blur, improve overall quality. Keep the composition, subject, colors and framing identical — do not add, remove or change any content.",
                imageUrl: data.imageUrl,
              });
              outputUrl = await runFalStep(step, falKey);
            } else {
              throw err;
            }
          }
        } else {
          // ── Instruction edit path ───────────────────────────────────
          // The prompt asks for a real change (add/remove/recolor/etc.).
          // Expand the short prompt into a rich, vivid editing instruction
          // first (e.g. "cinematic" → cinematic lighting, dramatic contrast,
          // premium color grading…) so small prompts create big, meaningful
          // changes while preserving the main subject. Then apply with the
          // instruction-edit model.
          const { enhancePrompt } = await import("@/lib/prompt-enhance.server");
          const enhancedPrompt = await enhancePrompt({ prompt: data.prompt, isEdit: true });
          console.log("[generate] mode: edit (flux kontext) | enhanced:", enhancedPrompt);
          // Gate extra reference images by the user's plan limit.
          const { getPlanLimits } = await import("@/utils/planLimits");
          const maxImages = getPlanLimits(profile.plan).maxImages;
          const refs = (data.referenceImageUrls ?? []).slice(0, Math.max(0, maxImages - 1));
          // Quality presets (Fix 2) are classified from the ORIGINAL short
          // prompt. For generic ("default") edits the user's strength slider
          // still applies; small/large edits use their tuned presets.
          const editSize = classifyEditSize(data.prompt);
          const step = buildImageEdit({
            prompt: enhancedPrompt,
            rawPrompt: data.prompt,
            imageUrl: data.imageUrl,
            strength: editSize === "default" ? data.strength : undefined,
            referenceImageUrls: refs.length > 0 ? refs : undefined,
          });
          outputUrl = await runFalStep(step, falKey);
        }
      } else {
        // ── Text → Image path ─────────────────────────────────────────
        // Expand the prompt then generate with FLUX1.1 [pro].
        const { enhancePrompt } = await import("@/lib/prompt-enhance.server");
        const enhancedPrompt = await enhancePrompt({ prompt: data.prompt, isEdit: false });
        console.log("[generate] enhanced prompt:", enhancedPrompt);

        const { aspectToImageSize } = await import("@/lib/prompt-suggestions");
        const req = buildFalRequest({
          prompt: enhancedPrompt,
          imageSize: aspectToImageSize(data.aspectRatio),
        });

        outputUrl = await runFalStep(
          { label: req.workflow, model: req.model, endpoint: req.endpoint, body: req.body, outputKind: "image" },
          falKey,
        );
      }
      if (!outputUrl) throw new Error("Generation returned no image.");
    } else {
      // ── Video workflows (paid only) ─────────────────────────────────
      console.log("[generate] video | sourceKind:", data.sourceKind ?? "none");
      const { enhancePrompt } = await import("@/lib/prompt-enhance.server");

      let step: FalStep;
      if (!data.imageUrl) {
        // A. Text → Video
        const enhanced = await enhancePrompt({ prompt: data.prompt, isEdit: false });
        console.log("[generate] mode: text-to-video | enhanced:", enhanced);
        step = buildTextToVideo({
          prompt: enhanced,
          durationSeconds: videoDuration,
          aspectRatio: data.videoAspectRatio ?? "16:9",
        });
      } else if (data.sourceKind === "video") {
        // C. Video → Video (enhancement / transformation)
        console.log("[generate] mode: video-to-video (enhance)");
        step = buildVideoEnhancement({ videoUrl: data.imageUrl });
      } else {
        // B. Image → Video (motion from a still)
        const enhanced = await enhancePrompt({ prompt: data.prompt, isEdit: false });
        console.log("[generate] mode: image-to-video | enhanced:", enhanced);
        step = buildImageToVideo({
          prompt: enhanced,
          imageUrl: data.imageUrl,
          durationSeconds: videoDuration,
          aspectRatio: data.videoAspectRatio ?? "16:9",
        });
      }

      console.log("[generate] video step:", step.label);
      outputUrl = await runFalStep(step, falKey);
      if (!outputUrl) throw new Error("Video generation returned no output.");
    }
    } catch (err) {
      // FAL.ai failed — no credits were ever deducted, so nothing to refund.
      const raw = err instanceof Error ? err.message : "Generation failed.";
      console.error("[generate] generation failed (no credits charged):", raw);
      throw new Error(`${raw} — Generation failed. Credits not charged.`);
    }

    // An empty / missing output must never charge the user.
    if (!outputUrl || outputUrl.trim().length === 0) {
      throw new Error("Generation returned no output. Credits not charged.");
    }

    // ── Charge credits AFTER a confirmed successful output ───────────────
    // Admin account is never charged and keeps its unlimited balance.
    let newCredits = profile.credits;
    if (isAdmin) {
      console.log("[generate] admin account — skipping credit deduction");
    } else {
      // deduct_credits is atomic: it re-checks the balance and decrements in a
      // single statement, preventing negative balances and concurrent double-spend.
      const { data: deduction, error: dErr } = await supabaseAdmin.rpc("deduct_credits", {
        _amount: cost,
        _gen_type: data.type,
        _user_id: userId,
      });
      if (dErr || !deduction) {
        if (dErr?.message?.includes("INSUFFICIENT_CREDITS")) {
          throw new Error(
            `Not enough credits. ${data.type === "video" ? "Video" : "Image"} generation costs ${cost} credits.`,
          );
        }
        console.error("[generate] credit deduction failed:", {
          message: dErr?.message,
          code: (dErr as { code?: string })?.code,
          details: (dErr as { details?: string })?.details,
          hint: (dErr as { hint?: string })?.hint,
          userId,
          amount: cost,
          genType: data.type,
        });
        throw new Error(`Could not charge credits: ${dErr?.message || "unknown error"}`);
      }
      const deducted = deduction as { transaction_id: string; credits: number };
      newCredits = deducted.credits;
      console.log("[generate] charged", cost, "credits → remaining", newCredits, "tx", deducted.transaction_id);
    }

    // ── Persist history ─────────────────────────────────────────────────
    console.log("[generate] output ready:", outputUrl.slice(0, 80));

    const { error: histErr } = await supabase.from("generations").insert({
      user_id: userId,
      type: data.type,
      prompt: data.prompt,
      input_url: data.imageUrl ? "uploaded" : null,
      output_url: outputUrl,
      status: "success",
    });
    if (histErr) console.error("[generate] history insert failed:", histErr.message);

    return { outputUrl, credits: newCredits, plan: profile.plan };
  });

const checkoutSchema = z.object({
  plan: z.enum(["free", "plus", "pro", "studio", "business"]),
  currency: z.string().min(1).max(8),
});

// SECURITY: This path NEVER grants paid credits. Paid plans are credited only
// after a verified Razorpay/NOWPayments webhook (see payments.functions.ts and
// the /api/public/webhooks/* routes). Here we only allow activating the free
// plan, which carries no credits.
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
