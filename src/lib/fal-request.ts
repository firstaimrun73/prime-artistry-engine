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
// Image EDITING via FLUX dev image-to-image. Applies the requested change while
// keeping the source composition. Strength is clamped to a visible minimum so
// edits actually take effect instead of returning a near-identical image.
export const IMAGE_EDIT_MODEL = "fal-ai/flux/dev/image-to-image";
// Kept exported for back-compat with callers/tests that reference it.
export const IMAGE_TO_IMAGE_MODEL = "fal-ai/post-processing";

export const POST_PROCESSING_MODEL = "fal-ai/post-processing";
export const DEBLUR_MODEL = "fal-ai/nafnet/deblur";
export const UPSCALE_IMAGE_MODEL = "fal-ai/topaz/upscale/image";
export const UPSCALE_VIDEO_MODEL = "fal-ai/topaz/upscale/video";

const FAL_BASE = "https://fal.run/";
const ep = (m: string) => `${FAL_BASE}${m}`;

// Explicit editing verbs/nouns. If ANY of these appear, the prompt is a real
// semantic edit and must go to fal-ai/flux/dev/image-to-image so the change is
// applied to the SAME image (never the sharpen-only pipeline).
const EDIT_INTENT =
  /\b(remove|add|change|replace|keep|delete|colou?r|recolou?r|background|foreground|person|people|man|woman|face|hair|eyes|object|clothes|clothing|dress|shirt|make|makes|making|put|move|fix|clean|cleanup|restore|relight|light|lighting|bright(en)?|dark(en)?|swap|turn|convert|transform|style|cartoon|anime|paint|painting|cinematic|vintage|retro|glasses|hat|smile|remove\s+bg|blur\s+background|sky|water|car|animal|dog|cat|logo|text|watermark|shadow|reflection|scene)\b/;

export function hasEditIntent(prompt: string): boolean {
  return EDIT_INTENT.test((prompt || "").toLowerCase());
}

// Route to the deterministic sharpen/upscale pipeline ONLY when the prompt is
// PURELY about output fidelity (sharpness/resolution/HD) with no other intent.
// Everything else — including "restore", "fix", "clean up", relighting, and any
// semantic change — goes to the instruction-edit model so the requested change
// is actually applied instead of returning a near-identical image.
export function isEnhancementOnly(prompt: string): boolean {
  const p = (prompt || "").toLowerCase().trim();
  if (!p) return false;

  // If the prompt contains ANY real editing instruction, it is NOT a pure
  // enhancement — route it to the instruction-edit (image-to-image) model so
  // the requested change is actually applied to the SAME image.
  if (hasEditIntent(p)) return false;

  // Words that only describe output fidelity — safe to strip.
  const qualityWords =
    /\b(enhance|enhanced|enhancement|sharpen|sharpened|sharper|sharpness|clarity|hd|uhd|4k|8k|upscale|upscaled|upscaling|resolution|res|detail|details|detailed|quality|deblur|unblur|denoise|noise|crisp|crisper|super|pixel|pixels|dpi)\b/g;
  // Generic filler that carries no editing intent.
  const filler =
    /\b(please|the|this|that|a|an|it|its|my|to|and|of|in|on|with|for|make|more|very|really|higher|high|increase|improve|improved|better|up|max|maximum|peak|full)\b/g;

  const hadQuality = qualityWords.test(p);
  qualityWords.lastIndex = 0;

  const remaining = p
    .replace(qualityWords, " ")
    .replace(filler, " ")
    .replace(/[^a-z]+/g, " ")
    .trim();

  // Pure enhancement only when a fidelity keyword was present AND nothing
  // meaningful (no subject, object, or edit verb) is left over.
  return hadQuality && remaining.length === 0;
}

// ── Edit-size classification & quality presets ───────────────────────────
// Classification uses the ORIGINAL short user prompt (not the enhanced one).
// The active image-to-image path (generate.functions.ts → buildImageEdit)
// routes every edit through these presets. Getting them right is what makes
// edits look surgical instead of either "nothing changed" or "whole image
// replaced with a different scene".
export type EditSize =
  | "small_add"       // add/wear/put a small accessory — must preserve photo
  | "remove_people"   // remove person/people — needs high strength
  | "face_fix"        // fix/correct eyes/face — moderate, identity-preserving
  | "background"      // remove/change/blur background or watermark
  | "small"           // legacy small preset (brightness / minor tweaks)
  | "large"           // legacy large preset (heavy transforms)
  | "default";        // everything else

const SMALL_ADD_MATCH =
  /\b(add|put|wear|place|insert|give|attach|include|show)\b[^.]{0,40}\b(goggles|glasses|sunglasses|hat|cap|mask|beard|mustache|smile|earring|necklace|crown|headband|scarf|tie|bowtie|accessory|piercing|tattoo|freckles|makeup|lipstick|eyeliner|bracelet|watch|ring|badge|pin|flower|helmet)\b/i;
