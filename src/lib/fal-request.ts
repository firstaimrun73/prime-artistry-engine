// Pure request-builders for fal.ai workflows.
// Framework-free so they can be unit-tested without network or auth.
//
// Design:
// • Text → Image: FLUX1.1 [pro] — top-tier prompt following & fidelity.
// • Image → Image: deterministic enhancement OR Kontext edit.
// • Multi-image outfit: transfer-first prompt from image-edit/prompt-engine.
// • Video: Topaz / Kling.

import {
  modelTierForDuration,
  type VideoAspectRatio,
  type VideoModelTier,
} from "./video-options";

export type ImageWorkflow = "text-to-image" | "image-to-image";

export type BuildFalRequestInput = {
  prompt: string;
  imageUrl?: string | null;
  strength?: number;
  imageSize?: string;
};

export type FalRequest = {
  workflow: ImageWorkflow;
  model: string;
  endpoint: string;
  body: Record<string, unknown>;
};

export type FalStep = {
  label: string;
  model: string;
  endpoint: string;
  body: Record<string, unknown>;
  outputKind: "image" | "video";
};

export const TEXT_TO_IMAGE_MODEL = "fal-ai/flux-pro/v1.1";
export const IMAGE_EDIT_MODEL = "fal-ai/flux-pro/kontext";
export const IMAGE_EDIT_MULTI_MODEL = "fal-ai/flux-pro/kontext/max/multi";
export const IMAGE_INPAINT_MODEL = "fal-ai/flux-general/inpainting";
export const POST_PROCESSING_MODEL = "fal-ai/post-processing";
export const DEBLUR_MODEL = "fal-ai/nafnet/deblur";
export const UPSCALE_IMAGE_MODEL = "fal-ai/topaz/upscale/image";
export const UPSCALE_VIDEO_MODEL = "fal-ai/topaz/upscale/video";

const FAL_BASE = "https://fal.run/";
const ep = (m: string) => `${FAL_BASE}${m}`;

const EDIT_INTENT =
  /\b(remove|add|change|replace|keep|delete|colou?r|recolou?r|background|foreground|person|people|man|woman|face|hair|eyes?|object|clothes|clothing|dress|shirt|make|makes|making|put|move|fix|clean|cleanup|restore|relight|light|lighting|bright(en)?|dark(en)?|swap|turn|convert|transform|style|cartoon|anime|paint|painting|cinematic|vintage|retro|glasses|hat|smile|remove\s+bg|blur\s+background|sky|water|car|animal|dog|cat|logo|text|watermark|shadow|reflection|scene|younger|older|age|wrinkle|skin|expression|makeup|lipstick|beard|mustache)\b/;

export function hasEditIntent(prompt: string): boolean {
  return EDIT_INTENT.test((prompt || "").toLowerCase());
}

export function isEnhancementOnly(prompt: string): boolean {
  const p = (prompt || "").toLowerCase().trim();
  if (!p) return false;
  if (hasEditIntent(p)) return false;
  const qualityWords =
    /\b(enhance|enhanced|enhancement|sharpen|sharpened|sharper|sharpness|clarity|hd|uhd|4k|8k|upscale|upscaled|upscaling|resolution|res|detail|details|detailed|quality|deblur|unblur|denoise|noise|crisp|crisper|super|pixel|pixels|dpi)\b/g;
  const filler =
    /\b(please|the|this|that|a|an|it|its|my|to|and|of|in|on|with|for|make|more|very|really|higher|high|increase|improve|improved|better|up|max|maximum|peak|full)\b/g;
  const hadQuality = qualityWords.test(p);
  qualityWords.lastIndex = 0;
  const remaining = p
    .replace(qualityWords, " ")
    .replace(filler, " ")
    .replace(/[^a-z]+/g, " ")
    .trim();
  return hadQuality && remaining.length === 0;
}

export type EditSize =
  | "small_add"
  | "remove_people"
  | "face_fix"
  | "background"
  | "small"
  | "large"
  | "default";

