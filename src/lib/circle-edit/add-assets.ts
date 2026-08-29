import { CIRCLE_ADD_SEED_TSV as SEED_TSV } from "@/lib/circle-edit/circle-add-seed-tsv";

/**
 * Circle 2edit — 500 core Add assets (PDF seed catalog).
 * creditCost persisted in seed data — never randomized at request time.
 */

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
};

function parseSeeds(): CircleAddAsset[] {
  return SEED_TSV.split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const parts = line.split("\t");
      const id = parts[0]!;
      const name = parts[1]!;
      const category = parts[2]!;
      const categoryLabel = parts[3]!;
      const creditCostRaw = Number(parts[4]);
      const desc = parts.slice(5).join("\t");
      const isFree = creditCostRaw === 0;
      const creditCost = isFree ? 0 : Math.max(5, Math.min(100, creditCostRaw));
      const isPremium = !isFree && creditCost >= 55;
      return {
        id,
        name,
        slug: id,
        label: name,
        category,
        categoryLabel,
        tags: [category, ...(isFree ? ["free"] : []), ...(isPremium ? ["premium"] : [])],
        keywords: [name.toLowerCase(), category, id.replace(/-/g, " ")],
        creditCost,
        isFree,
        isPremium,
        isActive: true,
        sortOrder: idx + 1,
        objectSpecificDescription: desc,
        generationDescriptor: desc,
        backendPrompt: PROMPT_TEMPLATE(name, desc),
        visualType: "svg" as const,
        iconPath: CAT_ICON[category] ?? CAT_ICON.nature!,
        mark: name.slice(0, 2).toUpperCase(),
      };
    });
}

export const ADD_ASSETS: CircleAddAsset[] = parseSeeds();

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
