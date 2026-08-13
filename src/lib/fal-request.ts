// Pure request-builders for fal.ai workflows.
// Framework-free so they can be unit-tested without network or auth.
//
// Design:
// • Text → Image: FLUX1.1 [pro] — top-tier prompt following & fidelity.
// • Image → Image: a DETERMINISTIC enhancement pipeline built from
//   specialized post-processing / restoration models.
// • Video: Topaz video upscale for frame-consistent sharpen+denoise.

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
export const IMAGE_EDIT_MULTI_MODEL =
  "fal-ai/flux-pro/kontext/max/multi";
export const IMAGE_INPAINT_MODEL =
  "fal-ai/flux-general/inpainting";
export const IMAGE_TO_IMAGE_MODEL =
  "fal-ai/post-processing";
export const POST_PROCESSING_MODEL =
  "fal-ai/post-processing";
export const DEBLUR_MODEL =
  "fal-ai/nafnet/deblur";
export const UPSCALE_IMAGE_MODEL =
  "fal-ai/topaz/upscale/image";
export const UPSCALE_VIDEO_MODEL =
  "fal-ai/topaz/upscale/video";

const FAL_BASE = "https://fal.run/";
const ep = (m: string) => `${FAL_BASE}${m}`;

const EDIT_INTENT =
  /\b(remove|add|change|replace|keep|delete|colou?r|recolou?r|background|foreground|person|people|man|woman|face|hair|eyes?|object|clothes|clothing|dress|shirt|make|makes|making|put|move|fix|clean|cleanup|restore|relight|light|lighting|bright(en)?|dark(en)?|swap|turn|convert|transform|style|cartoon|anime|paint|painting|cinematic|vintage|retro|glasses|hat|smile|remove\s+bg|blur\s+background|sky|water|car|animal|dog|cat|logo|text|watermark|shadow|reflection|scene|younger|older|age|wrinkle|skin|expression|makeup|lipstick|beard|mustache)\b/;

export function hasEditIntent(prompt: string): boolean {
  return EDIT_INTENT.test(
    (prompt || "").toLowerCase(),
  );
}