const SMALL_ADD_MATCH =
  /\b(add|put|wear|place|insert|give|attach|include|show)\b[^.]{0,40}\b(goggles|glasses|sunglasses|hat|cap|mask|beard|mustache|smile|earring|necklace|crown|headband|scarf|tie|bowtie|accessory|piercing|tattoo|freckles|makeup|lipstick|eyeliner|bracelet|watch|ring|badge|pin|flower|helmet)\b/i;
const REMOVE_PEOPLE_MATCH =
  /\b(remove\s+(people|person|persons|humans?|human|everyone|all|all\s+people|all\s+persons|all\s+humans?)|erase\s+(person|people|humans?|human)|delete\s+(person|people|humans?|human))\b/i;
const FACE_FIX_MATCH =
  /\b(fix\s+(eye|eyes|face|mouth|nose|teeth|skin)|resolve\s+face|correct\s+face|repair\s+face|face\s+fix|make\s+(her|him|them|the\s+person)?\s*(smile|smiling|happy|sad|serious|look|younger|older)|change\s+(expression|face|eyes|skin|hair)|younger|older|age\s+(down|up)|reduce\s+wrinkle|remove\s+wrinkle|smooth\s+skin|clear\s+skin|beauty|portrait\s+retouch|retouch\s+face|fix\s+skin|skin\s+tone|eye\s+bags|dark\s+circles|teeth\s+whiten|whiten\s+teeth|lipstick|makeup|eyeliner|mascara|blush|foundation|beard|mustache|goatee|facial\s+hair)\b/i;
const BACKGROUND_MATCH =
  /\b(remove\s+background|change\s+background|replace\s+background|new\s+background|blur\s+background|remove\s+watermark|remove\s+logo|remove\s+text)\b/i;
const SMALL_EDIT_MATCH =
  /\b(make\s+brighter|brighten|straighten\s+head|fix\s+pose|slightly|subtle)\b/i;
const LARGE_EDIT_MATCH =
  /\b(transform|convert\s+to|turn\s+into|make\s+it\s+(a|an)\s+\w+\s+scene)\b/i;
const OUTFIT_MATCH =
  /\b(outfit|clothing|clothes|dress|shirt|jacket|armor|armour|costume|suit|wear|wearing|change\s+the\s+outfit|replace\s+outfit|swap\s+outfit|put\s+on|dress\s+(him|her|them)|clothes\s+from|PRIMARY TASK — OUTFIT|OUTFIT TRANSFER)\b/i;

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
      return { strength: 0.55, guidance_scale: 2.5, num_inference_steps: 40 };
    case "remove_people":
      return { strength: 0.95, guidance_scale: 4.0, num_inference_steps: 50 };
    case "face_fix":
      return { strength: 0.45, guidance_scale: 2.2, num_inference_steps: 36 };
    case "background":
      return { strength: 0.85, guidance_scale: 3.5, num_inference_steps: 48 };
    case "small":
      return { strength: 0.55, guidance_scale: 2.8, num_inference_steps: 40 };
    case "large":
      return { strength: 0.75, guidance_scale: 2.8, num_inference_steps: 40 };
    default:
      return { strength: 0.65, guidance_scale: 3.0, num_inference_steps: 40 };
  }
}

export type EditType =
  | "removal"
  | "background"
  | "portrait"
  | "style"
  | "enhance"
  | "color"
  | "general";

export function classifyEdit(prompt: string): EditType {
  const p = (prompt || "").toLowerCase();
  if (/remove[^.]{0,40}(person|people|man|woman|human|figure|background|object|watermark|text|logo)/.test(p))
    return "removal";
  if (/(background|backdrop|scene)/.test(p) && !/remove/.test(p)) return "background";
  if (/(face|skin|eye|eyes|nose|mouth|teeth|hair|portrait|beauty|wrinkle|age|younger|older|expression|smile|smiling|makeup|lipstick|beard|mustache|skin\s+tone|retouch)/.test(p))
    return "portrait";
  if (/(cartoon|anime|painting|sketch|watercolor|artistic|style)/.test(p)) return "style";
  if (/(sharp|enhance|upscale|denoise|quality|hd|4k|clear|restore)/.test(p)) return "enhance";
  if (/(bright|dark|contrast|colou?r|saturation|warm|cool|light)/.test(p)) return "color";
  return "general";
}

