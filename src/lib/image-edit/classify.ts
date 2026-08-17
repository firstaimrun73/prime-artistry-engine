/**
 * Image-edit classification — pure functions, no network.
 * Used by fal-request builders and prompt construction.
 */

export type EditSize =
  | "small_add"
  | "remove_people"
  | "face_fix"
  | "background"
  | "small"
  | "large"
  | "outfit"
  | "default";

export type EditType =
  | "removal"
  | "background"
  | "portrait"
  | "style"
  | "enhance"
  | "color"
  | "outfit"
  | "general";

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

/** Outfit / clothing transfer — multi-image and single-prompt. */
export const OUTFIT_MATCH =
  /\b(outfit|clothing|clothes|cloth|dress|shirt|jacket|armor|armour|costume|suit|wear|wearing|change\s+the\s+outfit|replace\s+outfit|swap\s+outfit|put\s+on|dress\s+(him|her|them)|clothes\s+from|from\s+the\s+ref|from\s+ref|reference\s+(img|image)|refrence)\b/i;

export function isOutfitIntent(prompt: string): boolean {
  return OUTFIT_MATCH.test(prompt || "");
}

export function classifyEditSize(userPrompt: string): EditSize {
  const p = userPrompt || "";
  if (REMOVE_PEOPLE_MATCH.test(p)) return "remove_people";
  if (isOutfitIntent(p)) return "outfit";
  if (FACE_FIX_MATCH.test(p)) return "face_fix";
  if (BACKGROUND_MATCH.test(p)) return "background";
  if (SMALL_ADD_MATCH.test(p)) return "small_add";
  if (SMALL_EDIT_MATCH.test(p)) return "small";
  if (LARGE_EDIT_MATCH.test(p)) return "large";
  return "default";
}

export function classifyEdit(prompt: string): EditType {
  const p = (prompt || "").toLowerCase();
  if (isOutfitIntent(p)) return "outfit";
  if (
    /remove[^.]{0,40}(person|people|man|woman|human|figure|background|object|watermark|text|logo)/.test(
      p,
    )
  )
    return "removal";
  if (/(background|backdrop|scene)/.test(p) && !/remove/.test(p)) return "background";
  if (
    /(face|skin|eye|eyes|nose|mouth|teeth|hair|portrait|beauty|wrinkle|age|younger|older|expression|smile|smiling|makeup|lipstick|beard|mustache|skin\s+tone|retouch)/.test(
      p,
    )
  )
    return "portrait";
  if (/(cartoon|anime|painting|sketch|watercolor|artistic|style)/.test(p)) return "style";
  if (/(sharp|enhance|upscale|denoise|quality|hd|4k|clear|restore)/.test(p)) return "enhance";
  if (/(bright|dark|contrast|colou?r|saturation|warm|cool|light)/.test(p)) return "color";
  return "general";
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
    case "outfit":
      return { strength: 0.72, guidance_scale: 3.8, num_inference_steps: 44 };
    case "small":
      return { strength: 0.55, guidance_scale: 2.8, num_inference_steps: 40 };
    case "large":
      return { strength: 0.75, guidance_scale: 2.8, num_inference_steps: 40 };
    default:
      return { strength: 0.65, guidance_scale: 3.2, num_inference_steps: 42 };
  }
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
    case "outfit":
      return { strength: 0.72, guidance_scale: 3.8, num_inference_steps: 44 };
    default:
      return { strength: 0.65, guidance_scale: 3.2, num_inference_steps: 42 };
  }
}
