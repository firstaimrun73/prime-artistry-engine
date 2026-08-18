/**
 * Motio2edit Image Editor — Prompt Understander & Expander (core algorithm)
 *
 * SINGLE source of truth for:
 * 1. Understanding user intent (enhance vs remove vs add vs restore vs outfit…)
 * 2. Expanding short prompts into model-ready instructions
 * 3. Lock / preservation rules so the model does NOT invent unrelated changes
 *
 * Used by generate.functions.ts and fal-request builders.
 */

export type EditorIntent =
  | "pure_enhance"
  | "remove_people"
  | "object_remove"
  | "add_subject"
  | "restore"
  | "colorize"
  | "outfit_transfer"
  | "outfit_single"
  | "face_fix"
  | "background"
  | "small_add"
  | "style"
  | "color"
  | "general_edit";

const QUALITY_ONLY =
  /\b(enhance|enhanced|enhancement|sharpen|sharpened|sharper|sharpness|clarity|hd|uhd|4k|8k|upscale|upscaled|upscaling|resolution|detail|details|detailed|quality|deblur|unblur|denoise|noise|crisp|crisper|clearer|professional\s+hd|improve\s+quality|make\s+(it\s+)?(sharp|crisp))\b/i;

/** Natural-language person removal: edit out, take out, remove the girl/guy… */
const REMOVE_PEOPLE =
  /\b((edit|cut|take|paint)\s+out|(remove|erase|delete|get\s+rid\s+of|take\s+away)\s+(the\s+)?(people|person|persons|humans?|human|everyone|all|girl|boy|guy|man|woman|lady|gentleman|kid|child|children|someone|somebody|figure|photobomber)|(remove|erase|delete)\s+(people|person|persons)|(remove|erase)\s+the\s+(guy|man|woman|person|girl|boy))\b/i;

/** Glare, reflection, hotspot cleanup */
const GLARE_CLEANUP =
  /\b(glare|glares|reflection|reflections|lens\s+flare|flash\s+(spot|glare|reflection)|hot\s*spot|specular|shiny\s+spot|light\s+spot\s+on\s+(glasses|face|skin))\b/i;

/** Object / element removal (non-person) */
const OBJECT_REMOVE =
  /\b((remove|erase|delete|edit\s+out|take\s+out|get\s+rid\s+of)\s+(the\s+)?(object|objects|watermark|logo|text|sign|car|bike|bag|bottle|pole|wire|cable|trash|litter|shadow|stain|spot|mark|blemish)|(remove|erase)\s+object)\b/i;

/** Old photo restoration + quality recovery */
const RESTORE =
  /\b(restor(e|ation|ing)?|repair(ed|ing)?\s+(photo|image|picture)|fix\s+(this\s+)?(old|damaged|faded|torn)|damaged\s+photo|faded\s+photo|scratched|tears?|creases?|old\s+(photo|photograph|picture)|vintage\s+photo|make\s+(it\s+)?(clear|clearer|sharp)\s+and\s+(restor|coloriz|colouriz)|revive\s+(this\s+)?(photo|picture))\b/i;

/** Colorize B&W / sepia */
const COLORIZE =
  /\b(coloriz(e|ed|ing|ation)?|colouriz(e|ed|ing|ation)?|add\s+colou?r|bring\s+(to\s+)?(life|colou?r)|black\s+and\s+white\s+to\s+colou?r|b\s*&\s*w\s+to\s+colou?r|sepia\s+to\s+colou?r)\b/i;

/** Add / insert a person or named subject into the scene */
const ADD_SUBJECT =
  /\b((add|include|insert|put|place|bring)\s+(in\s+)?(a\s+|the\s+|my\s+)?[\w\s.'-]{0,40}(person|people|man|woman|guy|girl|boy|lady|celebrity|player|athlete|character|figure)|(add|include|insert|put)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?|(include|add|put|insert)\s+[\w\s.'-]{2,40}\s+(to|into|in)\s+(this|the|my)\s+(picture|photo|image|shot))\b/i;

const OUTFIT =
  /\b(outfit|clothing|clothes|cloth|dress|shirt|jacket|armor|armour|costume|suit|wear|wearing|change\s+the\s+outfit|replace\s+outfit|swap\s+outfit|put\s+on|dress\s+(him|her|them)|clothes\s+from|from\s+the\s+ref|from\s+ref|reference\s+(img|image)|refrence|add\s+the\s+clothes|transfer\s+(the\s+)?(outfit|clothes|clothing)|swap\s+(the\s+)?(clothes|outfit)|wear\s+the)\b/i;

const OUTFIT_TRANSFERISH =
  /\b(transfer|from\s+(the\s+)?ref|replace\s+(the\s+)?outfit|swap\s+(the\s+)?(outfit|clothes)|change\s+the\s+outfit|put\s+on\s+the|wear\s+the\s+(outfit|clothes|armor))\b/i;

