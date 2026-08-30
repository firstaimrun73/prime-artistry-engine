/**
 * Scalable Circle Add registry built from seed TSV (427+ objects).
 * Each row becomes a full asset with object-specific backend prompt + INTEGRATE rules.
 * Premium/core assets in add-assets.ts override same ids when present.
 */
import { CIRCLE_ADD_SEED_TSV } from "./circle-add-seed-tsv";
import type { CircleAddAsset, AssetVariationProfile } from "./add-assets-types";

export const INTEGRATE_BLOCK = [
  "Match the source photograph: camera angle, perspective, vanishing direction, focal length character, depth of field, and image sharpness.",
  "Match lighting direction, intensity, color temperature, exposure, ambient bounce, and existing shadow softness in the scene.",
  "Infer realistic scale from surrounding objects, ground plane, and the size of the editable region — do not stretch the object to fill the entire mask; place a scene-correct sized object inside the region.",
  "Establish natural ground or surface contact with realistic contact shadows and ambient occlusion; no floating, no sinking, no impossible angles.",
  "Add realistic material response: reflections, specular highlights, and surface texture consistent with the scene lighting.",
  "Respect occlusion: foreground elements that should sit in front of the object may partially cover it; do not destroy surrounding environment.",
  "Preserve the source image composition and modify only the white masked region.",
  "Do not alter any person's face, body, clothing, hair, hands, architecture, railing, fence, wall, floor, road, sky, trees, or any unmasked pixel.",
  "Do not regenerate the entire scene. Edit ONLY the white mask; leave every black pixel unchanged.",
  "Do not add extra copies of the object or unrelated objects outside the requested single instance.",
  "The result must look photographed in the original scene, not like a sticker, cutout, or pasted collage.",
].join(" ");

const NEG_BASE =
  "extra objects, multiple copies, duplicated object, changed person, changed face, changed clothing, changed architecture, scene regeneration, floating object, sinking object, sticker look, pasted cutout, flat lighting, wrong perspective, mismatched shadows, watermark, text, artifacts, blur";

const DEFAULT_VARIATION: AssetVariationProfile = {
  enabled: true,
  styles: ["natural scene-matched appearance"],
  colors: ["scene-compatible coloration"],
  sceneAdaptation: true,
  scaleAdaptation: true,
  lightingAdaptation: true,
};

/** Simple monoline path keys for UI (not emojis). */
const MARK_FROM_CATEGORY: Record<string, string> = {
  nature: "NT",
  animals: "AN",
  food: "FD",
  fashion: "FS",
  vehicles: "VH",
  architecture: "AR",
  furniture: "FN",
  tech: "TC",
  travel: "TV",
  art: "AT",
};

function slugToId(slug: string, category: string): string {
  const s = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (s.startsWith(category + "_")) return s;
  return `${category}_${s}`;
}

function buildBackendPrompt(descriptor: string, name: string): string {
  return [
    `Add exactly one realistic ${name} inside the user-selected masked region.`,
    descriptor.endsWith(".") ? descriptor : `${descriptor}.`,
    "Anatomically or structurally correct proportions, natural materials, and photographic realism.",
    "Scale from the surrounding scene and the painted region so the object belongs physically in the photograph.",
    "The object must remain entirely within or naturally intersect the selected editable region.",
    "Do not add any additional instances or unrelated objects.",
    INTEGRATE_BLOCK,
  ].join(" ");
}

export function parseSeedAssets(): CircleAddAsset[] {
  const out: CircleAddAsset[] = [];
  const seen = new Set<string>();
  for (const line of CIRCLE_ADD_SEED_TSV.split("\n")) {
    const parts = line.split("\t");
    if (parts.length < 6) continue;
    const [slug, name, category, categoryLabel, costRaw, descriptor] = parts;
    if (!slug || !name) continue;
    const id = slugToId(slug, category);
    if (seen.has(id)) continue;
    seen.add(id);
    const creditCost = Math.max(0, Math.min(100, parseInt(costRaw, 10) || 0));
    const isFree = creditCost === 0;
    out.push({
      id,
      name,
      slug: id,
      label: name,
      category,
      categoryLabel: categoryLabel || category,
      tags: [category],
      keywords: [name.toLowerCase(), slug.replace(/-/g, " "), category],
      creditCost: isFree ? 0 : Math.max(5, creditCost),
      isFree,
      isPremium: creditCost >= 40,
      isActive: true,
      sortOrder: out.length + 100,
      objectSpecificDescription: descriptor,
      generationDescriptor: descriptor,
      backendPrompt: buildBackendPrompt(descriptor, name),
      negativePrompt: `multiple ${name.toLowerCase()}s, ${NEG_BASE}`,
      variationProfile: DEFAULT_VARIATION,
      visualType: "svg",
      iconPath: "",
      emoji: "",
      mark: MARK_FROM_CATEGORY[category] || name.slice(0, 2).toUpperCase(),
    });
  }
  return out;
}