export function isEnhancementOnly(
  prompt: string,
): boolean {
  const p = (prompt || "").toLowerCase().trim();

  if (!p) return false;
  if (hasEditIntent(p)) return false;

  const qualityWords =
    /\b(enhance|enhanced|enhancement|sharpen|sharpened|sharper|sharpness|clarity|hd|uhd|4k|8k|upscale|upscaled|upscaling|resolution|res|detail|details|detailed|quality|deblur|unblur|denoise|noise|crisp|crisper|super|pixel|pixels|dpi)\b/g;

  const filler =
    /\b(please|the|this|that|a|an|it|its|my|to|and|of|in|on|with|for|make|more|very|really|higher|high|increase|improve|improved|better|up|max|maximum|peak|full)\b/g;

  const hadQuality =
    qualityWords.test(p);

  qualityWords.lastIndex = 0;

  const remaining = p
    .replace(qualityWords, " ")
    .replace(filler, " ")
    .replace(/[^a-z]+/g, " ")
    .trim();

  return (
    hadQuality &&
    remaining.length === 0
  );
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

/** Detect outfit / clothing transfer requests (used for multi-image guidance). */
const OUTFIT_MATCH =
  /\b(outfit|clothing|clothes|dress|shirt|jacket|armor|armour|costume|suit|wear|wearing|change\s+the\s+outfit|replace\s+outfit|swap\s+outfit|put\s+on|dress\s+(him|her|them)|clothes\s+from)\b/i;

export function classifyEditSize(
  userPrompt: string,
): EditSize {
  const p = userPrompt || "";

  if (REMOVE_PEOPLE_MATCH.test(p))
    return "remove_people";

  if (FACE_FIX_MATCH.test(p))
    return "face_fix";

  if (BACKGROUND_MATCH.test(p))
    return "background";

  if (SMALL_ADD_MATCH.test(p))
    return "small_add";

  if (SMALL_EDIT_MATCH.test(p))
    return "small";

  if (LARGE_EDIT_MATCH.test(p))
    return "large";

  return "default";
}

export function getQualitySettings(
  editSize: EditSize,
) {
  switch (editSize) {
    case "small_add":
      return {
        strength: 0.55,
        guidance_scale: 2.5,
        num_inference_steps: 40,
      };

    case "remove_people":
      return {
        strength: 0.95,
        guidance_scale: 4.0,
        num_inference_steps: 50,
      };

    case "face_fix":
      return {
        strength: 0.45,
        guidance_scale: 2.2,
        num_inference_steps: 36,
      };

    case "background":
      return {
        strength: 0.85,
        guidance_scale: 3.5,
        num_inference_steps: 48,
      };

    case "small":
      return {
        strength: 0.55,
        guidance_scale: 2.8,
        num_inference_steps: 40,
      };

    case "large":
      return {
        strength: 0.75,
        guidance_scale: 2.8,
        num_inference_steps: 40,
      };

    default:
      return {
        strength: 0.65,
        guidance_scale: 3.0,
        num_inference_steps: 40,
      };
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

export function classifyEdit(
  prompt: string,
): EditType {
  const p = (prompt || "").toLowerCase();

  if (
    /remove[^.]{0,40}(person|people|man|woman|human|figure|background|object|watermark|text|logo)/.test(
      p,
    )
  )
    return "removal";

  if (
    /(background|backdrop|scene)/.test(p) &&
    !/remove/.test(p)
  )
    return "background";

  if (
    /(face|skin|eye|eyes|nose|mouth|teeth|hair|portrait|beauty|wrinkle|age|younger|older|expression|smile|smiling|makeup|lipstick|beard|mustache|skin\s+tone|retouch)/.test(
      p,
    )
  )
    return "portrait";

  if (
    /(cartoon|anime|painting|sketch|watercolor|artistic|style)/.test(
      p,
    )
  )
    return "style";

  if (
    /(sharp|enhance|upscale|denoise|quality|hd|4k|clear|restore)/.test(
      p,
    )
  )
    return "enhance";

  if (
    /(bright|dark|contrast|colou?r|saturation|warm|cool|light)/.test(
      p,
    )
  )
    return "color";

  return "general";
}

export function getEditTypeSettings(
  type: EditType,
) {
  switch (type) {
    case "removal":
      return {
        strength: 0.9,
        guidance_scale: 4.5,
        num_inference_steps: 48,
      };

    case "background":
      return {
        strength: 0.8,
        guidance_scale: 3.5,
        num_inference_steps: 45,
      };

    case "portrait":
      return {
        strength: 0.4,
        guidance_scale: 2.2,
        num_inference_steps: 36,
      };

    case "style":
      return {
        strength: 0.7,
        guidance_scale: 3.5,
        num_inference_steps: 45,
      };

    case "enhance":
      return {
        strength: 0.55,
        guidance_scale: 2.8,
        num_inference_steps: 40,
      };

    case "color":
      return {
        strength: 0.4,
        guidance_scale: 2.5,
        num_inference_steps: 36,
      };

    default:
      return {
        strength: 0.65,
        guidance_scale: 3.0,
        num_inference_steps: 40,
      };
  }
}

export function getEditTypeClause(
  type: EditType,
): string {
  switch (type) {
    case "removal":
      return " Remove ONLY the specified element. Fill naturally with background. Zero changes to anything else. Preserve all remaining faces, colors and lighting exactly.";

    case "background":
      return " Change ONLY the background. Subject must be pixel-perfect identical, with clean edges and unchanged colors and proportions.";

    case "portrait":
      return " Make ONLY the requested subtle change to the face/skin/expression. The person MUST remain 100% the same individual — identical facial structure, bone structure, eye shape, nose shape, lip shape, skin tone, age appearance and identity. Do not generate a different person.";

    case "style":
      return " Apply style while keeping exact same composition, proportions and subject placement. Preserve identity.";

    case "color":
      return " Adjust ONLY the specified color or lighting element. Keep all subjects, objects and composition identical.";

    default:
      return "";
  }
}

export const STRONG_PRESERVATION = `
ABSOLUTE RULES — IDENTITY LOCK:
- The face, facial structure, bone structure, eye shape, nose, lips, skin tone, age, hair and identity of EVERY person must stay EXACTLY the same as the input photo.
- Only change what the user specifically asked. Nothing else.
- Keep background identical unless asked.
- Keep lighting and shadows identical.
- Keep image sharpness and resolution.
- No style changes unless requested.
- Result must look like the same photo lightly edited, NEVER a newly generated face or person.
`.trim();

export const PRESERVATION_CONTRACT = `
CRITICAL RULES — MUST FOLLOW EXACTLY:
1. Preserve the EXACT face, facial geometry, skin tone, facial features, hairstyle, expression baseline and identity of every person. Do NOT invent a new face.
2. Only modify the SPECIFIC area or attribute requested by the user.
3. Keep ALL other parts of the image IDENTICAL to the original.
4. Preserve original lighting, shadows, colors, perspective and composition.
5. Do NOT change art style or realism.
6. Do NOT add or remove anything not specifically requested.
7. Maintain original image sharpness and resolution throughout.
${STRONG_PRESERVATION}
`.trim();

export function isValidSourceImageUrl(
  url: string | null | undefined,
): boolean {
  if (!url || typeof url !== "string")
    return false;

  return url.startsWith("https://");
}

const FACE_IDENTITY_LOCK =
  " IDENTITY LOCK: Keep the exact same person. Same face geometry, same eyes, same nose, same mouth, same skin tone, same age, same hair. Do not generate a different face or different person. Only apply the specific requested change.";

const PRESERVATION_CLAUSE =
  " Keep the photo completely realistic and photographic. Do NOT change the art style. Do NOT make it cartoon, anime or painting. Preserve the original person, face, skin tone, pose, clothing, lighting, colors and background exactly. Only make this one specific requested change.";

const PEOPLE_REMOVAL_PROMPT_CLAUSE =
  " Completely remove the target person or all visible people from the original photo. Do not preserve any removed humans. Erase faces, bodies, clothing, hair, limbs, shadows, reflections and ghost silhouettes. Seamlessly reconstruct the background where they were using matching texture, perspective, lighting, depth, colors and noise. Preserve every non-human pixel, object, edge, background structure, camera angle and composition as much as possible. Do not add new people. Keep the result photorealistic.";

const STYLE_TRANSFORM_CLAUSE =
  " Apply this transformation to the EXACT uploaded image only. Keep all original proportions, angles, perspective and composition identical. Only change the visual style and appearance as requested. Do not change the shape or structure. Keep it photorealistic unless a style is specifically requested. High quality output with maximum detail.";

const OBJECT_MODIFY_CLAUSE =
  " Modify only the specified object in this exact photo. Keep the background, lighting, shadows and surroundings completely unchanged. The modification must look natural and realistic as if it was always there. Maintain the original camera angle and perspective.";

const FACE_EDIT_CLAUSE =
  " Apply only the requested face/skin/expression change. The person must remain the identical individual from the input photo — same facial structure, same features, same identity. Do not redesign or regenerate the face.";

export function buildImageEdit({
  prompt,
  imageUrl,
  strength,
  referenceImageUrls,
  rawPrompt,
}: {
  prompt: string;
  imageUrl: string;
  strength?: number;
  referenceImageUrls?: string[];
  rawPrompt?: string;
}): FalStep {
  const source = rawPrompt ?? prompt;

  const editSize =
    classifyEditSize(source);

  const editType =
    classifyEdit(source);

  const typeSettings =
    getEditTypeSettings(editType);

  const quality =
    editType === "general"
      ? getQualitySettings(editSize)
      : typeSettings;

  void strength;

  if (!isValidSourceImageUrl(imageUrl)) {
    console.warn(
      "[fal] source image URL is not an https URL:",
      imageUrl?.slice(0, 60),
    );
  }

  const refs = (referenceImageUrls ?? []).filter(
    (u) => typeof u === "string" && u.startsWith("https://"),
  );

  const isMulti =
    refs.length > 0 &&
    typeof imageUrl === "string" &&
    imageUrl.startsWith("https://");

  const model = isMulti ? IMAGE_EDIT_MULTI_MODEL : IMAGE_EDIT_MODEL;

  const isFaceRelated =
    editSize === "face_fix" ||
    editType === "portrait";

  const isOutfitMulti =
    isMulti && OUTFIT_MATCH.test(source);

  let basePrompt: string;

  if (editSize === "remove_people") {
    basePrompt =
      `${prompt}.${PEOPLE_REMOVAL_PROMPT_CLAUSE}`;
  } else if (isFaceRelated) {
    basePrompt =
      `${prompt}.${FACE_EDIT_CLAUSE}${FACE_IDENTITY_LOCK}`;
  } else if (editSize === "small_add") {
    basePrompt =
      `${prompt}.${PRESERVATION_CLAUSE}${FACE_IDENTITY_LOCK}`;
  } else if (editSize === "large") {
    basePrompt =
      `${prompt}.${STYLE_TRANSFORM_CLAUSE}`;
  } else if (
    editSize === "default" ||
    editSize === "small"
  ) {
    basePrompt =
      `${prompt}.${OBJECT_MODIFY_CLAUSE}${FACE_IDENTITY_LOCK}`;
  } else {
    basePrompt =
      `${prompt}${FACE_IDENTITY_LOCK}`;
  }

  const withType =
    `${basePrompt}${getEditTypeClause(editType)}`;

  // Strong multi-image instruction. Outfit transfer gets extra explicit wording
  // so Kontext actually copies the garment instead of only recoloring.
  let multiNote = "";
  if (isMulti) {
    if (isOutfitMulti) {
      multiNote =
        ` MULTI-IMAGE OUTFIT TRANSFER: Image 1 is the base person photo. Images 2-${refs.length + 1} are the OUTFIT / CLOTHING / ARMOR reference. ` +
        `Replace the clothing on the person in image 1 with the EXACT outfit, armor, costume or clothing visible in the reference image(s). ` +
        `Match colors, materials, patterns, armor plates, straps, and silhouette as closely as possible. ` +
        `Keep the person's face, identity, skin tone, hair, body pose, camera angle and background from image 1 completely unchanged. ` +
        `Do NOT copy the face or body from the reference. Only transfer the clothing/outfit.`;
    } else {
      multiNote =
        ` Use image 1 as the base photo ONLY. Preserve the exact face, identity and appearance of the person in image 1 completely unchanged. ` +
        `Images 2-${refs.length + 1} are style/outfit references ONLY — copy the style or outfit from them but NEVER copy or replace the face, skin tone, or identity from reference images. ` +
        `The output must show the same person from image 1 wearing or styled from the reference images.`;
    }
  }

  const finalPrompt =
    `${withType}${multiNote}\n\n${PRESERVATION_CONTRACT}`;

  let guidance =
    quality.guidance_scale;

  if (isFaceRelated) {
    guidance = Math.min(guidance, 2.4);
  }

  // Outfit multi needs higher CFG so the model actually follows the clothing transfer
  if (isOutfitMulti) {
    guidance = Math.max(guidance, 3.5);
  } else if (isMulti) {
    guidance = Math.max(guidance, 3.0);
  }

  const body: Record<string, unknown> = {
    prompt: finalPrompt,
    guidance_scale: guidance,
    num_images: 1,
    output_format: "png",
    safety_tolerance: "2",
    enhance_prompt: false,
  };

  // Multi schema often rejects num_inference_steps — only send on single
  if (!isMulti && quality.num_inference_steps) {
    body.num_inference_steps = quality.num_inference_steps;
  }

  if (isMulti) {
    // Multi endpoint ONLY accepts image_urls — never image_url
    body.image_urls = [imageUrl, ...refs];
  } else {
    body.image_url = imageUrl;
  }

  return {
    label:
      `edit (flux kontext${
        isMulti
          ? ` multi ×${refs.length + 1}`
          : ""
      }, ${editSize}/${editType})`,
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
    label:
      "masked inpaint (flux general)",

    model:
      IMAGE_INPAINT_MODEL,

    endpoint:
      ep(IMAGE_INPAINT_MODEL),

    outputKind: "image",

    body: {
      prompt:
        `${prompt}. Edit ONLY the white masked area. Remove the selected content completely and fill it with natural background matching the surrounding pixels. Preserve every unmasked pixel, face, object, edge, lighting, color, camera angle and composition exactly. Do not change unmasked areas. Do not add new objects or people.`,

      image_url:
        imageUrl,

      mask_url:
        maskUrl,

      strength: 0.86,
      guidance_scale: 3.5,
      num_inference_steps: 40,
      num_images: 1,
      enable_safety_checker: true,
      output_format: "png",
      scheduler: "euler",

      negative_prompt:
        "changed unmasked area, new subject, new person, distorted background, different face, different clothing, altered composition, artifacts, blur",
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
      const p =
        (prompt || "").toLowerCase();

      const isRemovePeople =
        /\b(remove people|remove person|remove all|erase person)\b/.test(
          p,
        );

      const isFaceFix =
        FACE_FIX_MATCH.test(p) ||
        classifyEdit(p) === "portrait";

      const isSmallEdit =
        SMALL_EDIT_INTENT.test(p);

      let guidance: number;
      let finalPrompt: string;

      if (isRemovePeople) {
        guidance = 4.0;

        finalPrompt =
          `${prompt}.${PEOPLE_REMOVAL_PROMPT_CLAUSE}`;
      } else if (isFaceFix) {
        guidance = 2.2;

        finalPrompt =
          `${prompt}.${FACE_EDIT_CLAUSE}${FACE_IDENTITY_LOCK}\n\n${PRESERVATION_CONTRACT}`;
      } else if (isSmallEdit) {
        guidance = 2.5;

        finalPrompt =
          `${prompt}.${PRESERVATION_CLAUSE}${FACE_IDENTITY_LOCK}`;
      } else {
        guidance = 2.8;

        finalPrompt =
          `${prompt}.${OBJECT_MODIFY_CLAUSE}${FACE_IDENTITY_LOCK}\n\n${PRESERVATION_CONTRACT}`;
      }

      return {
        workflow:
          "image-to-image",

        model:
          IMAGE_EDIT_MODEL,

        endpoint:
          ep(IMAGE_EDIT_MODEL),

        body: {
          prompt: finalPrompt,
          image_url: imageUrl,
          guidance_scale: guidance,
          num_inference_steps:
            isFaceFix ? 36 : 40,
          num_images: 1,
          output_format: "png",
          safety_tolerance: "2",
          enhance_prompt: false,
        },
      };
    }

    const steps =
      buildImageEnhancementPipeline({
        prompt,
        imageUrl,
        strength,
      });

    const primary =
      steps[0];

    return {
      workflow:
        "image-to-image",

      model:
        primary.model,

      endpoint:
        primary.endpoint,

      body:
        primary.body,
    };
  }

  return {
    workflow:
      "text-to-image",

    model:
      TEXT_TO_IMAGE_MODEL,

    endpoint:
      ep(TEXT_TO_IMAGE_MODEL),

    body: {
      prompt,

      image_size:
        imageSize ?? "square_hd",

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
  const s = Math.min(
    1,
    Math.max(0.1, strength),
  );

  const p =
    (prompt || "").toLowerCase();

  const wantsDeblur =
    /\b(deblur|remove blur|unblur|blurry|out of focus|motion blur|sharpen dramatically)\b/.test(
      p,
    );

  const wantsUpscale =
    /\b(hd|upscale|4k|8k|high res|resolution|peak detail|maximum detail|enhance detail)\b/.test(
      p,
    );

  const steps: FalStep[] = [];

  if (wantsDeblur) {
    steps.push({
      label:
        "deblur (nafnet)",

      model:
        DEBLUR_MODEL,

      endpoint:
        ep(DEBLUR_MODEL),

      outputKind:
        "image",

      body: {
        image_url:
          imageUrl,
      },
    });
  }

  const smartStrength =
    Number(
      (
        5.5 +
        (6.5 - 5.5) * s
      ).toFixed(2),
    );

  steps.push({
    label:
      "sharpen (post-processing)",

    model:
      POST_PROCESSING_MODEL,

    endpoint:
      ep(POST_PROCESSING_MODEL),

    outputKind:
      "image",

    body: {
      image_url:
        imageUrl,

      enable_sharpen:
        true,

      sharpen_mode:
        "smart",

      smart_sharpen_strength:
        smartStrength,

      cas_amount:
        1.0,

      preserve_edges:
        0.8,

      sharpen_alpha:
        2.0,
    },
  });

  if (wantsUpscale) {
    steps.push({
      label:
        "upscale (topaz)",

      model:
        UPSCALE_IMAGE_MODEL,

      endpoint:
        ep(UPSCALE_IMAGE_MODEL),

      outputKind:
        "image",

      body: {
        image_url:
          imageUrl,

        model:
          "High Fidelity V2",

        upscale_factor:
          2,

        sharpen:
          0.9,

        output_format:
          "png",
      },
    });
  }

  return steps;
}

export const TEXT_TO_VIDEO_MODELS: Record<
  VideoModelTier,
  string
> = {
  standard:
    "fal-ai/kling-video/v1.6/standard/text-to-video",

  pro:
    "fal-ai/kling-video/v1.6/pro/text-to-video",

  master:
    "fal-ai/kling-video/v2.1/master/text-to-video",
};

export const IMAGE_TO_VIDEO_MODELS: Record<
  VideoModelTier,
  string
> = {
  standard:
    "fal-ai/kling-video/v1.6/standard/image-to-video",

  pro:
    "fal-ai/kling-video/v1.6/pro/image-to-video",

  master:
    "fal-ai/kling-video/v2.1/master/image-to-video",
};

export const TEXT_TO_VIDEO_MODEL =
  TEXT_TO_VIDEO_MODELS.standard;

export const IMAGE_TO_VIDEO_MODEL =
  IMAGE_TO_VIDEO_MODELS.standard;

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
  const tier =
    modelTierForDuration(
      durationSeconds,
    );

  const model =
    TEXT_TO_VIDEO_MODELS[tier];

  return {
    label:
      `text-to-video (kling ${tier})`,

    model,

    endpoint:
      ep(model),

    outputKind:
      "video",

    body: {
      prompt,

      negative_prompt:
        VIDEO_NEGATIVE_PROMPT,

      duration:
        String(durationSeconds),

      aspect_ratio:
        aspectRatio,
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
  const tier =
    modelTierForDuration(
      durationSeconds,
    );

  const model =
    IMAGE_TO_VIDEO_MODELS[tier];

  return {
    label:
      `image-to-video (kling ${tier})`,

    model,

    endpoint:
      ep(model),

    outputKind:
      "video",

    body: {
      prompt,

      image_url:
        imageUrl,

      negative_prompt:
        VIDEO_NEGATIVE_PROMPT,

      duration:
        String(durationSeconds),

      aspect_ratio:
        aspectRatio,
    },
  };
}

export function buildVideoEnhancement({
  videoUrl,
}: {
  videoUrl: string;
}): FalStep {
  return {
    label:
      "upscale (topaz video)",

    model:
      UPSCALE_VIDEO_MODEL,

    endpoint:
      ep(UPSCALE_VIDEO_MODEL),

    outputKind:
      "video",

    body: {
      video_url:
        videoUrl,

      model:
        "Artemis HQ",

      upscale_factor:
        2,
    },
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
    label:
      `quality upscale ${factor}x (topaz)`,

    model:
      UPSCALE_IMAGE_MODEL,

    endpoint:
      ep(UPSCALE_IMAGE_MODEL),

    outputKind:
      "image",

    body: {
      image_url:
        imageUrl,

      model:
        "High Fidelity V2",

      upscale_factor:
        factor,

      sharpen:
        0.85,

      output_format:
        "png",
    },
  };
}
