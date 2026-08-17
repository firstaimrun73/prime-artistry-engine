/**
 * Motio2edit Image Editor — Prompt Understander & Expander (core algorithm)
 *
 * This is the SINGLE source of truth for:
 * 1. Understanding what the user actually wants (enhance vs remove vs outfit vs general edit)
 * 2. Expanding short prompts into model-ready instructions
 * 3. Choosing the correct lock / preservation rules so the model does NOT invent changes
 *
 * Used by generate.functions.ts and fal-request builders.
 * Do NOT duplicate classify / lock logic elsewhere — import from here.
 */

export type EditorIntent =
  | "pure_enhance"      // sharpen / clarity / HD only — NEVER invent objects or remove people
  | "remove_people"
  | "outfit_transfer"   // multi-image clothing / armor from reference
  | "outfit_single"     // single-image clothing change from text
  | "face_fix"
  | "background"
  | "small_add"
  | "object_remove"
  | "style"
  | "color"
  | "general_edit";

const QUALITY_ONLY =
  /\b(enhance|enhanced|enhancement|sharpen|sharpened|sharper|sharpness|clarity|hd|uhd|4k|8k|upscale|upscaled|upscaling|resolution|detail|details|detailed|quality|deblur|unblur|denoise|noise|crisp|crisper|clear|clearer|professional\s+hd|improve\s+quality|make\s+(it\s+)?(clear|sharp|crisp))\b/i;

const REMOVE_PEOPLE =
  /\b(remove\s+(people|person|persons|humans?|human|everyone|all)|erase\s+(person|people)|delete\s+(person|people)|remove\s+the\s+(guy|man|woman|person))\b/i;

const OUTFIT =
  /\b(outfit|clothing|clothes|cloth|dress|shirt|jacket|armor|armour|costume|suit|wear|wearing|change\s+the\s+outfit|replace\s+outfit|swap\s+outfit|put\s+on|dress\s+(him|her|them)|clothes\s+from|from\s+the\s+ref|from\s+ref|reference\s+(img|image)|refrence|add\s+the\s+clothes|transfer\s+(the\s+)?(outfit|clothes|clothing)|swap\s+(the\s+)?(clothes|outfit)|wear\s+the)\b/i;

const FACE =
  /\b(fix\s+(eye|eyes|face|mouth|nose|teeth|skin)|face\s+fix|make\s+(her|him|them)?\s*(smile|younger|older)|change\s+(expression|face|eyes|skin|hair)|younger|older|wrinkle|smooth\s+skin|beauty|retouch|skin\s+tone|makeup|lipstick|beard|mustache)\b/i;

const BACKGROUND =
  /\b(remove\s+background|change\s+background|replace\s+background|new\s+background|blur\s+background|bokeh)\b/i;

const OBJECT_REMOVE =
  /\b(remove\s+(object|watermark|logo|text|sign|car|bike|bag|bottle)|erase\s+object|delete\s+object)\b/i;

const SMALL_ADD =
  /\b(add|put|wear|place|insert|give|attach)\b[^.]{0,40}\b(goggles|glasses|sunglasses|hat|cap|mask|beard|mustache|smile|earring|necklace|crown|scarf|tie|accessory|tattoo|makeup|helmet)\b/i;

const STYLE =
  /\b(cartoon|anime|painting|sketch|watercolor|artistic|cinematic|vintage|retro|style\s+transfer)\b/i;

const COLOR =
  /\b(brighten|darken|contrast|colou?r|saturation|warm|cool|relight|exposure)\b/i;

/**
 * Understand the user's real intent from the ORIGINAL prompt (before auto-enhance).
 * This drives path selection: pure enhance → post-processing only; outfit → multi transfer; etc.
 */
export function understandIntent(
  rawPrompt: string,
  hasReferenceImages: boolean,
): EditorIntent {
  const p = (rawPrompt || "").trim();
  if (!p) return "general_edit";

  if (REMOVE_PEOPLE.test(p)) return "remove_people";
  if (OUTFIT.test(p) && hasReferenceImages) return "outfit_transfer";
  if (OUTFIT.test(p)) return "outfit_single";
  if (FACE.test(p)) return "face_fix";
  if (BACKGROUND.test(p)) return "background";
  if (OBJECT_REMOVE.test(p)) return "object_remove";
  if (SMALL_ADD.test(p)) return "small_add";
  if (STYLE.test(p)) return "style";
  if (COLOR.test(p) && !QUALITY_ONLY.test(p)) return "color";

  // Pure enhance: quality words dominate and no strong edit verbs about people/objects
  if (QUALITY_ONLY.test(p)) {
    // Reject if user also asked to remove/add specific things
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

/** Locks — short and non-conflicting. Never stack walls of "change nothing". */
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

  general:
    "This is a real photograph. Preserve exact person identity (face, skin, hair). " +
    "Only make the specific requested change. Keep photorealistic. No cartoon/anime.",
} as const;

/**
 * Expand a short user prompt into a clear, model-ready instruction.
 * Deterministic first; no network required for common cases.
 */
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
      return (
        `Apply only the requested face/skin/expression change: ${p}. ` +
        `Same individual as input — same facial structure and identity.`
      );

    case "background":
      return (
        `Change only the background as requested: ${p}. ` +
        `Subject edges and identity unchanged.`
      );

    default:
      return p;
  }
}

/**
 * Build the final prompt sent to Kontext (or multi).
 * Order matters: transfer instruction FIRST for outfit multi so it is not buried.
 */
export function buildFinalEditPrompt(args: {
  rawPrompt: string;
  enhancedOrExpanded: string;
  intent: EditorIntent;
  referenceCount: number;
}): string {
  const { rawPrompt, enhancedOrExpanded, intent, referenceCount } = args;
  const lock = LOCKS[intent === "outfit_transfer" ? "outfit_transfer"
    : intent === "outfit_single" ? "outfit_single"
    : intent === "remove_people" ? "remove_people"
    : intent === "face_fix" ? "face_fix"
    : intent === "background" ? "background"
    : intent === "pure_enhance" ? "pure_enhance"
    : "general"];

  if (intent === "outfit_transfer") {
    // Transfer instruction dominates; short user line; identity only (not clothing)
    return (
      `${LOCKS.outfit_transfer}\n` +
      `User request: ${rawPrompt || enhancedOrExpanded}.\n` +
      `OUTPUT: photorealistic edited photo. Same person as image 1, new clothes from reference. No watermark, no text overlay.`
    );
  }

  if (intent === "pure_enhance") {
    return `${LOCKS.pure_enhance}\n${enhancedOrExpanded}\nDo NOT remove any person or object.`;
  }

  // General path: lock + instruction. Avoid stacking huge preservation contracts.
  return (
    `${lock}\n` +
    `${enhancedOrExpanded}\n` +
    `Only change what was requested. Keep unmentioned areas identical. Photorealistic. No watermark.`
  );
}

/** Quality / guidance settings tuned per intent. */
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
    case "style":
      return { guidance_scale: 3.5, num_inference_steps: 45 };
    default:
      return { guidance_scale: 3.2, num_inference_steps: 42 };
  }
}
