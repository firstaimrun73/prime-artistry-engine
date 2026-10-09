/**
 * Build fal request bodies for locked Standard models.
 * Never reorder multi-image URLs. Never drop the source image for I2I.
 * enhance_prompt is always false — do not silently rewrite user prompts.
 *
 * Multi (2+ images) → GPT Image 2 edit @ quality low only.
 */

import { buildGptImage2MultiStep } from "@/lib/studio/image/gpt-image-2";
import {
  classifyEdit,
  classifyEditSize,
  isExplicitSharpenIntent,
} from "@/lib/image-edit/classify";
import {
  STANDARD_MODELS,
  kleinImageSize,
  standardTextToImageModel,
} from "./models";
import type { StandardFalStep, StandardValidationOk } from "./types";

/**
 * Strong identity-preservation contract for Standard single-image I2I (Kontext Pro).
 * Appended after the user request so the model keeps the same person while applying only the requested change.
 */
export const STANDARD_I2I_IDENTITY_PRESERVATION =
  "Preserve the exact identity of every person in the source image: same person, facial structure, eyes, nose, mouth, skin tone, age appearance and hair. Do not replace, redesign, or invent faces. Only change the specific thing requested by the user. If the user explicitly requests a face/expression change, keep the same person's identity and change only that requested attribute.";

/**
 * Identity rule for Standard multi-image (GPT Image 2): image 1 is the base person/source.
 */
export const STANDARD_MULTI_IDENTITY_PRESERVATION =
  "Image 1 is the base/source person. Preserve the identity and face of every person in image 1 (same person, facial structure, eyes, nose, mouth, skin tone, age appearance and hair). References may influence the requested object, outfit, style, or other attributes only. Never copy a different person's face from a reference onto the base person unless the user explicitly asks for a face or identity replacement. Keep all unrequested subjects and scene details unchanged as much as possible.";

/**
 * Active restoration contract — must drive real repair work, not a no-op copy of the input.
 * Does not auto-colorize B&W unless the user asked for colorization.
 */
export const STANDARD_RESTORE_INSTRUCTION =
  "ACTIVE RESTORATION: Repair degradation in this photograph. Repair scratches, tears, stains, and damage. Reduce fading, noise, and blur. Recover detail where possible and reconstruct damaged areas faithfully. Improve natural contrast and color balance when appropriate. Preserve original composition and camera framing. Do not creatively reinterpret the scene. Do not colorize a black-and-white image unless the user explicitly asked for colorization. Preserve the exact identity of every person.";

/**
 * Active sharpen/enhance — must produce a visibly clearer result, not a near-copy.
 * Kontext tends to under-edit pure quality requests when identity lock is strong;
 * this instruction is intentionally forceful about edge clarity and micro-detail.
 */
export const STANDARD_ENHANCE_INSTRUCTION =
  "ACTIVE SHARPEN AND ENHANCE: Make this photo visibly sharper and clearer. Increase edge definition and micro-detail on faces, hair, fabric, and textures. Reduce blur, softness, and haze. Improve local contrast so details read crisp at 100% zoom. Do not leave the image looking the same softness as the input. Do not change identity, pose, composition, colors, or add new objects. Photorealistic only — no oversharpen halos or artificial look.";

export const STANDARD_OUTFIT_INSTRUCTION =
  "Change the clothing/outfit on the person as requested. Do not keep the original clothes when the user asked to change them. Keep face, identity, pose, and background the same unless asked otherwise.";

export const STANDARD_BACKGROUND_INSTRUCTION =
  "Change ONLY the background as requested. Keep subject edges, body, and identity unchanged.";

export const STANDARD_REMOVAL_INSTRUCTION =
  "Remove only the requested object or person. Fill the area naturally with surrounding background. Preserve all other subjects and identity.";

export const STANDARD_COLOR_INSTRUCTION =
  "Adjust only the requested color or lighting. Keep subjects, composition, and identity unchanged.";

export const STANDARD_FACE_EDIT_INSTRUCTION =
  "Apply only the requested face, expression, or skin change. Keep the same person's identity and facial structure; change only the requested attribute.";

