/**
 * Circle 2edit Add — production registry.
 * Curated 21 + expanded extras + costume. Synonym-aware search.
 */
import { parseSeedAssets } from "./add-assets-seed";
import { CURATED_ADD_ASSETS } from "./curated-assets";
import { EXTRA_ADD_ASSETS } from "./curated-assets-extra";
import type { CircleAddAsset, AssetVariationProfile } from "./add-assets-types";

export type { CircleAddAsset, AssetVariationProfile, AssetFactor, AssetFactorOption, Motion2AIMode } from "./add-assets-types";
export type { AddAsset } from "./add-assets-types";

const USE_FULL_SEED = false;

const INTEGRATE =
  "Match camera angle, perspective, depth of field, and sharpness of the source photograph. " +
  "Match lighting direction, intensity, color temperature, exposure, and shadow softness. " +
  "Infer realistic scale from surrounding objects and the editable region; do not stretch the object to fill the mask. " +
  "Establish natural ground or surface contact with realistic contact shadows; no floating. " +
  "Match material response, reflections, and occlusion. Preserve unmasked pixels. " +
  "Edit only the white mask; leave every black pixel unchanged. " +
  "Do not regenerate the scene or add extra copies. The object must look photographed in the original scene, not like a sticker or cutout.";

function mergeAddRegistry(): CircleAddAsset[] {
  const byId = new Map<string, CircleAddAsset>();
  if (USE_FULL_SEED) {
    for (const a of parseSeedAssets()) byId.set(a.id, a);
  }
  for (const a of CURATED_ADD_ASSETS) byId.set(a.id, a);
  for (const a of EXTRA_ADD_ASSETS) byId.set(a.id, a);
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
  giraffe: "animal_deer",
  sunflower: "nature_tree",
  dog: "animal_dog",
  car: "vehicle_car",
  butterfly: "animal_bird",
  cat: "animal_cat",
  lifestyle_shoes: "obj_shoe",
  lifestyle_hat: "obj_hat",
  lifestyle_glasses: "obj_glasses",
  food_cake: "obj_cake",
  decor_vase: "obj_vase",
  object_bag: "obj_backpack",
  vehicle_truck: "vehicle_truck",
  nature_flower: "obj_flower",
  nature_plant: "obj_plant",
  nature_bush: "nature_tree",
  nature_rock: "nature_tree",
  nature_cactus: "nature_tree",
  nature_sunflower: "obj_flower",
};

/** Synonym expansion so search is not exact-name-only */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  car: ["vehicle", "auto", "automobile", "sedan", "suv"],
  vehicle: ["car", "auto", "truck", "van", "bus", "motorcycle"],
  auto: ["car", "vehicle", "automobile"],
  phone: ["mobile", "smartphone", "iphone", "cellphone"],
  mobile: ["phone", "smartphone"],
  smartphone: ["phone", "mobile"],
  bag: ["backpack", "rucksack", "travel bag", "luggage"],
  backpack: ["bag", "rucksack", "travel"],
  cake: ["dessert", "birthday", "pastry"],
  dessert: ["cake", "icecream", "ice cream"],
  dog: ["puppy", "canine"],
  cat: ["kitten", "feline"],
  flower: ["bloom", "rose", "floral"],
  plant: ["houseplant", "pot", "succulent"],
  coffee: ["cup", "latte", "espresso"],
  costume: ["outfit", "clothes", "clothing", "apparel"],
  outfit: ["costume", "clothes", "clothing"],
  male: ["men", "man", "mens"],
  female: ["women", "woman", "womens"],
  guitar: ["instrument", "music"],
  headphones: ["earphones", "headset", "audio"],
  football: ["soccer", "ball", "sport"],
  sofa: ["couch", "furniture"],
  gift: ["present", "box"],
  teddy: ["bear", "plush", "toy"],
};

export function findAddAsset(id: string | null | undefined): CircleAddAsset | null {
  if (!id) return null;
  const key = LEGACY_ID_MAP[id] ?? id;
  return ADD_ASSETS.find((a) => a.id === key || a.slug === key) ?? null;
}

function matchesQuery(a: CircleAddAsset, q: string): boolean {
  const hay = [
    a.name,
    a.id,
    a.slug,
    a.category,
    a.categoryLabel,
    ...a.keywords,
    ...a.tags,
  ]
    .join(" ")
    .toLowerCase();
  if (hay.includes(q)) return true;
  const expanded = SEARCH_SYNONYMS[q] ?? [];
  for (const syn of expanded) {
    if (hay.includes(syn)) return true;
  }
  // reverse: query synonym of a keyword
  for (const [term, syns] of Object.entries(SEARCH_SYNONYMS)) {
    if (syns.includes(q) && hay.includes(term)) return true;
  }
  return false;
}

export function searchAddAssets(query: string, categoryId?: string | null): CircleAddAsset[] {
  let list = ADD_ASSETS.filter((a) => a.isActive);
  if (categoryId) list = list.filter((a) => a.category === categoryId);
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((a) => matchesQuery(a, q));
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

export function resolveFactorPromptLines(
  asset: CircleAddAsset,
  factorSelection?: Record<string, string> | null,
): string[] {
  const lines: string[] = [];
  if (!factorSelection) return lines;
  const factors = asset.factors ?? [];
  for (const factor of factors) {
    const optionId = factorSelection[factor.id];
    if (!optionId) continue;
    const opt = factor.options.find((o) => o.id === optionId);
    if (opt?.prompt) lines.push(opt.prompt);
  }
  const motion = factorSelection["motion2ai"];
  if (motion && asset.motionModes?.includes(motion as never)) {
    const motionPrompts: Record<string, string> = {
      static: "neutral static pose appropriate for a still photograph",
      walking: "natural walking pose mid-stride for a still photograph",
      running: "natural running pose frozen in a still frame",
      sitting: "natural sitting posture",
      moving: "subtle sense of forward motion appropriate for a still frame",
      wind: "foliage or form gently affected by wind in a still photograph",
      flying: "natural in-flight posture for a still photograph",
    };
    const mp = motionPrompts[motion];
    if (mp) lines.push(`Motion2AI pose guidance (still image only, not video): ${mp}`);
  }
  return lines;
}

export function buildAddPrompt(opts: {
  asset: CircleAddAsset | null;
  userDetail: string;
  variation?: ResolvedVariation | null;
  factorSelection?: Record<string, string> | null;
}): string {
  const detail = opts.userDetail.trim();
  if (opts.asset) {
    const chunks = [opts.asset.backendPrompt];
    const factorLines = resolveFactorPromptLines(opts.asset, opts.factorSelection);
    if (factorLines.length) chunks.push(`Object characterization: ${factorLines.join("; ")}.`);
    if (opts.variation?.variationLine) chunks.push(opts.variation.variationLine);
    if (detail && detail !== "circle-add") {
      chunks.push(`Additional scene hint (non-authoritative): ${detail.slice(0, 200)}`);
    }
    return chunks.join(" ");
  }
  if (detail && detail !== "circle-add") {
    return `Add exactly one realistic ${detail} inside the user-selected masked region. ${INTEGRATE}`;
  }
  return `Add exactly one requested object inside the user-selected masked region. ${INTEGRATE}`;
}