const FACE =
  /\b(fix\s+(eye|eyes|face|mouth|nose|teeth|skin)|face\s+fix|make\s+(her|him|them)?\s*(smile|younger|older)|change\s+(expression|face|eyes|skin|hair)|younger|older|wrinkle|smooth\s+skin|beauty|retouch|skin\s+tone|makeup|lipstick|beard|mustache)\b/i;

const BACKGROUND =
  /\b(remove\s+background|change\s+background|replace\s+background|new\s+background|blur\s+background|bokeh)\b/i;

const SMALL_ADD =
  /\b(add|put|wear|place|insert|give|attach)\b[^.]{0,40}\b(goggles|glasses|sunglasses|hat|cap|mask|beard|mustache|smile|earring|necklace|crown|scarf|tie|accessory|tattoo|makeup|helmet)\b/i;

const STYLE =
  /\b(cartoon|anime|painting|sketch|watercolor|artistic|cinematic|vintage\s+style|retro\s+style|style\s+transfer)\b/i;

const COLOR =
  /\b(brighten|darken|contrast|colou?r|saturation|warm|cool|relight|exposure|recolou?r|dye|tint)\b/i;

const COLOR_CHANGE =
  /\b(change|make|turn|set|paint|recolou?r|dye|tint)\b[\s\S]{0,60}\b(colou?r|red|blue|green|yellow|white|black|pink|purple|orange|brown|grey|gray)\b/i;

/**
 * Understand the user's real intent from the ORIGINAL prompt (before auto-enhance).
 * Order matters: specific operations before generic enhance/general.
 */
