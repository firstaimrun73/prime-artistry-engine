/**
 * Motio2edit Image Editor — Prompt Understander & Expander (core algorithm)
 *
 * Single source of truth for intent classification and prompt expansion.
 * Used by generate.functions.ts. Do not duplicate classify/lock logic elsewhere.
 */

export type EditorIntent =
  | "pure_enhance"
  | "remove_people"
  | "outfit_transfer"
  | "outfit_single"
  | "face_fix"
  | "background"
  | "small_add"
  | "object_remove"
  | "add_subject"
  | "restore"
  | "colorize"
  | "style"
  | "color"
  | "general_edit";

const QUALITY_ONLY =
  /\b(enhance|enhanced|enhancement|sharpen|sharpened|sharper|sharpness|clarity|hd|uhd|4k|8k|upscale|upscaled|upscaling|resolution|detail|details|detailed|quality|deblur|unblur|denoise|noise|crisp|crisper|clear|clearer|professional\s+hd|improve\s+quality|make\s+(it\s+)?(clear|sharp|crisp))\b/i;

const REMOVE_PEOPLE =
  /\b(remove\s+(people|person|persons|humans?|human|everyone|all)|erase\s+(person|people)|delete\s+(person|people)|remove\s+the\s+(guy|man|woman|person)|edit\s+out\s+(the\s+)?(person|people|man|woman))\b/i;

const OUTFIT =
  /\b(outfit|clothing|clothes|cloth|dress|shirt|jacket|armor|armour|costume|suit|wear|wearing|change\s+the\s+outfit|replace\s+outfit|swap\s+outfit|put\s+on|dress\s+(him|her|them)|clothes\s+from|from\s+the\s+ref|from\s+ref|reference\s+(img|image)|refrence|add\s+the\s+clothes|transfer\s+(the\s+)?(outfit|clothes|clothing)|swap\s+(the\s+)?(clothes|outfit)|wear\s+the)\b/i;

const FACE =
  /\b(fix\s+(eye|eyes|face|mouth|nose|teeth|skin)|face\s+fix|make\s+(her|him|them)?\s*(smile|younger|older)|change\s+(expression|face|eyes|skin|hair)|younger|older|wrinkle|smooth\s+skin|beauty|retouch|skin\s+tone|makeup|lipstick|beard|mustache)\b/i;

const BACKGROUND =
  /\b(remove\s+background|change\s+background|replace\s+background|new\s+background|blur\s+background|bokeh)\b/i;

const OBJECT_REMOVE =
  /\b(remove\s+(object|watermark|logo|text|sign|car|bike|bag|bottle)|erase\s+object|delete\s+object)\b/i;

const ADD_SUBJECT =
  /\b(add\s+(a\s+|the\s+)?(person|man|woman|people|human|subject|figure)|include\s+(a\s+|the\s+)?(person|man|woman)|put\s+(a\s+|the\s+)?(person|man|woman)\s+in)\b/i;

const RESTORE =
  /\b(restore|repair|fix\s+(photo|image|picture)|photo\s+restoration|damaged|scratched|faded)\b/i;

const COLORIZE =
  /\b(colorize|colourise|add\s+colou?r|black\s+and\s+white\s+to\s+colou?r|b\s*&\s*w\s+to\s+colou?r)\b/i;

const SMALL_ADD =
  /\b(add|put|wear|place|insert|give|attach)\b[^.]{0,40}\b(goggles|glasses|sunglasses|hat|cap|mask|beard|mustache|smile|earring|necklace|crown|scarf|tie|accessory|tattoo|makeup|helmet)\b/i;

const STYLE =
  /\b(cartoon|anime|painting|sketch|watercolor|artistic|cinematic|vintage|retro|style\s+transfer)\b/i;

const COLOR =
  /\b(brighten|darken|contrast|colou?r|saturation|warm|cool|relight|exposure)\b/i;

