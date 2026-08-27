/**
 * Image Studio @tag semantic registry.
 *
 * Frontend: short colorful chip labels (@Outfit, @Background, …).
 * Backend: detailed editing instructions injected into the model prompt only.
 * Users never see the long instructions.
 */

export type TagCategory =
  | "subject"
  | "appearance"
  | "clothing"
  | "scene"
  | "style"
  | "action"
  | "camera";

export type SemanticTagDef = {
  id: string;
  /** Chip text shown in UI, e.g. @Outfit */
  label: string;
  category: TagCategory;
  /** Tailwind-ish color classes for chips (consumed by prompt panel). */
  color: string;
  /** Detailed instruction for the image model — never shown to the user. */
  semanticInstruction: string;
};

export const MAX_SEMANTIC_TAGS = 10;

/**
 * Canonical registry. Only tags selected by the user are injected.
 */
export const SEMANTIC_TAG_REGISTRY: readonly SemanticTagDef[] = [
  {
    id: "outfit",
    label: "@Outfit",
    category: "clothing",
    color: "bg-violet-500/15 text-violet-700 border-violet-400/40 dark:text-violet-300",
    semanticInstruction:
      "EDIT TARGET: OUTFIT. Modify only the subject's clothing/outfit according to the user's requested changes. Preserve the person's identity, face, hairstyle, body proportions, pose, skin tone, lighting, camera perspective, environment and all unrelated image details. Replace or modify the clothing naturally and realistically. Maintain correct anatomy, fabric geometry, shadows, folds, occlusion and lighting consistency. Do not alter unrelated people or objects.",
  },
  {
    id: "clothing",
    label: "@Clothing",
    category: "clothing",
    color: "bg-violet-500/15 text-violet-700 border-violet-400/40 dark:text-violet-300",
    semanticInstruction:
      "EDIT TARGET: CLOTHING. Adjust garments and fabric according to the user's request. Keep identity, face, hair, body pose, and background unchanged unless explicitly requested. Preserve realistic fabric folds, shadows, and lighting.",
  },
  {
    id: "accessory",
    label: "@Accessory",
    category: "clothing",
    color: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-400/40 dark:text-fuchsia-300",
    semanticInstruction:
      "EDIT TARGET: ACCESSORY. Modify or add accessories (bags, hats, belts, glasses, etc.) as requested. Do not change the person's face, body, or core clothing unless specified. Match scale, perspective, and lighting.",
  },
  {
    id: "jewelry",
    label: "@Jewelry",
    category: "clothing",
    color: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-400/40 dark:text-fuchsia-300",
    semanticInstruction:
      "EDIT TARGET: JEWELRY. Edit jewelry only (rings, necklaces, earrings, watches). Preserve identity and all other regions. Match metal reflections and scene lighting.",
  },
  {
    id: "shoes",
    label: "@Shoes",
    category: "clothing",
    color: "bg-violet-500/15 text-violet-700 border-violet-400/40 dark:text-violet-300",
    semanticInstruction:
      "EDIT TARGET: SHOES. Modify footwear only. Preserve pose, legs, ground contact, and the rest of the outfit unless the user asks otherwise.",
  },
  {
    id: "hair",
    label: "@Hair",
    category: "appearance",
    color: "bg-pink-500/15 text-pink-700 border-pink-400/40 dark:text-pink-300",
    semanticInstruction:
      "EDIT TARGET: HAIR. Change hairstyle and/or hair color as requested. Preserve facial identity, skin, clothing, body pose, and environment. Keep hairline, volume, and lighting natural.",
  },
  {
    id: "face",
    label: "@Face",
    category: "appearance",
    color: "bg-rose-500/15 text-rose-700 border-rose-400/40 dark:text-rose-300",
    semanticInstruction:
      "EDIT TARGET: FACE. Refine facial features only as requested while strictly preserving identity. Do not change hairstyle, clothing, body, or background unless asked. Keep skin texture and lighting coherent.",
  },
  {
    id: "skin",
    label: "@Skin",
    category: "appearance",
    color: "bg-orange-500/15 text-orange-700 border-orange-400/40 dark:text-orange-300",
    semanticInstruction:
      "EDIT TARGET: SKIN. Adjust skin tone and texture naturally as requested. Preserve identity, facial structure, hair, clothing, and scene. Avoid plastic or over-smoothed results.",
  },
  {
    id: "body",
    label: "@Body",
    category: "subject",
    color: "bg-amber-500/15 text-amber-800 border-amber-400/40 dark:text-amber-300",
    semanticInstruction:
      "EDIT TARGET: BODY. Adjust body appearance only within natural proportions as requested. Preserve face identity, clothing intent, pose coherence, and environment.",
  },
  {
    id: "pose",
    label: "@Pose",
    category: "subject",
    color: "bg-amber-500/15 text-amber-800 border-amber-400/40 dark:text-amber-300",
    semanticInstruction:
      "EDIT TARGET: POSE. Adjust body pose as requested while keeping identity, clothing style, and environment consistent. Maintain correct anatomy, perspective, and grounding.",
  },
  {
    id: "expression",
    label: "@Expression",
    category: "appearance",
    color: "bg-rose-500/15 text-rose-700 border-rose-400/40 dark:text-rose-300",
    semanticInstruction:
      "EDIT TARGET: EXPRESSION. Change facial expression as requested while preserving identity, age, and facial structure. Do not alter hair, clothing, or background unless asked.",
  },
  {
    id: "person",
    label: "@Person",
    category: "subject",
    color: "bg-rose-500/15 text-rose-700 border-rose-400/40 dark:text-rose-300",
    semanticInstruction:
      "EDIT TARGET: PERSON. The primary subject is the person. Apply the user's request to that subject while preserving identity unless the user explicitly asks to change it. Keep environment coherent.",
  },
  {
    id: "object",
    label: "@Object",
    category: "subject",
    color: "bg-orange-500/15 text-orange-700 border-orange-400/40 dark:text-orange-300",
    semanticInstruction:
      "EDIT TARGET: OBJECT. Focus changes on the specified object(s). Preserve people, faces, and unrelated scene elements. Match lighting, scale, and perspective.",
  },
  {
    id: "background",
    label: "@Background",
    category: "scene",
    color: "bg-sky-500/15 text-sky-700 border-sky-400/40 dark:text-sky-300",
    semanticInstruction:
      "EDIT TARGET: BACKGROUND. Edit or replace the background according to the user request. Keep the main subject sharp and unchanged in identity, pose, and clothing. Match lighting and edge contact naturally.",
  },
  {
    id: "sky",
    label: "@Sky",
    category: "scene",
    color: "bg-cyan-500/15 text-cyan-700 border-cyan-400/40 dark:text-cyan-300",
    semanticInstruction:
      "EDIT TARGET: SKY. Modify sky and atmospheric background only. Preserve subjects and foreground. Adjust ambient light subtly so the scene remains consistent.",
  },
  {
    id: "ground",
    label: "@Ground",
    category: "scene",
    color: "bg-stone-500/15 text-stone-700 border-stone-400/40 dark:text-stone-300",
    semanticInstruction:
      "EDIT TARGET: GROUND. Modify ground/floor surface as requested. Preserve subjects, contact shadows, and perspective.",
  },
  {
    id: "architecture",
    label: "@Architecture",
    category: "scene",
    color: "bg-slate-500/15 text-slate-700 border-slate-400/40 dark:text-slate-300",
    semanticInstruction:
      "EDIT TARGET: ARCHITECTURE. Edit buildings and structures as requested. Preserve people and primary subjects. Keep perspective and lighting consistent.",
  },
  {
    id: "furniture",
    label: "@Furniture",
    category: "scene",
    color: "bg-stone-500/15 text-stone-700 border-stone-400/40 dark:text-stone-300",
    semanticInstruction:
      "EDIT TARGET: FURNITURE. Modify furniture elements as requested. Preserve people and room layout coherence unless asked to change them.",
  },
  {
    id: "vehicle",
    label: "@Vehicle",
    category: "subject",
    color: "bg-zinc-500/15 text-zinc-700 border-zinc-400/40 dark:text-zinc-300",
    semanticInstruction:
      "EDIT TARGET: VEHICLE. Focus edits on the vehicle. Preserve occupants' identities if present and match reflections and environment lighting.",
  },
  {
    id: "product",
    label: "@Product",
    category: "subject",
    color: "bg-blue-500/15 text-blue-700 border-blue-400/40 dark:text-blue-300",
    semanticInstruction:
      "EDIT TARGET: PRODUCT. Treat this as product-focused photography. Emphasize the product clarity, materials, and presentation per the user request while keeping the scene coherent.",
  },
  {
    id: "color",
    label: "@Color",
    category: "style",
    color: "bg-rose-500/15 text-rose-700 border-rose-400/40 dark:text-rose-300",
    semanticInstruction:
      "EDIT TARGET: COLOR. Apply color changes and grading as requested. Prefer targeted recolor of the intended region when tags or prompt specify an object; otherwise grade the overall image. Preserve identity and structure.",
  },
  {
    id: "lighting",
    label: "@Lighting",
    category: "style",
    color: "bg-amber-500/15 text-amber-800 border-amber-400/40 dark:text-amber-300",
    semanticInstruction:
      "EDIT TARGET: LIGHTING. Adjust lighting, shadows, and highlights as requested. Preserve subject identity and composition. Keep shadow directions and reflections physically plausible.",
  },
  {
    id: "texture",
    label: "@Texture",
    category: "style",
    color: "bg-lime-500/15 text-lime-700 border-lime-400/40 dark:text-lime-300",
    semanticInstruction:
      "EDIT TARGET: TEXTURE. Enhance or change surface texture as requested without altering identity or overall composition.",
  },
  {
    id: "material",
    label: "@Material",
    category: "style",
    color: "bg-lime-500/15 text-lime-700 border-lime-400/40 dark:text-lime-300",
    semanticInstruction:
      "EDIT TARGET: MATERIAL. Change material appearance (metal, fabric, glass, wood, etc.) as requested. Preserve shape and surrounding context.",
  },
  {
    id: "weather",
    label: "@Weather",
    category: "scene",
    color: "bg-cyan-500/15 text-cyan-700 border-cyan-400/40 dark:text-cyan-300",
    semanticInstruction:
      "EDIT TARGET: WEATHER. Apply weather conditions as requested. Keep subjects coherent with new atmospheric lighting and wetness/precipitation effects when relevant.",
  },
  {
    id: "time",
    label: "@Time",
    category: "scene",
    color: "bg-amber-500/15 text-amber-800 border-amber-400/40 dark:text-amber-300",
    semanticInstruction:
      "EDIT TARGET: TIME OF DAY. Shift time-of-day lighting as requested (e.g. golden hour, night) while preserving scene content and identity.",
  },
  {
    id: "camera",
    label: "@Camera",
    category: "camera",
    color: "bg-teal-500/15 text-teal-700 border-teal-400/40 dark:text-teal-300",
    semanticInstruction:
      "EDIT TARGET: CAMERA. Adjust camera angle, focal length feel, or framing cues as requested without inventing a different identity or unrelated scene.",
  },
  {
    id: "composition",
    label: "@Composition",
    category: "camera",
    color: "bg-teal-500/15 text-teal-700 border-teal-400/40 dark:text-teal-300",
    semanticInstruction:
      "EDIT TARGET: COMPOSITION. Improve framing and composition as requested while preserving the core subject identity and intent of the scene.",
  },
  {
    id: "style",
    label: "@Style",
    category: "style",
    color: "bg-emerald-500/15 text-emerald-700 border-emerald-400/40 dark:text-emerald-300",
    semanticInstruction:
      "EDIT TARGET: STYLE. Apply the requested artistic or photographic style. Preserve composition and, for people, identity unless the user explicitly requests a stylized identity change.",
  },
  {
    id: "remove",
    label: "@Remove",
    category: "action",
    color: "bg-destructive/10 text-destructive border-destructive/30",
    semanticInstruction:
      "EDIT TARGET: REMOVE. Remove the specified elements and inpaint the region so it blends with surrounding texture, lighting, and perspective. Do not damage unrelated subjects.",
  },
  {
    id: "replace",
    label: "@Replace",
    category: "action",
    color: "bg-orange-500/15 text-orange-700 border-orange-400/40 dark:text-orange-300",
    semanticInstruction:
      "EDIT TARGET: REPLACE. Replace the specified region or object with the user's requested content. Match lighting, scale, and perspective. Preserve everything outside the replacement scope.",
  },
  {
    id: "add",
    label: "@Add",
    category: "action",
    color: "bg-green-500/15 text-green-700 border-green-400/40 dark:text-green-300",
    semanticInstruction:
      "EDIT TARGET: ADD. Add the requested elements into the scene. Match perspective, lighting, scale, and occlusion. Do not unnecessarily alter existing subjects.",
  },
  {
    id: "restore",
    label: "@Restore",
    category: "action",
    color: "bg-amber-500/15 text-amber-800 border-amber-400/40 dark:text-amber-300",
    semanticInstruction:
      "EDIT TARGET: RESTORE. Restore damage, scratches, noise, or degradation while preserving original content and identity. Prefer faithful reconstruction over creative reinterpretation.",
  },
  {
    id: "enhance",
    label: "@Enhance",
    category: "action",
    color: "bg-primary/15 text-primary border-primary/40",
    semanticInstruction:
      "EDIT TARGET: ENHANCE. Improve clarity, detail, and overall quality while preserving composition, identity, and original content. Avoid oversharpening or artificial look.",
  },
] as const;

