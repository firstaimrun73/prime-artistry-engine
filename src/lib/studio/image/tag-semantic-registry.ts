/**
 * Image Studio @tag semantic registry — single source of truth.
 *
 * Frontend: short chip labels (@Outfit, @Background, …).
 * Backend: detailed editing instructions injected into the model prompt only.
 * Users never see the long instructions.
 *
 * Flow: contextTags → normalizeTagIds → composeTaggedPrompt → modelPrompt
 * (existing Image Studio generation pipeline; no separate tag model).
 */

export type TagCategory =
  | "people"
  | "objects"
  | "environment"
  | "visual"
  | "camera"
  | "style"
  | "action";

export type SemanticTagDef = {
  id: string;
  label: string;
  category: TagCategory;
  guidance: string;
  color: string;
  semanticInstruction: string;
};

export const MAX_SEMANTIC_TAGS = 10;

export const TAG_ALIASES: Readonly<Record<string, string>> = {
  accessories: "accessory",
  restoration: "restore",
  clothes: "clothing",
  cloth: "clothing",
  garment: "clothing",
  garments: "clothing",
  footwear: "shoes",
  shoe: "shoes",
  bg: "background",
  backdrop: "background",
  env: "environment",
  dof: "depth_of_field",
  "depth-of-field": "depth_of_field",
  depthoffield: "depth_of_field",
  cellphone: "phone",
  mobile: "phone",
};

const C = {
  violet: "bg-violet-500/15 text-violet-700 border-violet-400/40 dark:text-violet-300",
  fuchsia: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-400/40 dark:text-fuchsia-300",
  pink: "bg-pink-500/15 text-pink-700 border-pink-400/40 dark:text-pink-300",
  rose: "bg-rose-500/15 text-rose-700 border-rose-400/40 dark:text-rose-300",
  orange: "bg-orange-500/15 text-orange-700 border-orange-400/40 dark:text-orange-300",
  amber: "bg-amber-500/15 text-amber-800 border-amber-400/40 dark:text-amber-300",
  sky: "bg-sky-500/15 text-sky-700 border-sky-400/40 dark:text-sky-300",
  cyan: "bg-cyan-500/15 text-cyan-700 border-cyan-400/40 dark:text-cyan-300",
  teal: "bg-teal-500/15 text-teal-700 border-teal-400/40 dark:text-teal-300",
  emerald: "bg-emerald-500/15 text-emerald-700 border-emerald-400/40 dark:text-emerald-300",
  blue: "bg-blue-500/15 text-blue-700 border-blue-400/40 dark:text-blue-300",
  indigo: "bg-indigo-500/15 text-indigo-700 border-indigo-400/40 dark:text-indigo-300",
  slate: "bg-slate-500/15 text-slate-700 border-slate-400/40 dark:text-slate-300",
  destructive: "bg-destructive/10 text-destructive border-destructive/30",
  green: "bg-green-500/15 text-green-700 border-green-400/40 dark:text-green-300",
  primary: "bg-primary/15 text-primary border-primary/40",
} as const;

