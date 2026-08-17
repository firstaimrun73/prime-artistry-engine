/**
 * Image-edit prompt construction.
 *
 * Critical rule: for outfit / multi-image clothing transfer, NEVER tell the model
 * to preserve the original clothing. That was blocking correct multi-image results.
 */

import {
  classifyEdit,
  classifyEditSize,
  isOutfitIntent,
  type EditSize,
  type EditType,
} from "./classify";

export const FACE_IDENTITY_LOCK =
  " IDENTITY LOCK: Keep the exact same person. Same face geometry, same eyes, same nose, same mouth, same skin tone, same age, same hair. Do not generate a different face or different person.";

export const BASE_PHOTO_LOCK =
  "This is a real photograph. Treat it as a real photo edit. " +
  "Preserve the exact person, their face, skin tone, body proportions and pose. " +
  "Preserve background, lighting, colors and composition unless the user asked to change them. " +
  "Only make the specific requested change. Keep photorealistic. No cartoon/anime/painting.";

/** Allows clothing change — used for outfit transfer. */
export const OUTFIT_PHOTO_LOCK =
  "This is a real photograph. Treat it as a real photo clothing/outfit edit. " +
  "Preserve the exact person identity: face, facial structure, skin tone, hair, body pose, camera angle. " +
  "You MUST change the clothing/outfit as requested — do NOT keep the original clothes. " +
  "Keep the background unless asked otherwise. Photorealistic only.";

export const PEOPLE_REMOVAL_LOCK =
  "This is a real photograph. Treat it as object-removal. " +
  "Remove the requested people completely (faces, bodies, shadows). " +
  "Preserve non-human content. Photorealistic. Do not add replacement people.";

const PEOPLE_REMOVAL_PROMPT_CLAUSE =
  " Completely remove the target person or all visible people. Erase faces, bodies, clothing, hair, limbs, shadows. Reconstruct background matching texture, lighting and perspective. Keep non-human content. Photorealistic.";

const FACE_EDIT_CLAUSE =
  " Apply only the requested face/skin/expression change. Same individual as input — same facial structure and identity.";

const OBJECT_MODIFY_CLAUSE =
  " Modify only what the user requested. Keep background, lighting and unmentioned subjects unchanged unless the request requires otherwise. Photorealistic.";

const STYLE_TRANSFORM_CLAUSE =
  " Apply the requested transformation to this exact image. Keep composition and proportions. Photorealistic unless a style is requested.";

const OUTFIT_SINGLE_CLAUSE =
  " Change the clothing/outfit on the person as requested. Keep face, identity, pose and background the same. New clothes must look natural and photorealistic.";

export function isPeopleRemovalPrompt(prompt: string): boolean {
  return /\b(remove\s+(people|person|persons|humans?|human|everyone|all)|erase\s+(person|people)|delete\s+(person|people))\b/i.test(
    prompt || "",
  );
}

export function photoLockForPrompt(userPrompt: string): string {
  if (isPeopleRemovalPrompt(userPrompt)) return PEOPLE_REMOVAL_LOCK;
  if (isOutfitIntent(userPrompt)) return OUTFIT_PHOTO_LOCK;
  return BASE_PHOTO_LOCK;
}

export function buildMultiOutfitInstruction(refCount: number): string {
  const n = Math.max(1, refCount);
  return (
    ` PRIMARY TASK — OUTFIT TRANSFER: Image 1 is the person (base). ` +
    `Images 2-${n + 1} show the TARGET clothing/outfit/armor/costume. ` +
    `Replace ALL clothing on the person in image 1 with the EXACT outfit from the reference image(s). ` +
    `Match colors, materials, patterns, silhouette, armor plates, straps as closely as possible. ` +
    `Keep the person's FACE, identity, skin, hair, body pose, camera angle and BACKGROUND from image 1. ` +
    `Do NOT copy the face or body from the reference. Only transfer clothing.`
  );
}

export function buildMultiGeneralInstruction(refCount: number): string {
  const n = Math.max(1, refCount);
  return (
    ` MULTI-IMAGE: Image 1 is the base subject. Images 2-${n + 1} are references only. ` +
    `Apply the user's request using the references (style, object, or attribute) while keeping ` +
    `the face and identity from image 1 unchanged unless the user explicitly asked to change identity.`
  );
}

export function getEditTypeClause(type: EditType): string {
  switch (type) {
    case "removal":
      return " Remove ONLY the specified element. Fill naturally. Preserve remaining faces and lighting.";
    case "background":
      return " Change ONLY the background. Subject edges and identity unchanged.";
    case "portrait":
      return " Subtle face/skin change only. Same individual — identical facial structure and identity.";
    case "style":
      return " Apply style; keep composition and subject placement. Preserve identity.";
    case "color":
      return " Adjust only color/lighting as asked. Subjects and composition identical.";
    case "outfit":
      return " Change clothing as asked. Face and identity stay the same.";
    default:
      return "";
  }
}

/**
 * Build the final Kontext prompt.
 * Multi + outfit: transfer instruction is FIRST so it is not buried under locks.
 */
export function buildKontextEditPrompt(args: {
  /** Already-enhanced or raw instruction */
  prompt: string;
  /** Original user text for classification */
  rawPrompt: string;
  referenceCount: number;
}): string {
  const { prompt, rawPrompt, referenceCount } = args;
  const source = rawPrompt || prompt;
  const editSize = classifyEditSize(source);
  const editType = classifyEdit(source);
  const isMulti = referenceCount > 0;
  const isOutfit = editSize === "outfit" || editType === "outfit" || isOutfitIntent(source);

  let core: string;

  if (editSize === "remove_people") {
    core = `${prompt}.${PEOPLE_REMOVAL_PROMPT_CLAUSE}`;
  } else if (isOutfit && isMulti) {
    // Outfit multi: transfer FIRST, then short user intent, then identity (not clothing) lock
    core =
      `${buildMultiOutfitInstruction(referenceCount)} ` +
      `User request: ${source}. ` +
      `${FACE_IDENTITY_LOCK}`;
  } else if (isOutfit) {
    core = `${prompt}.${OUTFIT_SINGLE_CLAUSE}${FACE_IDENTITY_LOCK}`;
  } else if (editSize === "face_fix" || editType === "portrait") {
    core = `${prompt}.${FACE_EDIT_CLAUSE}${FACE_IDENTITY_LOCK}`;
  } else if (editSize === "small_add") {
    core = `${prompt}.${OBJECT_MODIFY_CLAUSE}${FACE_IDENTITY_LOCK}`;
  } else if (editSize === "large") {
    core = `${prompt}.${STYLE_TRANSFORM_CLAUSE}`;
  } else if (isMulti) {
    core =
      `${buildMultiGeneralInstruction(referenceCount)} ` +
      `User request: ${source}. ${OBJECT_MODIFY_CLAUSE}${FACE_IDENTITY_LOCK}`;
  } else {
    core = `${prompt}.${OBJECT_MODIFY_CLAUSE}${FACE_IDENTITY_LOCK}`;
  }

  const withType = `${core}${getEditTypeClause(editType)}`;

  // Light preservation footer — avoid stacking walls of "change nothing" on outfit multi
  if (isOutfit && isMulti) {
    return (
      `${withType}\n` +
      `OUTPUT: photorealistic edited photo. Same person as image 1, new clothes from reference. No watermark, no text overlay.`
    );
  }

  return (
    `${withType}\n` +
    `CRITICAL: Only change what was requested. Keep unmentioned areas identical. Photorealistic. No watermark.`
  );
}

export type { EditSize, EditType };