export function understandIntent(
  rawPrompt: string,
  hasReferenceImages: boolean,
): EditorIntent {
  const p = (rawPrompt || "").trim();
  if (!p) return "general_edit";

  if (REMOVE_PEOPLE.test(p)) return "remove_people";
  if (GLARE_CLEANUP.test(p)) return "object_remove";
  if (OBJECT_REMOVE.test(p)) return "object_remove";

  // Restore / colorize before pure_enhance ("make it clear" on old photos)
  if (COLORIZE.test(p)) return "colorize";
  if (RESTORE.test(p)) return "restore";

  if (OUTFIT.test(p) && hasReferenceImages) return "outfit_transfer";

  if (ADD_SUBJECT.test(p) && !OUTFIT.test(p)) return "add_subject";

  if (COLOR_CHANGE.test(p) || (COLOR.test(p) && !OUTFIT_TRANSFERISH.test(p))) {
    if (!OUTFIT_TRANSFERISH.test(p)) return "color";
  }

  if (OUTFIT.test(p)) return "outfit_single";
  if (FACE.test(p)) return "face_fix";
  if (BACKGROUND.test(p)) return "background";
  if (SMALL_ADD.test(p)) return "small_add";
  if (STYLE.test(p)) return "style";
  if (COLOR.test(p) && !QUALITY_ONLY.test(p)) return "color";

  if (QUALITY_ONLY.test(p)) {
    if (
      REMOVE_PEOPLE.test(p) ||
      OBJECT_REMOVE.test(p) ||
      GLARE_CLEANUP.test(p) ||
      OUTFIT.test(p) ||
      FACE.test(p) ||
      ADD_SUBJECT.test(p) ||
      RESTORE.test(p) ||
      COLORIZE.test(p)
    ) {
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
    "clothing, shadows. Reconstruct background matching texture and lighting. Keep all other people and " +
    "non-target content unchanged. Photorealistic. Do not add replacement people. Do not change clothing " +
    "or faces of people who should remain.",

  object_remove:
    "This is a real photograph cleanup. Remove ONLY the requested defect or object (e.g. glare, reflection, " +
    "watermark, unwanted object). Reconstruct the affected area to match surrounding texture, color and lighting. " +
    "Do NOT change faces, clothing, pose, composition or background elsewhere. Photorealistic.",

  add_subject:
    "This is a real photograph compositing edit. ADD the requested person or subject into the scene as specified. " +
    "Match lighting, perspective, scale and shadows so the addition looks natural. " +
    "Preserve ALL existing people exactly (faces, clothing, pose). Do NOT change anyone's clothes or identity. " +
    "Do NOT replace existing subjects with the new one.",

  restore:
    "This is a real damaged or aged photograph. Restore it: reduce scratches, tears, stains, noise and blur; " +
    "recover lost detail and natural contrast. Preserve the original people, faces, clothing, pose and composition " +
    "exactly — do not modernize faces or invent new content. Photorealistic restoration of THIS photo.",

  colorize:
    "This is a real black-and-white or faded photograph. Colorize it with natural, historically plausible colors. " +
    "Preserve exact faces, identity, clothing shapes, pose and composition. Do not restyle or modernize subjects.",

  face_fix:
    "This is a real photograph face/skin edit. Apply ONLY the requested face or skin change. " +
    "Same individual — identical facial structure and identity. Do not redesign the face.",

  background:
    "This is a real photograph. Change ONLY the background as requested. Keep subject edges, identity " +
    "and lighting on the subject identical.",

  color:
    "This is a real photograph color edit. Apply the requested color change clearly and visibly. " +
    "Keep face, identity, body pose, clothing shape and background the same except for the specified color.",

  general:
    "This is a real photograph. Preserve exact person identity (face, skin, hair) for everyone already in the photo. " +
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

    case "color":
      return (
        `Apply this color change clearly and visibly on the exact uploaded photo: ${p}. ` +
        `The new color must be obvious. Keep face, identity, pose, garment shape and background unchanged.`
      );

    case "remove_people":
      return (
        `PRIMARY TASK — PERSON REMOVAL: ${p}. ` +
        `Completely remove the specified person(s) from this photo. ` +
        `Erase their face, body, clothing, hair, limbs and shadows. ` +
        `Reconstruct the background to match texture, lighting and perspective. ` +
        `Keep every other person and all non-target content unchanged. Photorealistic.`
      );

    case "object_remove":
      return (
        `PRIMARY TASK — TARGETED CLEANUP: ${p}. ` +
        `Remove only the specified glare, reflection, defect or object. ` +
        `Fill the area naturally to match surrounding pixels. ` +
        `Do not change faces, clothing, other people, or the rest of the scene.`
      );

    case "add_subject":
      return (
        `PRIMARY TASK — ADD SUBJECT: ${p}. ` +
        `Insert the requested person or subject into this photo so they belong in the scene. ` +
        `Match lighting, scale, perspective and cast a plausible shadow. ` +
        `Preserve every existing person exactly — same faces, same clothes, same poses. ` +
        `Do not replace or restyle anyone already in the photo.`
      );

    case "restore":
      return (
        `PRIMARY TASK — PHOTO RESTORATION: ${p}. ` +
        `Restore this aged or damaged photograph: fix scratches, tears, stains, dust, fading and soft blur; ` +
        `recover facial and clothing detail; normalize contrast without looking artificial. ` +
        `Keep the same people, faces, clothing, pose and composition. Do not modernize or reinvent subjects.`
      );

    case "colorize":
      return (
        `PRIMARY TASK — COLORIZE: ${p}. ` +
        `Add natural realistic colors to this black-and-white or faded photo. ` +
        `Skin, hair, clothing and background should look historically plausible. ` +
        `Preserve exact faces, identity, pose and composition.`
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

export function buildFinalEditPrompt(args: {
  rawPrompt: string;
  enhancedOrExpanded: string;
  intent: EditorIntent;
  referenceCount: number;
}): string {
  const { rawPrompt, enhancedOrExpanded, intent, referenceCount } = args;
  void referenceCount;

  const lock =
    intent === "outfit_transfer"
      ? LOCKS.outfit_transfer
      : intent === "outfit_single"
        ? LOCKS.outfit_single
        : intent === "remove_people"
          ? LOCKS.remove_people
          : intent === "object_remove"
            ? LOCKS.object_remove
            : intent === "add_subject"
              ? LOCKS.add_subject
              : intent === "restore"
                ? LOCKS.restore
                : intent === "colorize"
                  ? LOCKS.colorize
                  : intent === "face_fix"
                    ? LOCKS.face_fix
                    : intent === "background"
                      ? LOCKS.background
                      : intent === "pure_enhance"
                        ? LOCKS.pure_enhance
                        : intent === "color"
                          ? LOCKS.color
                          : LOCKS.general;

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

  if (
    intent === "remove_people" ||
    intent === "object_remove" ||
    intent === "add_subject" ||
    intent === "restore" ||
    intent === "colorize"
  ) {
    return (
      `${lock}\n` +
      `${enhancedOrExpanded}\n` +
      `Execute the primary task fully and visibly. Photorealistic. No watermark.`
    );
  }

  if (intent === "color") {
    return (
      `${LOCKS.color}\n` +
      `${enhancedOrExpanded}\n` +
      `Only change what was requested. Keep unmentioned areas identical. Photorealistic. No watermark.`
    );
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
      return { guidance_scale: 4.5, num_inference_steps: 50 };
    case "object_remove":
      return { guidance_scale: 4.2, num_inference_steps: 48 };
    case "add_subject":
      return { guidance_scale: 4.0, num_inference_steps: 48 };
    case "restore":
      return { guidance_scale: 3.8, num_inference_steps: 48 };
    case "colorize":
      return { guidance_scale: 4.0, num_inference_steps: 46 };
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
    case "color":
      return { guidance_scale: 4.0, num_inference_steps: 40 };
    default:
      return { guidance_scale: 3.4, num_inference_steps: 44 };
  }
}