export const SEMANTIC_TAG_REGISTRY: readonly SemanticTagDef[] = [
  { id: "person", label: "@Person", category: "people", guidance: "Primary human subject", color: C.rose, semanticInstruction: "EDIT TARGET: PERSON. Focus modifications on the primary human subject as requested. Preserve identity unless the user explicitly asks to change it. Keep pose, clothing, and environment consistent unless otherwise specified." },
  { id: "face", label: "@Face", category: "people", guidance: "Facial features; preserve identity", color: C.rose, semanticInstruction: "EDIT TARGET: FACE. Refine facial features only as requested while strictly preserving identity. Do not change hairstyle, clothing, body, or background unless asked. Keep skin texture and lighting coherent." },
  { id: "hair", label: "@Hair", category: "people", guidance: "Hairstyle and hair color", color: C.pink, semanticInstruction: "EDIT TARGET: HAIR. Change hairstyle and/or hair color as requested. Preserve facial identity, skin, clothing, body pose, and environment. Keep hairline, volume, and lighting natural." },
  { id: "skin", label: "@Skin", category: "people", guidance: "Skin tone and texture", color: C.orange, semanticInstruction: "EDIT TARGET: SKIN. Adjust skin tone and texture naturally as requested. Preserve identity, facial structure, hair, clothing, and scene. Avoid plastic or over-smoothed results." },
  { id: "body", label: "@Body", category: "people", guidance: "Body appearance and proportions", color: C.amber, semanticInstruction: "EDIT TARGET: BODY. Adjust body appearance only within natural proportions as requested. Preserve face identity, clothing intent, pose coherence, and environment." },
  { id: "pose", label: "@Pose", category: "people", guidance: "Body pose and stance", color: C.amber, semanticInstruction: "EDIT TARGET: POSE. Adjust body pose as requested while keeping identity, clothing style, and environment consistent. Maintain correct anatomy, perspective, and grounding." },
  { id: "expression", label: "@Expression", category: "people", guidance: "Facial expression", color: C.rose, semanticInstruction: "EDIT TARGET: EXPRESSION. Change facial expression as requested while preserving identity, facial structure, hair, and the rest of the image. Keep skin and lighting natural." },
  { id: "outfit", label: "@Outfit", category: "people", guidance: "Clothing and full outfit", color: C.violet, semanticInstruction: "EDIT TARGET: OUTFIT. Focus the requested modification on the person's clothing/outfit region. Preserve identity, face, hairstyle, body proportions, pose, lighting, and the rest of the image. Apply fabric folds, shadows, and occlusion naturally." },
  { id: "clothing", label: "@Clothing", category: "people", guidance: "Garments and fabric", color: C.violet, semanticInstruction: "EDIT TARGET: CLOTHING. Adjust garments and fabric according to the user's request. Keep identity, face, hair, body pose, and background unchanged unless explicitly requested. Preserve realistic fabric folds, shadows, and lighting." },
  { id: "shoes", label: "@Shoes", category: "people", guidance: "Footwear only", color: C.violet, semanticInstruction: "EDIT TARGET: SHOES. Modify footwear only. Preserve pose, legs, ground contact, and the rest of the outfit unless the user asks otherwise." },
  { id: "accessory", label: "@Accessory", category: "people", guidance: "Bags, hats, belts, glasses", color: C.fuchsia, semanticInstruction: "EDIT TARGET: ACCESSORY. Modify or add accessories (bags, hats, belts, glasses, etc.) as requested. Do not change the person's face, body, or core clothing unless specified. Match scale, perspective, and lighting." },
  { id: "jewelry", label: "@Jewelry", category: "people", guidance: "Rings, necklaces, earrings", color: C.fuchsia, semanticInstruction: "EDIT TARGET: JEWELRY. Modify or add jewelry (rings, necklaces, earrings, watches). Preserve identity and all other regions. Match metal reflections and scene lighting." },
  { id: "makeup", label: "@Makeup", category: "people", guidance: "Makeup and cosmetics", color: C.pink, semanticInstruction: "EDIT TARGET: MAKEUP. Adjust makeup as requested while preserving facial identity and structure. Keep skin texture natural; do not change hair, clothing, or background unless asked." },
  { id: "object", label: "@Object", category: "objects", guidance: "Generic object focus", color: C.orange, semanticInstruction: "EDIT TARGET: OBJECT. Focus changes on the specified object(s). Preserve people, faces, and unrelated scene content unless the user asks otherwise. Maintain perspective, scale, and lighting." },
  { id: "product", label: "@Product", category: "objects", guidance: "Product or merchandise", color: C.orange, semanticInstruction: "EDIT TARGET: PRODUCT. Focus on the product or merchandise as requested. Preserve branding intent when visible, and keep supporting scene and people consistent unless specified." },
  { id: "furniture", label: "@Furniture", category: "objects", guidance: "Furniture and fixtures", color: C.amber, semanticInstruction: "EDIT TARGET: FURNITURE. Modify furniture or fixtures as requested. Preserve room structure, people, and lighting consistency unless otherwise specified." },
  { id: "vehicle", label: "@Vehicle", category: "objects", guidance: "Cars, bikes, transport", color: C.slate, semanticInstruction: "EDIT TARGET: VEHICLE. Focus modifications on the vehicle. Preserve occupants' identity when visible, environment, and realistic reflections/shadows." },
  { id: "electronics", label: "@Electronics", category: "objects", guidance: "Devices and gadgets", color: C.slate, semanticInstruction: "EDIT TARGET: ELECTRONICS. Focus on electronic devices (screens, gadgets, appliances) as requested. Preserve surrounding scene and people unless specified." },
  { id: "phone", label: "@Phone", category: "objects", guidance: "Phone or mobile device", color: C.slate, semanticInstruction: "EDIT TARGET: PHONE. Focus on the phone or mobile device as requested (appearance, screen content, hold). Preserve hand pose and person identity unless asked to change them." },
  { id: "bag", label: "@Bag", category: "objects", guidance: "Bags and handbags", color: C.fuchsia, semanticInstruction: "EDIT TARGET: BAG. Modify bags or handbags as requested. Preserve the person, outfit, and scene otherwise. Match scale, strap geometry, and lighting." },
  { id: "instrument", label: "@Instrument", category: "objects", guidance: "Musical instruments", color: C.indigo, semanticInstruction: "EDIT TARGET: INSTRUMENT. Focus on musical instruments as requested. Preserve player identity and pose coherence; match materials and lighting." },
  { id: "food", label: "@Food", category: "objects", guidance: "Food and drinks", color: C.orange, semanticInstruction: "EDIT TARGET: FOOD. Focus on food or drinks as requested. Preserve tableware, people, and environment unless specified. Keep textures and lighting appetizing and realistic." },
  { id: "animal", label: "@Animal", category: "objects", guidance: "Animals and pets", color: C.amber, semanticInstruction: "EDIT TARGET: ANIMAL. Focus modifications on the animal or pet as requested. Preserve species traits unless asked to change them; keep people and environment consistent unless specified." },
  { id: "background", label: "@Background", category: "environment", guidance: "Background / environment", color: C.sky, semanticInstruction: "EDIT TARGET: BACKGROUND. Restrict the requested modification to the background and environment. Preserve the foreground subject(s), identity, clothing, and pose. Match lighting and contact shadows at the subject edge." },
  { id: "sky", label: "@Sky", category: "environment", guidance: "Sky and atmosphere aloft", color: C.sky, semanticInstruction: "EDIT TARGET: SKY. Modify the sky region as requested. Preserve ground, buildings, and subjects. Keep horizon and lighting direction coherent." },
  { id: "ground", label: "@Ground", category: "environment", guidance: "Ground and surface underfoot", color: C.teal, semanticInstruction: "EDIT TARGET: GROUND. Modify the ground or surface underfoot as requested. Preserve subjects and upper environment; keep contact shadows and perspective consistent." },
  { id: "wall", label: "@Wall", category: "environment", guidance: "Walls and vertical surfaces", color: C.cyan, semanticInstruction: "EDIT TARGET: WALL. Focus on walls or vertical interior/exterior surfaces as requested. Preserve subjects and other architecture unless specified." },
  { id: "floor", label: "@Floor", category: "environment", guidance: "Floor surfaces", color: C.teal, semanticInstruction: "EDIT TARGET: FLOOR. Modify floor surfaces as requested. Preserve furniture, people, and walls unless specified. Keep reflections and contact shadows realistic." },
  { id: "room", label: "@Room", category: "environment", guidance: "Interior room setting", color: C.cyan, semanticInstruction: "EDIT TARGET: ROOM. Focus on the interior room setting as requested. Preserve people and primary props unless the user asks to change them. Keep spatial coherence." },
  { id: "architecture", label: "@Architecture", category: "environment", guidance: "Buildings and structures", color: C.blue, semanticInstruction: "EDIT TARGET: ARCHITECTURE. Modify buildings or structures as requested. Preserve people and vehicles unless specified. Keep perspective and scale consistent." },
  { id: "landscape", label: "@Landscape", category: "environment", guidance: "Outdoor landscape", color: C.emerald, semanticInstruction: "EDIT TARGET: LANDSCAPE. Focus on outdoor landscape elements (terrain, vegetation, distant scenery). Preserve foreground subjects unless specified." },
  { id: "environment", label: "@Environment", category: "environment", guidance: "Overall surroundings", color: C.sky, semanticInstruction: "EDIT TARGET: ENVIRONMENT. Focus on the overall surroundings and setting as requested while preserving primary subject identity and intent unless the user asks otherwise." },
  { id: "scene", label: "@Scene", category: "environment", guidance: "Overall scene composition", color: C.blue, semanticInstruction: "EDIT TARGET: SCENE. Apply changes with awareness of the full scene. Prefer coherent global adjustments as requested without destroying subject identity unless asked." },
  { id: "color", label: "@Color", category: "visual", guidance: "Color and grading", color: C.pink, semanticInstruction: "EDIT TARGET: COLOR. Apply color changes and grading as requested. Prefer targeted recolor of the intended region when the prompt specifies an object; otherwise grade the overall image. Preserve identity and structure." },
  { id: "lighting", label: "@Lighting", category: "visual", guidance: "Illumination and light direction", color: C.amber, semanticInstruction: "EDIT TARGET: LIGHTING. Focus on illumination, highlights, shadows, and light direction as requested. Preserve subject identity and composition; keep exposure natural." },
  { id: "shadow", label: "@Shadow", category: "visual", guidance: "Shadows and cast light", color: C.slate, semanticInstruction: "EDIT TARGET: SHADOW. Adjust shadows and cast light as requested. Keep light direction coherent with the scene; preserve subjects and materials." },
  { id: "reflection", label: "@Reflection", category: "visual", guidance: "Reflections and speculars", color: C.cyan, semanticInstruction: "EDIT TARGET: REFLECTION. Modify reflections and specular highlights as requested. Keep material behavior plausible; preserve non-reflective regions unless specified." },
  { id: "texture", label: "@Texture", category: "visual", guidance: "Surface texture detail", color: C.orange, semanticInstruction: "EDIT TARGET: TEXTURE. Adjust surface texture detail as requested. Avoid plastic oversmoothing; preserve overall form and identity." },
  { id: "material", label: "@Material", category: "visual", guidance: "Material appearance", color: C.orange, semanticInstruction: "EDIT TARGET: MATERIAL. Change material appearance (metal, fabric, wood, glass, etc.) as requested. Match lighting and reflections; preserve shape and surrounding context." },
  { id: "pattern", label: "@Pattern", category: "visual", guidance: "Patterns and prints", color: C.violet, semanticInstruction: "EDIT TARGET: PATTERN. Modify patterns, prints, or surface motifs as requested. Follow garment or object geometry; preserve unrelated regions." },
  { id: "blur", label: "@Blur", category: "visual", guidance: "Blur and softness", color: C.indigo, semanticInstruction: "EDIT TARGET: BLUR. Adjust blur or softness as requested (e.g. background blur). Preserve subject sharpness unless the user asks otherwise." },
  { id: "depth", label: "@Depth", category: "visual", guidance: "Depth and spatial layers", color: C.indigo, semanticInstruction: "EDIT TARGET: DEPTH. Emphasize or adjust sense of depth and spatial layering as requested without destroying subject identity or scene coherence." },
  { id: "focus", label: "@Focus", category: "visual", guidance: "Focus and sharpness", color: C.indigo, semanticInstruction: "EDIT TARGET: FOCUS. Adjust focus and sharpness emphasis as requested. Prefer natural optics; avoid excessive sharpening artifacts." },
  { id: "camera", label: "@Camera", category: "camera", guidance: "Camera look and optics", color: C.blue, semanticInstruction: "EDIT TARGET: CAMERA. Adjust camera-related look (focal length feel, viewpoint cues) as requested while preserving subject identity unless asked to change it." },
  { id: "composition", label: "@Composition", category: "camera", guidance: "Framing and layout", color: C.blue, semanticInstruction: "EDIT TARGET: COMPOSITION. Adjust framing and visual layout as requested. Preserve important subject identity; keep the edit photorealistic unless a style change is requested." },
  { id: "framing", label: "@Framing", category: "camera", guidance: "Crop and framing", color: C.blue, semanticInstruction: "EDIT TARGET: FRAMING. Adjust crop and framing emphasis as requested. Do not invent critical identity details outside the original content when possible." },
  { id: "perspective", label: "@Perspective", category: "camera", guidance: "Perspective and viewpoint", color: C.indigo, semanticInstruction: "EDIT TARGET: PERSPECTIVE. Adjust perspective or viewpoint cues as requested while keeping anatomy and scene geometry plausible." },
  { id: "angle", label: "@Angle", category: "camera", guidance: "Camera angle", color: C.indigo, semanticInstruction: "EDIT TARGET: ANGLE. Adjust implied camera angle as requested. Preserve subject identity and scene coherence." },
  { id: "lens", label: "@Lens", category: "camera", guidance: "Lens characteristics", color: C.slate, semanticInstruction: "EDIT TARGET: LENS. Emulate lens characteristics (wide, tele, compression) as requested without unwanted distortion of faces unless asked." },
  { id: "depth_of_field", label: "@DepthOfField", category: "camera", guidance: "Depth of field", color: C.indigo, semanticInstruction: "EDIT TARGET: DEPTH OF FIELD. Adjust depth of field as requested (subject sharp, background soft or reverse). Keep bokeh natural." },
  { id: "style", label: "@Style", category: "style", guidance: "Overall visual style", color: C.primary, semanticInstruction: "EDIT TARGET: STYLE. Apply the requested visual style while preserving the core subject and readable identity unless the user explicitly wants a full restyle." },
  { id: "mood", label: "@Mood", category: "style", guidance: "Emotional mood", color: C.pink, semanticInstruction: "EDIT TARGET: MOOD. Shift emotional mood via color, lighting, and tone as requested without unnecessary identity changes." },
  { id: "atmosphere", label: "@Atmosphere", category: "style", guidance: "Atmospheric feel", color: C.sky, semanticInstruction: "EDIT TARGET: ATMOSPHERE. Adjust atmospheric feel (haze, mist, air quality, ambiance) as requested while preserving subjects." },
  { id: "season", label: "@Season", category: "style", guidance: "Seasonal cues", color: C.emerald, semanticInstruction: "EDIT TARGET: SEASON. Apply seasonal cues (foliage, weather hints, wardrobe-adjacent environment) as requested. Preserve people unless clothing change is requested." },
  { id: "weather", label: "@Weather", category: "style", guidance: "Weather conditions", color: C.cyan, semanticInstruction: "EDIT TARGET: WEATHER. Change weather conditions as requested (rain, snow, clear, overcast). Keep subjects coherent with new lighting and wetness cues." },
  { id: "time", label: "@Time", category: "style", guidance: "Time of day", color: C.amber, semanticInstruction: "EDIT TARGET: TIME. Adjust time-of-day lighting (golden hour, night, noon) as requested. Preserve scene content and identity; match shadows to the new light." },
  { id: "add", label: "@Add", category: "action", guidance: "Add elements", color: C.green, semanticInstruction: "EDIT TARGET: ADD. Add the requested elements into the scene. Match perspective, lighting, scale, and occlusion. Do not unnecessarily alter existing subjects." },
  { id: "remove", label: "@Remove", category: "action", guidance: "Remove elements", color: C.destructive, semanticInstruction: "EDIT TARGET: REMOVE. Remove the requested elements and inpaint the area so it blends with surroundings. Preserve remaining subjects and structure." },
  { id: "replace", label: "@Replace", category: "action", guidance: "Replace elements", color: C.orange, semanticInstruction: "EDIT TARGET: REPLACE. Replace the specified elements as requested. Match lighting, perspective, and scale; preserve unrelated regions." },
  { id: "restore", label: "@Restore", category: "action", guidance: "Restore damage", color: C.amber, semanticInstruction: "EDIT TARGET: RESTORE. Restore damage, scratches, noise, or degradation while preserving original content and identity. Prefer faithful reconstruction over creative reinterpretation." },
  { id: "enhance", label: "@Enhance", category: "action", guidance: "Quality enhancement", color: C.primary, semanticInstruction: "EDIT TARGET: ENHANCE. Improve clarity, detail, and overall quality while preserving composition, identity, and original content. Avoid oversharpening or artificial look." },
] as const;