export function understandIntent(
  rawPrompt: string,
  hasReferenceImages: boolean,
): EditorIntent {
  const p = (rawPrompt || "").trim();
  if (!p) return "general_edit";

  if (REMOVE_PEOPLE.test(p)) return "remove_people";
  if (ADD_SUBJECT.test(p)) return "add_subject";
  if (OUTFIT.test(p) && hasReferenceImages) return "outfit_transfer";
  if (OUTFIT.test(p)) return "outfit_single";
  if (RESTORE.test(p)) return "restore";
  if (COLORIZE.test(p)) return "colorize";
  if (FACE.test(p)) return "face_fix";
  if (BACKGROUND.test(p)) return "background";
  if (OBJECT_REMOVE.test(p)) return "object_remove";
  if (SMALL_ADD.test(p)) return "small_add";
  if (STYLE.test(p)) return "style";
  if (COLOR.test(p) && !QUALITY_ONLY.test(p)) return "color";

  if (QUALITY_ONLY.test(p)) {
    if (REMOVE_PEOPLE.test(p) || OBJECT_REMOVE.test(p) || OUTFIT.test(p) || FACE.test(p)) {
      return "general_edit";
    }
    return "pure_enhance";
  }

  return "general_edit";
}

export function isPureEnhanceIntent(rawPrompt: string): boolean {
  return understandIntent(rawPrompt, false) === "pure_enhance";
}

export function isOutfitIntent(prompt: string): boolean {
  return OUTFIT.test(prompt || "");
}

export const LOCKS = {
  pure_enhance:
    "This is a real photograph. ONLY improve sharpness, clarity, detail and noise reduction. " +
    "Do NOT remove any person, object, or element. Do NOT add anything. Do NOT change composition, " +
    "colors, lighting direction, or subject identity. Keep every pixel content identical except quality.",

  outfit_transfer:
    "This is a real photograph clothing transfer. Image 1 = person (base). Reference image(s) = target outfit. " +
    "REPLACE all clothing on the person in image 1 with the EXACT outfit from the reference. " +
    "Match colors, materials, patterns, silhouette, armor, straps. Keep face, identity, hair, skin, " +
    "body pose, camera angle and background from image 1. Do NOT copy face or body from reference. " +
    "Do NOT keep the original clothes.",

  outfit_single:
    "This is a real photograph clothing edit. Change the clothing/outfit as requested. " +
    "Keep face, identity, hair, pose and background the same. New clothes must look natural and photorealistic.",

  remove_people:
    "This is a real photograph. Completely remove the requested person/people including faces, bodies, " +
    "clothing, shadows. Reconstruct background matching texture and lighting. Keep all non-human content. " +
    "Photorealistic. Do not add replacement people.",

  face_fix:
    "This is a real photograph face/skin edit. Apply ONLY the requested face or skin change. " +
    "Same individual — identical facial structure and identity. Do not redesign the face.",

  background:
    "This is a real photograph. Change ONLY the background as requested. Keep subject edges, identity " +
    "and lighting on the subject identical.",

  object_remove:
    "This is a real photograph. Remove only the specified object. Fill the area naturally. Keep everything else identical.",

  add_subject:
    "This is a real photograph. Add the requested subject naturally into the scene. Match lighting, perspective and scale. Keep existing people and background otherwise unchanged.",

  restore:
    "This is a real photograph restoration. Repair damage, scratches, fade and noise. Preserve original subjects, composition and colors. Photorealistic.",

  colorize:
    "This is a real photograph. Add natural realistic colors. Keep shapes, subjects and composition identical.",

  general:
    "This is a real photograph. Preserve exact person identity (face, skin, hair). " +
    "Only make the specific requested change. Keep photorealistic. No cartoon/anime.",
} as const;

