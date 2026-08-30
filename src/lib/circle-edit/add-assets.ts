/**
 * Circle 2edit Add — production registry: CORE (5) + seed catalog (400+).
 * Client sends assetId only; server resolves prompt. Variation is server-side.
 */
import { parseSeedAssets } from "./add-assets-seed";

export type AssetVariationProfile = {
  enabled: boolean;
  styles: string[];
  colors: string[];
  sceneAdaptation: boolean;
  scaleAdaptation: boolean;
  lightingAdaptation: boolean;
};

export type CircleAddAsset = {
  id: string;
  name: string;
  slug: string;
  label: string;
  category: string;
  categoryLabel: string;
  tags: string[];
  keywords: string[];
  creditCost: number;
  isFree: boolean;
  isPremium: boolean;
  isActive: boolean;
  sortOrder: number;
  objectSpecificDescription: string;
  generationDescriptor: string;
  backendPrompt: string;
  negativePrompt: string;
  variationProfile: AssetVariationProfile;
  visualType: "svg";
  iconPath: string;
  emoji: string;
  mark?: string;
};

export type AddAsset = CircleAddAsset;

const INTEGRATE =
  "Match camera angle, perspective, depth of field, and sharpness of the source photograph. " +
  "Match lighting direction, intensity, color temperature, exposure, and shadow softness. " +
  "Infer realistic scale from surrounding objects and the editable region; do not stretch the object to fill the mask. " +
  "Establish natural ground or surface contact with realistic contact shadows; no floating. " +
  "Match material response, reflections, and occlusion. Preserve unmasked pixels. " +
  "Edit only the white mask; leave every black pixel unchanged. " +
  "Do not regenerate the scene or add extra copies. The object must look photographed in the original scene, not like a sticker or cutout.";

const NEG =
  "extra objects, multiple copies, sticker, cutout, floating, wrong perspective, text, watermark, artifacts";

const ICON = {
  giraffe: "M28 8c2 0 4 2 5 6l2 10 3-2 2 3-4 3v8l4 18h-5l-3-12-2 12h-5l2-14v-8c-4 0-6-4-5-8 1-4 4-6 6-6z",
  sunflower: "M32 18c-2 0-4 2-4 4 0 1 .5 2 1 3h-6c-2 0-3 2-2 4l2 2c-2 1-3 3-2 5l3 1c-1 2 0 4 2 5l2-1v6h4v-6z",
  dog: "M18 28c0-6 4-10 10-10h4c4 0 6 2 8 5l4-3 2 3-3 4v6c0 6-4 12-10 12s-10-4-12-10z",
  car: "M12 36l6-12h28l6 12v8H12v-8zm8 10a4 4 0 110-8 4 4 0 010 8zm24 0a4 4 0 110-8 4 4 0 010 8z",
  butterfly: "M32 32c-6-10-16-14-20-8-3 5 2 12 10 14-4 6-2 12 4 10 4-1 6-6 6-10z",
} as const;

function coreAsset(
  id: string,
  name: string,
  category: string,
  categoryLabel: string,
  creditCost: number,
  desc: string,
  styles: string[],
  colors: string[],
  iconPath: string,
  mark: string,
  sortOrder: number,
): CircleAddAsset {
  return {
    id, name, slug: id, label: name, category, categoryLabel,
    tags: [category], keywords: [name.toLowerCase(), id.replace(/_/g, " ")],
    creditCost, isFree: false, isPremium: creditCost >= 40, isActive: true, sortOrder,
    objectSpecificDescription: desc, generationDescriptor: desc,
    backendPrompt:
      `Add exactly one realistic ${name.toLowerCase()} inside the user-selected masked region. ${desc} ` + INTEGRATE,
    negativePrompt: `multiple ${name.toLowerCase()}s, ${NEG}`,
    variationProfile: {
      enabled: true, styles, colors,
      sceneAdaptation: true, scaleAdaptation: true, lightingAdaptation: true,
    },
    visualType: "svg", iconPath, emoji: "", mark,
  };
}

