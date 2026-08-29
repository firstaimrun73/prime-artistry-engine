/**
 * Circle 2edit — 500 core Add assets (PDF seed catalog).
 * Data: core-assets-0..4.json — creditCost persisted, never randomized.
 */
import core0 from "@/lib/circle-edit/core-assets-0.json";
import core1 from "@/lib/circle-edit/core-assets-1.json";
import core2 from "@/lib/circle-edit/core-assets-2.json";
import core3 from "@/lib/circle-edit/core-assets-3.json";
import core4 from "@/lib/circle-edit/core-assets-4.json";

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
  visualType: "svg";
  iconPath: string;
  mark?: string;
};

export type AddAsset = CircleAddAsset;

const PROMPT_TEMPLATE = (name: string, desc: string) =>
  [
    `Add exactly one ${name} inside the user's masked region.`,
    "Place the object naturally inside the marked area and respect the mask boundaries.",
    "Match the original image's perspective, scale, camera angle, orientation, lighting direction, light intensity, color temperature, material appearance, shadows, reflections, depth of field, focus and scene style.",
    "Preserve everything outside the mask.",
    "Do not add duplicate objects.",
    "Do not place the object outside the mask.",
    "Do not modify unrelated subjects.",
    "Do not create text, logos, watermarks or unintended objects.",
    `Object to add: ${name}`,
    `Object-specific appearance: ${desc}`,
  ].join(" ");

const CAT_ICON: Record<string, string> = {
  nature: "M32 8c-6 10-18 18-18 32a18 18 0 0036 0c0-14-12-22-18-32z",
  animals: "M20 28c0-6 4-10 12-10s12 4 12 10v8c0 8-5 14-12 14s-12-6-12-14v-8z",
  food: "M16 28h32v4c0 12-7 20-16 20s-16-8-16-20v-4z",
  furniture: "M14 34h36v6H14v-6zm4-16h28v16H18V18z",
  fashion: "M24 12l8-4 8 4 6 10-6 2v24H24V24l-6-2 6-10z",
  vehicles: "M10 36l6-12h32l6 12v8H10v-8zm8 10a4 4 0 110-8 4 4 0 010 8zm28 0a4 4 0 110-8 4 4 0 010 8z",
  architecture: "M12 52V24l20-12 20 12v28H12z",
  tech: "M16 16h32v24H16V16zm12 28h8v4h-8v-4z",
  art: "M18 48L32 12l14 36H18z",
  travel: "M20 20h24v8l-4 24H24l-4-24v-8z",
  sports: "M32 12a20 20 0 100 40 20 20 0 000-40z",
  tools: "M28 12l8 8-16 16-8-8 16-16z",
  fantasy: "M32 8l4 14h14l-11 8 4 14-11-8-11 8 4-14-11-8h14z",
  celebration: "M32 12c8 0 12 8 12 16 0 12-12 24-12 24S20 40 20 28c0-8 4-16 12-16z",
  weather: "M20 36h28a10 10 0 10-4-16 12 12 0 00-22 4 8 8 0 00-2 12z",
  home: "M16 28l16-12 16 12v20H16V28z",
  objects: "M18 18h28v28H18V18z",
};

type Seed = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  creditCost: number;
  isFree: boolean;
  desc: string;
};

function finalize(r: Seed, sortOrder: number): CircleAddAsset {
  const isFree = r.isFree === true || r.creditCost === 0;
  const creditCost = isFree ? 0 : Math.max(5, Math.min(100, r.creditCost));
  const isPremium = !isFree && creditCost >= 55;
  const desc = r.desc;
  return {
    id: r.id,
    name: r.name,
    slug: r.id,
    label: r.name,
    category: r.category,
    categoryLabel: r.categoryLabel,
    tags: [r.category, ...(isFree ? ["free"] : []), ...(isPremium ? ["premium"] : [])],
    keywords: [r.name.toLowerCase(), r.category, r.id.replace(/-/g, " ")],
    creditCost,
    isFree,
    isPremium,
    isActive: true,
    sortOrder,
    objectSpecificDescription: desc,
    generationDescriptor: desc,
    backendPrompt: PROMPT_TEMPLATE(r.name, desc),
    visualType: "svg",
    iconPath: CAT_ICON[r.category] ?? CAT_ICON.objects!,
    mark: r.name.slice(0, 2).toUpperCase(),
  };
}

const ALL_SEEDS = [
  ...(core0 as Seed[]),
  ...(core1 as Seed[]),
  ...(core2 as Seed[]),
  ...(core3 as Seed[]),
  ...(core4 as Seed[]),
];

export const ADD_ASSETS: CircleAddAsset[] = ALL_SEEDS.map((s, i) => finalize(s, i + 1));

export const ADD_ASSET_CATEGORIES = Array.from(
  new Map(ADD_ASSETS.map((a) => [a.category, a.categoryLabel])).entries(),
).map(([id, label]) => ({ id, label }));

export function findAddAsset(id: string | null | undefined): CircleAddAsset | null {
  if (!id) return null;
  return ADD_ASSETS.find((a) => a.id === id || a.slug === id) ?? null;
}

export function searchAddAssets(query: string, categoryId?: string | null): CircleAddAsset[] {
  let list = ADD_ASSETS.filter((a) => a.isActive);
  if (categoryId) list = list.filter((a) => a.category === categoryId);
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.id.includes(q) ||
      a.keywords.some((k) => k.includes(q)) ||
      a.tags.some((t) => t.includes(q)) ||
      a.categoryLabel.toLowerCase().includes(q),
  );
}

export function buildAddPrompt(opts: {
  asset: CircleAddAsset | null;
  userDetail: string;
}): string {
  const detail = opts.userDetail.trim();
  if (opts.asset) {
    const base = opts.asset.backendPrompt;
    if (detail) return `${base} Additional detail from user: ${detail}`;
    return base;
  }
  if (detail) return PROMPT_TEMPLATE(detail, `a realistic ${detail}`);
  return PROMPT_TEMPLATE("the requested object", "a realistic object matching the user request");
}