const byId = new Map(SEMANTIC_TAG_REGISTRY.map((t) => [t.id, t]));

export function getSemanticTag(id: string): SemanticTagDef | undefined {
  return byId.get(id);
}

/** Normalize and de-dupe tag ids; max MAX_SEMANTIC_TAGS. */
export function normalizeTagIds(ids: string[] | undefined | null): string[] {
  if (!ids || ids.length === 0) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "");
    if (!id || seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_SEMANTIC_TAGS) break;
  }
  return out;
}

/**
 * Build the prompt sent to the image model.
 * User-visible prompt is unchanged; this is server/model-only composition.
 */
export function composeTaggedPrompt(
  userPrompt: string,
  tagIds: string[] | undefined | null,
): string {
  const user = (userPrompt || "").trim();
  const tags = normalizeTagIds(tagIds);
  if (tags.length === 0) return user;

  const blocks = tags
    .map((id) => byId.get(id)?.semanticInstruction)
    .filter((s): s is string => !!s && s.length > 0);

  if (blocks.length === 0) return user;

  return [
    "CONTEXTUAL EDIT RULES (from user-selected targets; not literal tag text):",
    ...blocks.map((b, i) => `${i + 1}. ${b}`),
    "",
    "USER REQUEST:",
    user,
    "",
    "Apply the USER REQUEST under the constraints above. Do not treat @tag labels as literal text to draw in the image.",
  ].join("\n");
}