const REGISTRY: CircleAddAsset[] = [
  coreAsset("animal_giraffe", "Giraffe", "animals", "Animals", 35,
    "Long neck, distinctive coat pattern, natural posture, anatomically correct proportions, scene-correct scale.",
    ["adult giraffe standing", "adult giraffe with slight neck curve"],
    ["classic tan and brown pattern", "warmer amber pattern"], ICON.giraffe, "GI", 1),
  coreAsset("flower_sunflower", "Sunflower", "nature", "Nature", 10,
    "Large petals, dark seed center, natural stem if space allows, botanically plausible proportions.",
    ["single bloom facing camera", "three-quarter bloom"],
    ["bright yellow petals dark center", "golden-yellow petals"], ICON.sunflower, "SF", 2),
  coreAsset("animal_dog", "Dog", "animals", "Animals", 20,
    "Natural posture, realistic fur, correct anatomy, photographic realism, scale from scene.",
    ["small companion dog", "medium retriever-type dog", "shepherd-type dog"],
    ["black coat", "golden coat", "brown coat", "white coat"], ICON.dog, "DG", 3),
  coreAsset("vehicle_car", "Car", "vehicles", "Vehicles", 40,
    "Photographed passenger vehicle with ground contact, tire shadows, body reflections, correct road perspective. No brand logos.",
    ["modern sedan", "hatchback", "compact SUV", "luxury sedan"],
    ["black", "white", "silver", "dark blue", "red"], ICON.car, "CR", 4),
  coreAsset("insect_butterfly", "Butterfly", "animals", "Animals", 10,
    "Natural wing pattern, correct insect proportions, delicate scale matching the scene.",
    ["wings partially open", "wings fully open"],
    ["orange and black", "blue and black", "yellow and black"], ICON.butterfly, "BF", 5),
];

function mergeAddRegistry(): CircleAddAsset[] {
  const byId = new Map<string, CircleAddAsset>();
  for (const a of parseSeedAssets()) byId.set(a.id, a);
  for (const a of REGISTRY) byId.set(a.id, a);
  return Array.from(byId.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

export const ADD_ASSETS: CircleAddAsset[] = mergeAddRegistry();

export function getAddAssetCount(): number {
  return ADD_ASSETS.filter((a) => a.isActive).length;
}

export const ADD_ASSET_CATEGORIES = Array.from(
  new Map(ADD_ASSETS.map((a) => [a.category, a.categoryLabel])).entries(),
).map(([id, label]) => ({ id, label }));

const LEGACY_ID_MAP: Record<string, string> = {
  giraffe: "animal_giraffe", sunflower: "flower_sunflower", dog: "animal_dog",
  car: "vehicle_car", butterfly: "insect_butterfly",
};

export function findAddAsset(id: string | null | undefined): CircleAddAsset | null {
  if (!id) return null;
  const key = LEGACY_ID_MAP[id] ?? id;
  return ADD_ASSETS.find((a) => a.id === key || a.slug === key) ?? null;
}

export function searchAddAssets(query: string, categoryId?: string | null): CircleAddAsset[] {
  let list = ADD_ASSETS.filter((a) => a.isActive);
  if (categoryId) list = list.filter((a) => a.category === categoryId);
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (a) =>
      a.name.toLowerCase().includes(q) || a.id.includes(q) ||
      a.keywords.some((k) => k.includes(q)) || a.tags.some((t) => t.includes(q)) ||
      a.categoryLabel.toLowerCase().includes(q),
  );
}

export function hashSeed(input: string | number): number {
  const s = String(input);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type ResolvedVariation = {
  seed: number;
  style: string | null;
  color: string | null;
  variationLine: string;
};

export function resolveAssetVariation(asset: CircleAddAsset, seed?: number | null): ResolvedVariation {
  const s =
    seed != null && Number.isFinite(seed)
      ? seed >>> 0
      : hashSeed(`${asset.id}:${Date.now()}:${Math.random()}`) >>> 0;
  const profile = asset.variationProfile;
  if (!profile?.enabled) return { seed: s, style: null, color: null, variationLine: "" };
  const style = profile.styles.length > 0 ? profile.styles[s % profile.styles.length] : null;
  const color =
    profile.colors.length > 0
      ? profile.colors[Math.floor(s / Math.max(1, profile.styles.length || 1)) % profile.colors.length]
      : null;
  const parts: string[] = [];
  if (style) parts.push(`Style: ${style}`);
  if (color) parts.push(`Color: ${color}`);
  const variationLine = parts.length
    ? `Controlled variation — ${parts.join("; ")}. Prefer when scene-compatible; adapt toward realism over breaking perspective.`
    : "";
  return { seed: s, style, color, variationLine };
}

export function buildAddPrompt(opts: {
  asset: CircleAddAsset | null;
  userDetail: string;
  variation?: ResolvedVariation | null;
}): string {
  const detail = opts.userDetail.trim();
  if (opts.asset) {
    const chunks = [opts.asset.backendPrompt];
    if (opts.variation?.variationLine) chunks.push(opts.variation.variationLine);
    if (detail) chunks.push(`Additional detail from user: ${detail}`);
    return chunks.join(" ");
  }
  if (detail) return `Add exactly one realistic ${detail} inside the user-selected masked region. ${INTEGRATE}`;
  return `Add exactly one requested object inside the user-selected masked region. ${INTEGRATE}`;
}