const byId = new Map(SEMANTIC_TAG_REGISTRY.map((t) => [t.id, t]));

export function getSemanticTag(id: string): SemanticTagDef | undefined {
  const key = resolveTagId(id);
  return key ? byId.get(key) : undefined;
}

export function resolveTagId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let id = String(raw).trim().toLowerCase().replace(/^@/, "").replace(/\s+/g, "_");
  if (!id) return null;
  if (TAG_ALIASES[id]) id = TAG_ALIASES[id];
  if (byId.has(id)) return id;
  return null;
}

export function normalizeTagIds(ids: string[] | undefined | null): string[] {
  if (!ids || ids.length === 0) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = resolveTagId(raw);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_SEMANTIC_TAGS) break;
  }
  return out;
}

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

export function listSemanticTags(): readonly SemanticTagDef[] {
  return SEMANTIC_TAG_REGISTRY;
}

export function matchSemanticTags(query: string): SemanticTagDef[] {
  const q = query.trim().toLowerCase().replace(/^@/, "");
  if (!q) return [...SEMANTIC_TAG_REGISTRY];
  return SEMANTIC_TAG_REGISTRY.filter((t) => {
    const label = t.label.replace(/^@/, "").toLowerCase();
    return t.id.includes(q) || label.includes(q) || t.guidance.toLowerCase().includes(q);
  });
}

export const CONTEXT_TAGS = SEMANTIC_TAG_REGISTRY.map((t) => ({
  id: t.id,
  label: t.label,
  color: t.color,
  guidance: t.guidance,
}));
