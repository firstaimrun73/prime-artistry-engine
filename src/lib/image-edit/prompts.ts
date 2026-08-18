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

export const OUTFIT_PHOTO_LOCK =
  "This is a real photograph. Treat it as a real photo clothing/outfit edit. " +
  "Preserve the exact person identity: face, facial structure, skin tone, hair, body pose, camera angle. " +
  "You MUST change the clothing/outfit as requested — do NOT keep the original clothes. " +
  "Keep the background unless asked otherwise. Photorealistic only.";

export const PEOPLE_REMOVAL_LOCK =
  "This is a real photograph. Treat it as object-removal. " +
  "Remove the requested people completely (faces, bodies, shadows). " +
  "Preserve non-human content and any people not targeted. Photorealistic. Do not add replacement people.";

const PEOPLE_REMOVAL_PROMPT_CLAUSE =
  " Completely remove the target person. Erase faces, bodies, clothing, hair, limbs, shadows. Reconstruct background matching texture, lighting and perspective. Keep non-target people and non-human content. Photorealistic.";

const FACE_EDIT_CLAUSE =
  " Apply only the requested face/skin/expression change. Same individual as input — same facial structure and identity.";

const OBJECT_MODIFY_CLAUSE =
  " Modify only what the user requested. Keep background, lighting and unmentioned subjects unchanged unless the request requires otherwise. Photorealistic.";

const STYLE_TRANSFORM_CLAUSE =
  " Apply the requested transformation to this exact image. Keep composition and proportions. Photorealistic unless a style is requested.";

const OUTFIT_SINGLE_CLAUSE =
  " Change the clothing/outfit on the person as requested. Keep face, identity, pose and background the same. New clothes must look natural and photorealistic.";

const RESTORE_CLAUSE =
  " Restore this photo: reduce scratches, tears, stains, noise and blur; recover detail and natural contrast. Keep the same people, faces, clothing and composition.";

/** Natural language: edit out, remove the girl, etc. */
export function isPeopleRemovalPrompt(prompt: string): boolean {
  return /\b((edit|cut|take|paint)\s+out|(remove|erase|delete|get\s+rid\s+of|take\s+away)\s+(the\s+)?(people|person|persons|humans?|human|everyone|all|girl|boy|guy|man|woman|lady|kid|child|someone|somebody|figure)|(remove|erase|delete)\s+(people|person|persons))\b/i.test(
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
    ` MULTI-IMAGE: Image 1 is the BASE photo (preserve this subject, face, pose, and scene). ` +
    `Images 2-${n + 1} are REFERENCE images only. ` +
    `Apply the user's request by transferring the relevant attribute, object, or style from the reference(s) onto image 1. ` +
    `Do not discard or ignore the reference content when the user asks to use it. ` +
    `Keep face and identity from image 1 unless the user explicitly asked to change identity.`
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
    case "restore":
      return " Restore quality and damage; do not reinvent subjects.";
    default:
      return "";
  }
}

export function buildKontextEditPrompt(args: {
  prompt: string;
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
  } else if (editSize === "restore" || editType === "restore") {
    core = `${prompt}.${RESTORE_CLAUSE}${FACE_IDENTITY_LOCK}`;
  } else if (isOutfit && isMulti) {
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
