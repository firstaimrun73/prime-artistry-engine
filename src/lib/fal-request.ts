// Pure request-builders for fal.ai workflows.
// Framework-free so they can be unit-tested without network or auth.
//
// Design:
//  • Text → Image:   FLUX1.1 [pro] — top-tier prompt following & fidelity.
//  • Image → Image:  a DETERMINISTIC enhancement pipeline built from
//    specialized post-processing / restoration models. This avoids the
//    "identical before/after" bug caused by generative image-to-image that
//    either changes nothing (low guidance) or regenerates the whole scene.
//    These models preserve composition, colors, lighting and framing exactly
//    and only sharpen / deblur / recover detail.
//  • Video:          Topaz video upscale for frame-consistent sharpen+denoise.

export type ImageWorkflow = "text-to-image" | "image-to-image";

export type BuildFalRequestInput = {
  prompt: string;
  /** Data URI or public URL of the uploaded source image (image-to-image only). */
  imageUrl?: string | null;
  /** Edit strength 0.1–1. Scales sharpen/detail intensity. */
  strength?: number;
};

export type FalRequest = {
  workflow: ImageWorkflow;
  model: string;
  endpoint: string;
  body: Record<string, unknown>;
};

/** A single step in an enhancement pipeline. */
export type FalStep = {
  /** Human label for logs. */
  label: string;
  model: string;
  endpoint: string;
  body: Record<string, unknown>;
  /**
   * Where the output URL lives in the response, and which body field the
   * NEXT step should receive it as.
   */
  outputKind: "image" | "video";
};

// ── Models ──────────────────────────────────────────────────────────────
export const TEXT_TO_IMAGE_MODEL = "fal-ai/flux-pro/v1.1";
// Instruction-based image EDITING (add/remove/replace/recolor/background…).
// Preserves the original composition while applying the requested change —
// this is what makes edits visibly take effect instead of "identical output".
export const IMAGE_EDIT_MODEL = "fal-ai/flux-pro/kontext";
// Kept exported for back-compat with callers/tests that reference it.
export const IMAGE_TO_IMAGE_MODEL = "fal-ai/post-processing";

export const POST_PROCESSING_MODEL = "fal-ai/post-processing";
export const DEBLUR_MODEL = "fal-ai/nafnet/deblur";
export const UPSCALE_IMAGE_MODEL = "fal-ai/topaz/upscale/image";
export const UPSCALE_VIDEO_MODEL = "fal-ai/topaz/upscale/video";

const FAL_BASE = "https://fal.run/";
const ep = (m: string) => `${FAL_BASE}${m}`;

// Prompts that are PURELY about output quality (sharpness/resolution/clarity)
// route to the deterministic enhancement pipeline. Everything else is treated
// as a semantic edit and routed to the instruction-edit model so the change is
// actually applied.
export function isEnhancementOnly(prompt: string): boolean {
  const p = (prompt || "").toLowerCase().trim();
  if (!p) return true;
  // If it mentions any editing verb/target, it's an edit, not pure enhancement.
  const editSignals =
    /\b(add|remove|delete|replace|change|swap|turn|make it|recolor|color|colour|background|sky|paint|draw|insert|put|place|erase|move|rotate|crop|zoom|style|cartoon|anime|sketch|painting|outfit|clothes|hair|face|text|logo|object|boat|car|person|animal)\b/;
  if (editSignals.test(p)) return false;
  const enhanceSignals =
    /\b(enhance|sharpen|sharper|clarity|clear|clean|hd|4k|8k|upscale|resolution|detail|quality|deblur|denoise|noise|crisp|professional|restore|fix)\b/;
  return enhanceSignals.test(p);
}

// ── Instruction-based image edit ─────────────────────────────────────────
export function buildImageEdit({
  prompt,
  imageUrl,
}: {
  prompt: string;
  imageUrl: string;
}): FalStep {
  return {
    label: "edit (flux kontext)",
    model: IMAGE_EDIT_MODEL,
    endpoint: ep(IMAGE_EDIT_MODEL),
    outputKind: "image",
    body: {
      prompt,
      image_url: imageUrl,
      guidance_scale: 3.5,
      num_images: 1,
      output_format: "png",
      safety_tolerance: "2",
    },
  };
}