export function getEditTypeSettings(type: EditType) {
  switch (type) {
    case "removal":
      return { strength: 0.9, guidance_scale: 4.5, num_inference_steps: 48 };
    case "background":
      return { strength: 0.8, guidance_scale: 3.5, num_inference_steps: 45 };
    case "portrait":
      return { strength: 0.4, guidance_scale: 2.2, num_inference_steps: 36 };
    case "style":
      return { strength: 0.7, guidance_scale: 3.5, num_inference_steps: 45 };
    case "enhance":
      return { strength: 0.55, guidance_scale: 2.8, num_inference_steps: 40 };
    case "color":
      return { strength: 0.4, guidance_scale: 2.5, num_inference_steps: 36 };
    default:
      return { strength: 0.65, guidance_scale: 3.0, num_inference_steps: 40 };
  }
}

export function getEditTypeClause(type: EditType): string {
  switch (type) {
    case "removal":
      return " Remove ONLY the specified element. Fill naturally with background. Zero changes to anything else.";
    case "background":
      return " Change ONLY the background. Subject must stay identical with clean edges.";
    case "portrait":
      return " Make ONLY the requested subtle face/skin change. Same individual — identical identity.";
    case "style":
      return " Apply style; keep composition and subject placement. Preserve identity.";
    case "color":
      return " Adjust ONLY color/lighting as asked. Subjects and composition identical.";
    default:
      return "";
  }
}

export const PRESERVATION_CONTRACT = `
CRITICAL: Preserve exact face and identity of every person. Only modify what was requested. Keep lighting, composition and photorealism. No new faces. No style change unless asked.
`.trim();

export function isValidSourceImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  return url.startsWith("https://");
}

const FACE_IDENTITY_LOCK =
  " IDENTITY LOCK: Keep the exact same person. Same face geometry, eyes, nose, mouth, skin tone, age, hair. Do not generate a different face.";

const PEOPLE_REMOVAL_PROMPT_CLAUSE =
  " Completely remove the target person or all visible people. Erase faces, bodies, clothing, hair, limbs, shadows. Reconstruct background matching texture and lighting. Keep non-human content. Photorealistic.";

const FACE_EDIT_CLAUSE =
  " Apply only the requested face/skin/expression change. Same individual — same facial structure and identity.";

const OBJECT_MODIFY_CLAUSE =
  " Modify only what the user requested. Keep background, lighting and unmentioned subjects unchanged unless required. Photorealistic.";

const STYLE_TRANSFORM_CLAUSE =
  " Apply this transformation to the exact uploaded image. Keep proportions and composition. Photorealistic unless a style is requested.";

const PRESERVATION_CLAUSE =
  " Keep photorealistic. Preserve person, face, pose, lighting and background except where the request requires change.";

/**
 * Build Kontext (single or multi) edit step.
 * When caller already passed a full transfer-first prompt (from prompt-engine),
 * we do NOT re-wrap with PRESERVATION_CONTRACT so clothing transfer is not buried.
 */
