import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_COST, PLAN_CREDITS, type PlanId } from "@/lib/plans";
import {
  buildFalRequest,
  buildImageEdit,
  buildImageEnhancementPipeline,
  buildVideoEnhancement,
  buildTextToVideo,
  buildImageToVideo,
  isEnhancementOnly,
  type FalStep,
} from "@/lib/fal-request";

// Run one fal.ai model call and return its output URL.
async function runFalStep(
  step: FalStep,
  falKey: string,
): Promise<string> {
  console.log("[generate] step:", step.label, "model:", step.model);
  console.log(
    "[generate] payload:",
    JSON.stringify({
      ...step.body,
      image_url:
        typeof step.body.image_url === "string"
          ? `${(step.body.image_url as string).slice(0, 48)}…`
          : step.body.image_url,
      video_url:
        typeof step.body.video_url === "string"
          ? `${(step.body.video_url as string).slice(0, 48)}…`
          : step.body.video_url,
    }),
  );

  const res = await fetch(step.endpoint, {
    method: "POST",
    headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(step.body),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[generate] fal.ai error", step.label, res.status, txt);
    const detail = (() => {
      try {
        return (JSON.parse(txt) as { detail?: string }).detail ?? "";
      } catch {
        return "";
      }
    })();
    if (res.status === 429) throw new Error("Rate limit reached, try again shortly.");
    if (/balance|locked|billing|top up/i.test(detail))
      throw new Error("AI service is out of credits. Top up the fal.ai account balance to continue.");
    if (res.status === 401 || res.status === 403)
      throw new Error("AI service authentication failed (invalid API key).");
    throw new Error("Enhancement failed, please try again.");
  }

  const json = (await res.json()) as {
    image?: { url?: string };
    images?: { url?: string }[];
    video?: { url?: string };
  };
  const url =
    json.image?.url ??
    json.images?.[0]?.url ??
    json.video?.url ??
    null;
  console.log("[generate] step result url:", url ?? "none");
  if (!url) throw new Error("Enhancement returned no output.");
  return url;
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
});

export const generateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan, credits")
      .eq("id", userId)
      .single();

    if (pErr || !profile) {
      throw new Error("Could not load your account.");
    }

    if (data.type === "video" && profile.plan === "free") {
      throw new Error("Video generation requires a paid plan.");
    }

    const cost = CREDIT_COST[data.type];
    if (profile.credits < cost) {
      throw new Error(
        `Not enough credits. ${data.type === "video" ? "Video" : "Image"} generation costs ${cost} credits.`,
      );
    }

    const falKey = process.env.FAL_API_KEY;
    if (!falKey) throw new Error("AI service unavailable.");

    let outputUrl: string | null = null;

    if (data.type === "image") {
      console.log("[generate] user prompt:", data.prompt);
      console.log(
        "[generate] uploaded image url:",
        data.imageUrl ? `${data.imageUrl.slice(0, 64)}… (${data.imageUrl.length} chars)` : "none",
      );

      if (data.imageUrl) {
        if (isEnhancementOnly(data.prompt)) {
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

          let current = data.imageUrl;
          for (const step of pipeline) {
            step.body.image_url = current;
            current = await runFalStep(step, falKey);
          }
          outputUrl = current;
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
          const step = buildImageEdit({ prompt: enhancedPrompt, imageUrl: data.imageUrl });
          outputUrl = await runFalStep(step, falKey);
        }
      } else {
        // ── Text → Image path ─────────────────────────────────────────
        // Expand the prompt then generate with FLUX1.1 [pro].
        const { enhancePrompt } = await import("@/lib/prompt-enhance.server");
        const enhancedPrompt = await enhancePrompt({ prompt: data.prompt, isEdit: false });
        console.log("[generate] enhanced prompt:", enhancedPrompt);

        const req = buildFalRequest({ prompt: enhancedPrompt });
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
        step = buildTextToVideo({ prompt: enhanced });
      } else if (data.sourceKind === "video") {
        // C. Video → Video (enhancement / transformation)
        console.log("[generate] mode: video-to-video (enhance)");
        step = buildVideoEnhancement({ videoUrl: data.imageUrl });
      } else {
        // B. Image → Video (motion from a still)
        const enhanced = await enhancePrompt({ prompt: data.prompt, isEdit: false });
        console.log("[generate] mode: image-to-video | enhanced:", enhanced);
        step = buildImageToVideo({ prompt: enhanced, imageUrl: data.imageUrl });
      }

      console.log("[generate] video step:", step.label);
      outputUrl = await runFalStep(step, falKey);
      if (!outputUrl) throw new Error("Video generation returned no output.");
    }


    const newCredits = profile.credits - cost;
    await supabase.from("profiles").update({ credits: newCredits }).eq("id", userId);
    await supabase.from("generations").insert({
      user_id: userId,
      type: data.type,
      prompt: data.prompt,
      input_url: data.imageUrl ? "uploaded" : null,
      output_url: outputUrl,
      status: "success",
    });

    return { outputUrl, credits: newCredits, plan: profile.plan };
  });

const checkoutSchema = z.object({
  plan: z.enum(["free", "plus", "pro", "studio"]),
  currency: z.string().min(1).max(8),
});

export const completeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const credits = PLAN_CREDITS[data.plan as PlanId];
    const { error } = await supabase
      .from("profiles")
      .update({ plan: data.plan, credits, currency: data.currency })
      .eq("id", userId);
    if (error) throw new Error("Could not update your plan.");
    return { ok: true, plan: data.plan, credits };
  });