export function isStandardEnhanceIntent(prompt: string): boolean {
  const p = prompt || "";
  const editSize = classifyEditSize(p);
  const editType = classifyEdit(p);

  // Never steal restore / outfit / removal / background as "enhance"
  if (editSize === "restore" || editType === "restore") return false;
  if (editSize === "outfit" || editType === "outfit") return false;
  if (editSize === "remove_people" || editType === "removal") return false;
  if (editSize === "background" || editType === "background") return false;

  // Face-primary edits stay face unless user also asked to sharpen explicitly
  if ((editSize === "face_fix" || editType === "portrait") && !isExplicitSharpenIntent(p)) {
    return false;
  }

  if (editType === "enhance") return true;
  if (isExplicitSharpenIntent(p)) return true;
  return false;
}

function buildStandardI2ICorePrompt(raw: string): string {
  const editSize = classifyEditSize(raw);
  const editType = classifyEdit(raw);
  const enhanceIntent = isStandardEnhanceIntent(raw);

  // Restoration must be active — not a preserve-only no-op.
  if (editSize === "restore" || editType === "restore") {
    return `${raw}\n\n${STANDARD_RESTORE_INSTRUCTION}`;
  }
  // Semantic edits first so enhance does not swallow outfit/bg/face/remove
  if (editSize === "outfit" || editType === "outfit") {
    return `${raw}\n\n${STANDARD_OUTFIT_INSTRUCTION}`;
  }
  if (editSize === "background" || editType === "background") {
    return `${raw}\n\n${STANDARD_BACKGROUND_INSTRUCTION}`;
  }
  if (editSize === "remove_people" || editType === "removal") {
    return `${raw}\n\n${STANDARD_REMOVAL_INSTRUCTION}`;
  }
  if ((editSize === "face_fix" || editType === "portrait") && !enhanceIntent) {
    return `${raw}\n\n${STANDARD_FACE_EDIT_INSTRUCTION}`;
  }
  if (enhanceIntent) {
    return `${raw}\n\n${STANDARD_ENHANCE_INSTRUCTION}`;
  }
  if (editType === "color") {
    return `${raw}\n\n${STANDARD_COLOR_INSTRUCTION}`;
  }

  // Generic edit: keep mild framing if the user did not use an action verb.
  if (/\b(edit|enhance|sharpen|brighten|clear|fix|improve|make|change|remove|add|restore|repair)\b/i.test(raw)) {
    return raw;
  }
  return `Edit this photo: ${raw}. Keep the same scene, layout, and subjects.`;
}

export function buildTextToImageStep(req: StandardValidationOk): StandardFalStep {
  const model = standardTextToImageModel(req.imageQuality);
  return {
    label: `standard T2I ${req.imageQuality === "hd" ? "HD klein-9b" : "SD klein-4b"}`,
    model,
    body: {
      prompt: req.prompt,
      image_size: kleinImageSize(req.aspectRatio, req.imageQuality),
      num_images: 1,
      num_inference_steps: 4,
      enable_safety_checker: true,
      output_format: "png",
    },
  };
}

/**
 * Standard single-image edit via FLUX.1 Kontext [pro].
 * This is an instruction-following editor (not Flux Dev denoise/style-transfer).
 * Do NOT use strength — Kontext does not take a denoise strength parameter.
 * Always send the real HTTPS image_url.
 * Always append identity-preservation contract; never enable enhance_prompt.
 * Restore/enhance/outfit/etc. get active intent instructions via existing classifiers.
 */
export function buildImageToImageStep(req: StandardValidationOk): StandardFalStep {
  if (!req.imageUrl || !req.imageUrl.startsWith("https://")) {
    throw new Error("Image → Image requires a valid HTTPS source image URL.");
  }
  const raw = req.prompt.trim();
  const core = buildStandardI2ICorePrompt(raw);
  const prompt = `${core}\n\n${STANDARD_I2I_IDENTITY_PRESERVATION}`;
  const enhanceIntent = isStandardEnhanceIntent(raw);
  // Slightly higher guidance so sharpen/enhance instructions are followed more strongly.
  const guidance_scale = enhanceIntent ? 4.2 : 3.5;

  return {
    label: `standard I2I kontext-pro ${req.imageQuality === "hd" ? "HD" : "SD"}`,
    model: STANDARD_MODELS.imageToImage,
    body: {
      prompt,
      image_url: req.imageUrl,
      guidance_scale,
      num_images: 1,
      output_format: "png",
      safety_tolerance: "2",
      enhance_prompt: false,
    },
  };
}