export function buildImageEdit({
  prompt,
  imageUrl,
  strength,
  referenceImageUrls,
  rawPrompt,
  guidanceOverride,
}: {
  prompt: string;
  imageUrl: string;
  strength?: number;
  referenceImageUrls?: string[];
  rawPrompt?: string;
  /** Optional CFG from prompt-engine intent settings */
  guidanceOverride?: number;
}): FalStep {
  const source = rawPrompt ?? prompt;
  const editSize = classifyEditSize(source);
  const editType = classifyEdit(source);
  const typeSettings = getEditTypeSettings(editType);
  const quality = editType === "general" ? getQualitySettings(editSize) : typeSettings;
  void strength;

  if (!isValidSourceImageUrl(imageUrl)) {
    console.warn("[fal] source image URL is not an https URL:", imageUrl?.slice(0, 60));
  }

  const refs = (referenceImageUrls ?? []).filter(
    (u) => typeof u === "string" && u.startsWith("https://"),
  );
  const isMulti =
    refs.length > 0 && typeof imageUrl === "string" && imageUrl.startsWith("https://");
  const model = isMulti ? IMAGE_EDIT_MULTI_MODEL : IMAGE_EDIT_MODEL;
  const isFaceRelated = editSize === "face_fix" || editType === "portrait";
  const isOutfitMulti = isMulti && OUTFIT_MATCH.test(source);

  // If prompt-engine already built a full transfer / lock prompt, use as-is
  const alreadyBuilt =
    /PRIMARY TASK — OUTFIT|OUTFIT TRANSFER|This is a real photograph clothing/i.test(prompt);

  let finalPrompt: string;
  if (alreadyBuilt) {
    finalPrompt = prompt;
  } else {
    let basePrompt: string;
    if (editSize === "remove_people") {
      basePrompt = `${prompt}.${PEOPLE_REMOVAL_PROMPT_CLAUSE}`;
    } else if (isFaceRelated) {
      basePrompt = `${prompt}.${FACE_EDIT_CLAUSE}${FACE_IDENTITY_LOCK}`;
    } else if (editSize === "small_add") {
      basePrompt = `${prompt}.${PRESERVATION_CLAUSE}${FACE_IDENTITY_LOCK}`;
    } else if (editSize === "large") {
      basePrompt = `${prompt}.${STYLE_TRANSFORM_CLAUSE}`;
    } else if (editSize === "default" || editSize === "small") {
      basePrompt = `${prompt}.${OBJECT_MODIFY_CLAUSE}${FACE_IDENTITY_LOCK}`;
    } else {
      basePrompt = `${prompt}${FACE_IDENTITY_LOCK}`;
    }
    const withType = `${basePrompt}${getEditTypeClause(editType)}`;
    let multiNote = "";
    if (isMulti) {
      if (isOutfitMulti) {
        multiNote =
          ` MULTI-IMAGE OUTFIT TRANSFER: Image 1 is the base person. Images 2-${refs.length + 1} are the OUTFIT reference. ` +
          `Replace clothing on the person in image 1 with the EXACT outfit from the reference. ` +
          `Match colors, materials, silhouette. Keep face, identity, pose and background from image 1. ` +
          `Do NOT copy face from reference. Only transfer clothing.`;
      } else {
        multiNote =
          ` Use image 1 as base. Preserve face and identity from image 1. ` +
          `Images 2-${refs.length + 1} are references only — copy style/outfit but never face.`;
      }
    }
    // Outfit multi: do NOT append full PRESERVATION_CONTRACT (it fights clothing change)
    finalPrompt = isOutfitMulti
      ? `${withType}${multiNote}\nOUTPUT: same person as image 1, new clothes from reference. Photorealistic. No watermark.`
      : `${withType}${multiNote}\n\n${PRESERVATION_CONTRACT}`;
  }

  let guidance = guidanceOverride ?? quality.guidance_scale;
  if (isFaceRelated) guidance = Math.min(guidance, 2.4);
  if (isOutfitMulti) guidance = Math.max(guidance, 3.8);
  else if (isMulti) guidance = Math.max(guidance, 3.0);

  const body: Record<string, unknown> = {
    prompt: finalPrompt,
    guidance_scale: guidance,
    num_images: 1,
    output_format: "png",
    safety_tolerance: "2",
    enhance_prompt: false,
  };
  if (!isMulti && quality.num_inference_steps) {
    body.num_inference_steps = quality.num_inference_steps;
  }
  if (isMulti) {
    body.image_urls = [imageUrl, ...refs];
  } else {
    body.image_url = imageUrl;
  }

  return {
    label: `edit (flux kontext${isMulti ? ` multi ×${refs.length + 1}` : ""}, ${editSize}/${editType})`,
    model,
    endpoint: ep(model),
    outputKind: "image",
    body,
  };
}