// ── Text → Image ────────────────────────────────────────────────────────
export function buildFalRequest({ prompt, imageUrl, strength = 0.7 }: BuildFalRequestInput): FalRequest {
  if (imageUrl) {
    // Back-compat shape: image-to-image now means "primary sharpen step".
    const steps = buildImageEnhancementPipeline({ prompt, imageUrl, strength });
    const primary = steps[0];
    return {
      workflow: "image-to-image",
      model: primary.model,
      endpoint: primary.endpoint,
      body: primary.body,
    };
  }

  return {
    workflow: "text-to-image",
    model: TEXT_TO_IMAGE_MODEL,
    endpoint: ep(TEXT_TO_IMAGE_MODEL),
    body: {
      prompt,
      image_size: "square_hd",
      num_images: 1,
      num_inference_steps: 40,
      guidance_scale: 4.5,
      output_format: "png",
      enable_safety_checker: true,
    },
  };
}

// ── Image enhancement pipeline ──────────────────────────────────────────
// Strong, detail-preserving defaults. `strength` (0.1–1) nudges intensity.
export function buildImageEnhancementPipeline({
  prompt,
  imageUrl,
  strength = 0.85,
}: {
  prompt: string;
  imageUrl: string;
  strength?: number;
}): FalStep[] {
  const s = Math.min(1, Math.max(0.1, strength));
  const p = (prompt || "").toLowerCase();

  const wantsDeblur = /\b(deblur|remove blur|unblur|blurry|out of focus|motion blur|sharpen dramatically)\b/.test(p);
  const wantsUpscale = /\b(hd|upscale|4k|8k|high res|resolution|peak detail|maximum detail|enhance detail)\b/.test(p);

  const steps: FalStep[] = [];

  // 1) Optional deblur first so sharpening doesn't amplify blur artifacts.
  if (wantsDeblur) {
    steps.push({
      label: "deblur (nafnet)",
      model: DEBLUR_MODEL,
      endpoint: ep(DEBLUR_MODEL),
      outputKind: "image",
      body: { image_url: imageUrl },
    });
  }

  // 2) Primary: post-processing smart sharpen for peak detailing. Cheap & fast.
  // Scale the strong defaults slightly with `strength`.
  const smartStrength = Number((5.5 + (6.5 - 5.5) * s).toFixed(2)); // 5.5–6.5
  steps.push({
    label: "sharpen (post-processing)",
    model: POST_PROCESSING_MODEL,
    endpoint: ep(POST_PROCESSING_MODEL),
    outputKind: "image",
    body: {
      // input image; filled at runtime if it follows a prior step
      image_url: imageUrl,
      enable_sharpen: true,
      sharpen_mode: "smart",
      smart_sharpen_strength: smartStrength,
      cas_amount: 1.0,
      preserve_edges: 0.8,
      sharpen_alpha: 2.0,
    },
  });

  // 3) Optional Topaz upscale for maximum detail recovery / HD output.
  if (wantsUpscale) {
    steps.push({
      label: "upscale (topaz)",
      model: UPSCALE_IMAGE_MODEL,
      endpoint: ep(UPSCALE_IMAGE_MODEL),
      outputKind: "image",
      body: {
        image_url: imageUrl,
        model: "High Fidelity V2",
        upscale_factor: 2,
        sharpen: 0.9,
        output_format: "png",
      },
    });
  }

  return steps;
}

// ── Video enhancement ───────────────────────────────────────────────────
export function buildVideoEnhancement({ videoUrl }: { videoUrl: string }): FalStep {
  return {
    label: "upscale (topaz video)",
    model: UPSCALE_VIDEO_MODEL,
    endpoint: ep(UPSCALE_VIDEO_MODEL),
    outputKind: "video",
    body: {
      video_url: videoUrl,
      model: "Artemis HQ",
      upscale_factor: 2,
    },
  };
}