/**
 * Multi: image_urls = [base, ref1, ref2, ...] in exact upload order.
 * GPT Image 2 quality hard-locked to low.
 * Prompt includes base-person identity protection so references cannot replace faces.
 */
export function buildMultiImageStep(req: StandardValidationOk): StandardFalStep {
  if (!req.imageUrl) {
    throw new Error("Multiple Image requires a base image.");
  }
  const refs = req.referenceImageUrls;
  const image_urls = [req.imageUrl, ...refs];
  if (image_urls.length < 2 || image_urls.length > 5) {
    throw new Error("Multiple Image requires 2–5 total images.");
  }

  const userPrompt = req.prompt.trim();
  const promptWithIdentity = `${userPrompt}\n\n${STANDARD_MULTI_IDENTITY_PRESERVATION}`;

  const step = buildGptImage2MultiStep({
    prompt: promptWithIdentity,
    imageUrls: image_urls,
    outputClass: req.imageQuality === "hd" ? "hd" : "sd",
    aspectRatio: req.aspectRatio,
    experience: "standard",
  });

  return {
    label: step.label,
    model: step.model,
    body: step.body as Record<string, unknown>,
  };
}

export function buildCircleRemoveStep(req: StandardValidationOk): StandardFalStep {
  if (!req.imageUrl || !req.maskImageUrl) {
    throw new Error("Circle remove requires original image and mask.");
  }
  return {
    label: "standard circle-to-remove (flux erase)",
    model: STANDARD_MODELS.circleToRemove,
    body: {
      image_url: req.imageUrl,
      mask_url: req.maskImageUrl,
      prompt:
        req.prompt ||
        "Remove the masked region and fill naturally with surrounding background. Preserve all unmasked pixels.",
    },
  };
}

/**
 * Circle Add — fal-ai/flux-pro/v1/fill ONLY (do not change Remove path).
 *
 * WHY NOT flux-general/inpainting:
 *   that endpoint takes a global `strength` (0=keep, 1=remake whole image) and does not
 *   hard-lock edits to the mask. Users saw garbage outside / instead of the painted region.
 *
 * flux-pro/v1/fill is the mask-native sibling of flux-pro/v1/erase (Remove):
 *   WHITE = inpaint / edit, BLACK = preserve, mask dims must match image dims.
 * Prompt is server-resolved from asset registry (never trust client object identity).
 */
export function buildCircleAddStep(req: StandardValidationOk): StandardFalStep {
  if (!req.imageUrl || !req.maskImageUrl) {
    throw new Error("Circle add requires original image and mask.");
  }
  const userPrompt = (req.prompt || "").trim();
  // Keep prompt focused on WHAT to put in the white region; WHERE is the mask.
  const prompt = userPrompt
    ? userPrompt
    : "Fill the white masked region with exactly one realistic object that fits the scene. Leave every black pixel unchanged.";

  if (process.env.NODE_ENV !== "production") {
    console.log("[CIRCLE ADD] modelRequest", {
      operation: "circle_add",
      model: STANDARD_MODELS.circleToAdd,
      promptLen: prompt.length,
      promptHead: prompt.slice(0, 160),
      imageUrlPresent: !!req.imageUrl,
      maskUrlPresent: !!req.maskImageUrl,
      note: "WHITE=edit BLACK=preserve; no strength param (mask-native fill)",
    });
  }

  return {
    label: "standard circle-to-add (flux-pro fill)",
    model: STANDARD_MODELS.circleToAdd,
    body: {
      prompt,
      image_url: req.imageUrl,
      mask_url: req.maskImageUrl,
      num_images: 1,
      output_format: "png",
      safety_tolerance: "2",
      enhance_prompt: false,
    },
  };
}

export function buildStandardStep(req: StandardValidationOk): StandardFalStep {
  switch (req.mode) {
    case "text_to_image":
      return buildTextToImageStep(req);
    case "image_to_image":
      return buildImageToImageStep(req);
    case "multi_image_to_image":
      return buildMultiImageStep(req);
    case "circle_to_remove":
      return buildCircleRemoveStep(req);
    case "circle_to_add":
      return buildCircleAddStep(req);
    default: {
      const _exhaustive: never = req.mode;
      throw new Error(`Unknown Standard mode: ${String(_exhaustive)}`);
    }
  }
}