export function expandPromptDeterministic(
  rawPrompt: string,
  intent: EditorIntent,
  referenceCount: number,
): string {
  const p = (rawPrompt || "").trim();
  const n = Math.max(1, referenceCount);

  switch (intent) {
    case "pure_enhance":
      return (
        "Enhance this exact photo: increase sharpness, clarity and fine detail, reduce noise and mild blur, " +
        "improve overall professional quality. Keep composition, every person, every object, colors and framing " +
        "identical — do not add, remove or change any content."
      );

    case "outfit_transfer":
      return (
        `PRIMARY TASK — OUTFIT TRANSFER: Image 1 is the person (base). Images 2-${n + 1} show the TARGET clothing/outfit/armor. ` +
        `Replace ALL clothing on the person in image 1 with the EXACT outfit from the reference image(s). ` +
        `Match colors, materials, patterns, silhouette, armor plates and straps as closely as possible. ` +
        `Keep the person's FACE, identity, skin, hair, body pose, camera angle and BACKGROUND from image 1. ` +
        `Do NOT copy the face or body from the reference. Only transfer clothing. ` +
        `User request: ${p}`
      );

    case "outfit_single":
      return (
        `Change the clothing/outfit on the person as requested: ${p}. ` +
        `Keep face, identity, pose and background the same. New clothes must look natural and photorealistic.`
      );

    case "remove_people":
      return (
        `Completely remove the target person or all visible people from this photo. ` +
        `Erase faces, bodies, clothing, hair, limbs, shadows. Reconstruct background matching texture, lighting and perspective. ` +
        `Keep non-human content. Photorealistic. User: ${p}`
      );

    case "face_fix":
      return `Apply only the requested face/skin/expression change: ${p}. Same individual as input — same facial structure and identity.`;

    case "background":
      return `Change only the background as requested: ${p}. Subject edges and identity unchanged.`;

    case "object_remove":
      return `Remove only the specified object: ${p}. Fill naturally. Keep everything else identical.`;

    case "add_subject":
      return `Add the requested subject into this photo naturally: ${p}. Match lighting and perspective. Keep existing content otherwise unchanged.`;

    case "restore":
      return `Restore and repair this photo: ${p}. Fix damage, scratches, fade and noise. Preserve subjects and composition.`;

    case "colorize":
      return `Colorize this photo with natural realistic colors: ${p}. Keep shapes and subjects identical.`;

    default:
      return p;
  }
}

export function buildFinalEditPrompt(args: {
  rawPrompt: string;
  enhancedOrExpanded: string;
  intent: EditorIntent;
  referenceCount: number;
}): string {
  const { rawPrompt, enhancedOrExpanded, intent } = args;

  const lockKey =
    intent === "outfit_transfer" ? "outfit_transfer"
    : intent === "outfit_single" ? "outfit_single"
    : intent === "remove_people" ? "remove_people"
    : intent === "face_fix" ? "face_fix"
    : intent === "background" ? "background"
    : intent === "pure_enhance" ? "pure_enhance"
    : intent === "object_remove" ? "object_remove"
    : intent === "add_subject" ? "add_subject"
    : intent === "restore" ? "restore"
    : intent === "colorize" ? "colorize"
    : "general";

  const lock = LOCKS[lockKey];

  if (intent === "outfit_transfer") {
    return (
      `${LOCKS.outfit_transfer}\n` +
      `User request: ${rawPrompt || enhancedOrExpanded}.\n` +
      `OUTPUT: photorealistic edited photo. Same person as image 1, new clothes from reference. No watermark, no text overlay.`
    );
  }

  if (intent === "pure_enhance") {
    return `${LOCKS.pure_enhance}\n${enhancedOrExpanded}\nDo NOT remove any person or object.`;
  }

  return (
    `${lock}\n` +
    `${enhancedOrExpanded}\n` +
    `Only change what was requested. Keep unmentioned areas identical. Photorealistic. No watermark.`
  );
}

export function getIntentSettings(intent: EditorIntent): {
  guidance_scale: number;
  num_inference_steps: number;
} {
  switch (intent) {
    case "pure_enhance":
      return { guidance_scale: 2.5, num_inference_steps: 36 };
    case "remove_people":
      return { guidance_scale: 4.0, num_inference_steps: 50 };
    case "outfit_transfer":
      return { guidance_scale: 4.0, num_inference_steps: 44 };
    case "outfit_single":
      return { guidance_scale: 3.6, num_inference_steps: 42 };
    case "face_fix":
      return { guidance_scale: 2.2, num_inference_steps: 36 };
    case "background":
      return { guidance_scale: 3.5, num_inference_steps: 45 };
    case "small_add":
      return { guidance_scale: 2.6, num_inference_steps: 40 };
    case "object_remove":
      return { guidance_scale: 3.8, num_inference_steps: 45 };
    case "add_subject":
      return { guidance_scale: 3.5, num_inference_steps: 42 };
    case "restore":
      return { guidance_scale: 2.8, num_inference_steps: 40 };
    case "colorize":
      return { guidance_scale: 3.0, num_inference_steps: 40 };
    case "style":
      return { guidance_scale: 3.5, num_inference_steps: 45 };
    default:
      return { guidance_scale: 3.2, num_inference_steps: 42 };
  }
}