const REMOVE_PEOPLE_MATCH =
  /\b(remove\s+(people|person|humans?|all\s+people)|erase\s+(person|people)|delete\s+person)\b/i;
const FACE_FIX_MATCH =
  /\b(fix\s+(eye|eyes|face|mouth|nose|teeth)|resolve\s+face|correct\s+face|repair\s+face)\b/i;
const BACKGROUND_MATCH =
  /\b(remove\s+background|change\s+background|replace\s+background|new\s+background|blur\s+background|remove\s+watermark|remove\s+logo|remove\s+text)\b/i;
const SMALL_EDIT_MATCH =
  /\b(make\s+brighter|brighten|straighten\s+head|fix\s+pose|slightly|subtle)\b/i;
const LARGE_EDIT_MATCH =
  /\b(transform|convert\s+to|turn\s+into|make\s+it\s+(a|an)\s+\w+\s+scene)\b/i;

export function classifyEditSize(userPrompt: string): EditSize {
  const p = userPrompt || "";
  if (REMOVE_PEOPLE_MATCH.test(p)) return "remove_people";
  if (FACE_FIX_MATCH.test(p)) return "face_fix";
  if (BACKGROUND_MATCH.test(p)) return "background";
  if (SMALL_ADD_MATCH.test(p)) return "small_add";
  if (SMALL_EDIT_MATCH.test(p)) return "small";
  if (LARGE_EDIT_MATCH.test(p)) return "large";
  return "default";
}

export function getQualitySettings(editSize: EditSize) {
  switch (editSize) {
    case "small_add":
      // Very low strength + low guidance so every pixel of the photo is kept
      // and only the requested small object is added.
      return { strength: 0.55, guidance_scale: 2.5, num_inference_steps: 40 };
    case "remove_people":
      // High strength so the person is actually erased and the background
      // inpainted, not left as a ghost.
      return { strength: 0.95, guidance_scale: 7.0, num_inference_steps: 50 };
    case "face_fix":
      return { strength: 0.75, guidance_scale: 5.0, num_inference_steps: 50 };
    case "background":
      return { strength: 0.85, guidance_scale: 4.5, num_inference_steps: 50 };
    case "small":
      return { strength: 0.6, guidance_scale: 3.0, num_inference_steps: 45 };
    case "large":
      return { strength: 0.85, guidance_scale: 4.5, num_inference_steps: 50 };
    default:
      // Balanced default: strong enough to apply the edit, gentle enough to
      // keep the subject and composition recognisable.
      return { strength: 0.7, guidance_scale: 3.5, num_inference_steps: 45 };
  }
}

// Preservation clause appended to small additive edits so the model does not
// re-stylise or regenerate the whole scene when adding a small object.
const PRESERVATION_CLAUSE =
  " Keep the photo completely realistic and photographic. Do NOT change the art style. Do NOT make it cartoon, anime or painting. Preserve the original person, face, skin tone, pose, clothing, lighting, colors and background exactly. Only make this one specific requested change.";

// ── Image edit (FLUX dev image-to-image) ─────────────────────────────────
export function buildImageEdit({
  prompt,
  imageUrl,
  strength,
  referenceImageUrls,
  rawPrompt,
}: {
  prompt: string;
  imageUrl: string;
  /** Optional manual strength override (0.1–1). When omitted, presets apply. */
  strength?: number;
  /** Extra reference images (multi-image), plan-gated by caller. */
  referenceImageUrls?: string[];
  /** Original short user prompt — used to classify edit size for quality presets. */
  rawPrompt?: string;
}): FalStep {
  const editSize = classifyEditSize(rawPrompt ?? prompt);
  const quality = getQualitySettings(editSize);

  // Manual strength override is respected but clamped to a preset-appropriate
  // range so the slider can't accidentally destroy identity on small edits or
  // under-power a full removal.
  let s = quality.strength;
  if (typeof strength === "number") {
    if (editSize === "small_add") {
      s = Math.min(0.65, Math.max(0.5, strength));
    } else if (editSize === "remove_people") {
      s = Math.min(1, Math.max(0.9, strength));
    } else if (editSize === "face_fix") {
      s = Math.min(0.85, Math.max(0.65, strength));
    } else {
      s = Math.min(1, Math.max(0.55, strength));
    }
  }

  // For small additive edits, tack on a strong preservation instruction so the
  // model doesn't drift the art style or regenerate the subject.
  const finalPrompt =
    editSize === "small_add" ? `${prompt}.${PRESERVATION_CLAUSE}` : prompt;

  return {
    label: `edit (flux dev image-to-image, ${editSize})`,
    model: IMAGE_EDIT_MODEL,
    endpoint: ep(IMAGE_EDIT_MODEL),
    outputKind: "image",
    body: {
      prompt: finalPrompt,
      image_url: imageUrl,
      ...(referenceImageUrls && referenceImageUrls.length > 0
        ? { image_urls: referenceImageUrls }
        : {}),
      strength: s,
      guidance_scale: quality.guidance_scale,
      num_inference_steps: quality.num_inference_steps,
      num_images: 1,
      output_format: "png",
      enable_safety_checker: true,
    },
  };
}