export function buildImageInpaint({
  prompt,
  imageUrl,
  maskUrl,
}: {
  prompt: string;
  imageUrl: string;
  maskUrl: string;
}): FalStep {
  return {
    label: "masked inpaint (flux general)",
    model: IMAGE_INPAINT_MODEL,
    endpoint: ep(IMAGE_INPAINT_MODEL),
    outputKind: "image",
    body: {
      prompt: `${prompt}. Edit ONLY the white masked area. Remove selected content and fill naturally. Preserve every unmasked pixel.`,
      image_url: imageUrl,
      mask_url: maskUrl,
      strength: 0.86,
      guidance_scale: 3.5,
      num_inference_steps: 40,
      num_images: 1,
      enable_safety_checker: true,
      output_format: "png",
      scheduler: "euler",
      negative_prompt:
        "changed unmasked area, new subject, new person, distorted background, different face, artifacts, blur",
    },
  };
}

const SMALL_EDIT_INTENT =
  /\b(add|put|wear|place|insert|give|attach|include|show|goggles|glasses|hat|cap|mask|beard|smile|earring|necklace|crown|headband|sunglasses|accessory)\b/;

export function buildFalRequest({
  prompt,
  imageUrl,
  strength = 0.8,
  imageSize,
}: BuildFalRequestInput): FalRequest {
  void strength;
  if (imageUrl) {
    if (!isEnhancementOnly(prompt)) {
      const p = (prompt || "").toLowerCase();
      const isRemovePeople = /\b(remove people|remove person|remove all|erase person)\b/.test(p);
      const isFaceFix = FACE_FIX_MATCH.test(p) || classifyEdit(p) === "portrait";
      const isSmallEdit = SMALL_EDIT_INTENT.test(p);
      let guidance: number;
      let finalPrompt: string;
      if (isRemovePeople) {
        guidance = 4.0;
        finalPrompt = `${prompt}.${PEOPLE_REMOVAL_PROMPT_CLAUSE}`;
      } else if (isFaceFix) {
        guidance = 2.2;
        finalPrompt = `${prompt}.${FACE_EDIT_CLAUSE}${FACE_IDENTITY_LOCK}\n\n${PRESERVATION_CONTRACT}`;
      } else if (isSmallEdit) {
        guidance = 2.5;
        finalPrompt = `${prompt}.${PRESERVATION_CLAUSE}${FACE_IDENTITY_LOCK}`;
      } else {
        guidance = 2.8;
        finalPrompt = `${prompt}.${OBJECT_MODIFY_CLAUSE}${FACE_IDENTITY_LOCK}\n\n${PRESERVATION_CONTRACT}`;
      }
      return {
        workflow: "image-to-image",
        model: IMAGE_EDIT_MODEL,
        endpoint: ep(IMAGE_EDIT_MODEL),
        body: {
          prompt: finalPrompt,
          image_url: imageUrl,
          guidance_scale: guidance,
          num_inference_steps: isFaceFix ? 36 : 40,
          num_images: 1,
          output_format: "png",
          safety_tolerance: "2",
          enhance_prompt: false,
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
      image_size: imageSize ?? "square_hd",
      num_images: 1,
      num_inference_steps: 40,
      guidance_scale: 4.5,
      output_format: "png",
      enable_safety_checker: true,
    },
  };
}

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
  const wantsDeblur =
    /\b(deblur|remove blur|unblur|blurry|out of focus|motion blur|sharpen dramatically)\b/.test(p);
  const wantsUpscale =
    /\b(hd|upscale|4k|8k|high res|resolution|peak detail|maximum detail|enhance detail|clarity|sharp)\b/.test(
      p,
    );
  const steps: FalStep[] = [];
  if (wantsDeblur) {
    steps.push({
      label: "deblur (nafnet)",
      model: DEBLUR_MODEL,
      endpoint: ep(DEBLUR_MODEL),
      outputKind: "image",
      body: { image_url: imageUrl },
    });
  }
  const smartStrength = Number((5.5 + (6.5 - 5.5) * s).toFixed(2));
  steps.push({
    label: "sharpen (post-processing)",
    model: POST_PROCESSING_MODEL,
    endpoint: ep(POST_PROCESSING_MODEL),
    outputKind: "image",
    body: {
      image_url: imageUrl,
      enable_sharpen: true,
      sharpen_mode: "smart",
      smart_sharpen_strength: smartStrength,
      cas_amount: 1.0,
      preserve_edges: 0.8,
      sharpen_alpha: 2.0,
    },
  });
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

export const TEXT_TO_VIDEO_MODELS: Record<VideoModelTier, string> = {
  standard: "fal-ai/kling-video/v1.6/standard/text-to-video",
  pro: "fal-ai/kling-video/v1.6/pro/text-to-video",
  master: "fal-ai/kling-video/v2.1/master/text-to-video",
};
export const IMAGE_TO_VIDEO_MODELS: Record<VideoModelTier, string> = {
  standard: "fal-ai/kling-video/v1.6/standard/image-to-video",
  pro: "fal-ai/kling-video/v1.6/pro/image-to-video",
  master: "fal-ai/kling-video/v2.1/master/image-to-video",
};
export const TEXT_TO_VIDEO_MODEL = TEXT_TO_VIDEO_MODELS.standard;
export const IMAGE_TO_VIDEO_MODEL = IMAGE_TO_VIDEO_MODELS.standard;
export const VIDEO_NEGATIVE_PROMPT =
  "blur, distort, low quality, watermark, ugly, deformed, flickering";

export function buildTextToVideo({
  prompt,
  durationSeconds = 5,
  aspectRatio = "16:9",
}: {
  prompt: string;
  durationSeconds?: number;
  aspectRatio?: VideoAspectRatio;
}): FalStep {
  const tier = modelTierForDuration(durationSeconds);
  const model = TEXT_TO_VIDEO_MODELS[tier];
  return {
    label: `text-to-video (kling ${tier})`,
    model,
    endpoint: ep(model),
    outputKind: "video",
    body: {
      prompt,
      negative_prompt: VIDEO_NEGATIVE_PROMPT,
      duration: String(durationSeconds),
      aspect_ratio: aspectRatio,
    },
  };
}

export function buildImageToVideo({
  prompt,
  imageUrl,
  durationSeconds = 5,
  aspectRatio = "16:9",
}: {
  prompt: string;
  imageUrl: string;
  durationSeconds?: number;
  aspectRatio?: VideoAspectRatio;
}): FalStep {
  const tier = modelTierForDuration(durationSeconds);
  const model = IMAGE_TO_VIDEO_MODELS[tier];
  return {
    label: `image-to-video (kling ${tier})`,
    model,
    endpoint: ep(model),
    outputKind: "video",
    body: {
      prompt,
      image_url: imageUrl,
      negative_prompt: VIDEO_NEGATIVE_PROMPT,
      duration: String(durationSeconds),
      aspect_ratio: aspectRatio,
    },
  };
}

export function buildVideoEnhancement({ videoUrl }: { videoUrl: string }): FalStep {
  return {
    label: "upscale (topaz video)",
    model: UPSCALE_VIDEO_MODEL,
    endpoint: ep(UPSCALE_VIDEO_MODEL),
    outputKind: "video",
    body: { video_url: videoUrl, model: "Artemis HQ", upscale_factor: 2 },
  };
}

export function buildImageUpscale({
  imageUrl,
  factor,
}: {
  imageUrl: string;
  factor: number;
}): FalStep {
  return {
    label: `quality upscale ${factor}x (topaz)`,
    model: UPSCALE_IMAGE_MODEL,
    endpoint: ep(UPSCALE_IMAGE_MODEL),
    outputKind: "image",
    body: {
      image_url: imageUrl,
      model: "High Fidelity V2",
      upscale_factor: factor,
      sharpen: 0.85,
      output_format: "png",
    },
  };
}