// ── Text → Image ────────────────────────────────────────────────────────
 // Detects small/additive edits that must preserve the photo exactly
const SMALL_EDIT_INTENT =
  /\b(add|put|wear|place|insert|give|attach|include|show|goggles|glasses|hat|cap|mask|beard|smile|earring|necklace|crown|headband|sunglasses|accessory)\b/;

export function buildFalRequest({ prompt, imageUrl, strength = 0.8 }: BuildFalRequestInput): FalRequest {
  if (imageUrl) {
    if (!isEnhancementOnly(prompt)) {
      const p = (prompt || "").toLowerCase();

      // Heavy removal edits — need high strength to actually erase subjects.
      const isRemovePeople =
        /\b(remove people|remove person|remove all|erase person)\b/.test(p);
      // Facial correction edits — moderate strength preserves identity.
      const isFaceFix =
        /\b(fix eye|fix face|resolve face|correct face)\b/.test(p);

      // Small edits (add goggles, add hat etc.) need LOW strength
      // to preserve the original photo and only make small changes
      const isSmallEdit = SMALL_EDIT_INTENT.test(p);

      let s: number;
      let guidance: number;
      let steps: number;

      if (isRemovePeople) {
        s = 0.95;
        guidance = 7.0;
        steps = 50;
      } else if (isFaceFix) {
        s = 0.75;
        guidance = 5.0;
        steps = 50;
      } else if (isSmallEdit) {
        s = Math.min(0.65, Math.max(0.55, strength * 0.7));
        guidance = 2.5;
        steps = 35;
      } else {
        s = Math.min(1, Math.max(0.75, strength));
        guidance = 3.5;
        steps = 40;
      }

      // For small edits, add strong preservation instruction to prompt
      const finalPrompt = isSmallEdit
        ? `${prompt}. Keep the photo completely realistic. Do NOT change art style. Do NOT make it cartoon or anime. Preserve the original photo, person, lighting, colors and background exactly. Only make this one small specific change.`
        : prompt;

      return {
        workflow: "image-to-image",
        model: IMAGE_EDIT_MODEL,
        endpoint: ep(IMAGE_EDIT_MODEL),
        body: {
          prompt: finalPrompt,
          image_url: imageUrl,
          strength: s,
          guidance_scale: guidance,
          num_inference_steps: steps,
          num_images: 1,
          output_format: "jpeg",
          enable_safety_checker: true,
        },
      };
    }
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

// ── Video models ────────────────────────────────────────────────────────
// Text → Video and Image → Video use Kling (strong motion + prompt following).
// Video → Video (enhancement) uses Topaz upscale for frame-consistent detail.
export const TEXT_TO_VIDEO_MODEL = "fal-ai/kling-video/v1.6/standard/text-to-video";
export const IMAGE_TO_VIDEO_MODEL = "fal-ai/kling-video/v1.6/standard/image-to-video";

// Shared negative prompt for cleaner, artifact-free motion.
export const VIDEO_NEGATIVE_PROMPT =
  "blur, distort, low quality, watermark, ugly, deformed, flickering";

// ── Text → Video ─────────────────────────────────────────────────────────
export function buildTextToVideo({ prompt }: { prompt: string }): FalStep {
  return {
    label: "text-to-video (kling)",
    model: TEXT_TO_VIDEO_MODEL,
    endpoint: ep(TEXT_TO_VIDEO_MODEL),
    outputKind: "video",
    body: {
      prompt,
      negative_prompt: VIDEO_NEGATIVE_PROMPT,
      duration: "5",
      aspect_ratio: "16:9",
    },
  };
}

// ── Image → Video ─────────────────────────────────────────────────────────
export function buildImageToVideo({
  prompt,
  imageUrl,
}: {
  prompt: string;
  imageUrl: string;
}): FalStep {
  return {
    label: "image-to-video (kling)",
    model: IMAGE_TO_VIDEO_MODEL,
    endpoint: ep(IMAGE_TO_VIDEO_MODEL),
    outputKind: "video",
    body: {
      prompt,
      image_url: imageUrl,
      negative_prompt: VIDEO_NEGATIVE_PROMPT,
      duration: "5",
      aspect_ratio: "16:9",
    },
  };
}

// ── Video → Video (enhancement) ──────────────────────────────────────────
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
