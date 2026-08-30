/**
 * Circle 2edit Add — CONTROLLED 5-ASSET REGISTRY (test phase).
 *
 * Frontend browsing metadata + server-authoritative backendPrompt + variationProfile.
 * Frontend MUST send assetId only; server resolves prompt via resolveCircleAddPrompt.
 * DO NOT expand beyond these 5 until Giraffe/Sunflower/Dog/Car/Butterfly all pass.
 *
 * Variation is SERVER-SIDE only (seed → style/color). User never picks style/color.
 * Scene compatibility always outranks random style/color.
 */

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

const ICON = {
  giraffe: "M28 8c2 0 4 2 5 6l2 10 3-2 2 3-4 3v8l4 18h-5l-3-12-2 12h-5l2-14v-8c-4 0-6-4-5-8 1-4 4-6 6-6z M33 14c1 0 2 1 2 2s-1 2-2 2",
  sunflower: "M32 18c-2 0-4 2-4 4 0 1 .5 2 1 3h-6c-2 0-3 2-2 4l2 2c-2 1-3 3-2 5l3 1c-1 2 0 4 2 5l2-1v6h4v-6l2 1c2-1 3-3 2-5l3-1c1-2 0-4-2-5l2-2c1-2 0-4-2-4h-6c.5-1 1-2 1-3 0-2-2-4-4-4zm0 14a4 4 0 110-8 4 4 0 010 8z",
  dog: "M18 28c0-6 4-10 10-10h4c4 0 6 2 8 5l4-3 2 3-3 4v6c0 6-4 12-10 12s-10-4-12-10l-2 2-3-2 2-4v-3zm8 4a2 2 0 110-4 2 2 0 010 4z",
  car: "M12 36l6-12h28l6 12v8H12v-8zm8 10a4 4 0 110-8 4 4 0 010 8zm24 0a4 4 0 110-8 4 4 0 010 8zM20 28h24l-2-6H22l-2 6z",
  butterfly: "M32 32c-6-10-16-14-20-8-3 5 2 12 10 14-4 6-2 12 4 10 4-1 6-6 6-10 0 4 2 9 6 10 6 2 8-4 4-10 8-2 13-9 10-14-4-6-14-2-20 8z",
} as const;

const INTEGRATE = [
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
].join(" ");

const NEG_BASE =
  "extra objects, multiple copies, duplicated object, changed person, changed face, changed clothing, changed architecture, changed railing, changed fence, changed background, scene regeneration, floating object, sinking object, sticker look, pasted cutout, flat lighting, wrong perspective, mismatched shadows, watermark, text, artifacts, blur";

const CAR_STYLES = [
  "modern sedan", "modern hatchback", "compact city car", "luxury sedan", "sports coupe",
  "crossover SUV", "compact SUV", "vintage 1950s sedan", "vintage 1960s sedan", "vintage 1970s coupe",
  "classic European-style saloon", "classic American-style sedan", "retro compact",
  "modern electric hatchback", "rugged off-road SUV", "pickup truck", "station wagon",
];

const CAR_COLORS = [
  "black", "white", "silver", "metallic grey", "dark blue", "navy", "red", "burgundy",
  "dark green", "forest green", "cream", "beige", "bronze", "brown", "orange", "pearl white",
];

const DOG_STYLES = [
  "small companion dog", "medium retriever-type dog", "shepherd-type dog",
  "hound-type dog", "terrier-type dog", "spaniel-type dog",
];

const DOG_COLORS = [
  "black coat", "white coat", "golden coat", "brown coat",
  "tan and white coat", "black and tan coat", "mixed brown coat", "cream coat",
];

const GIRAFFE_STYLES = [
  "adult giraffe standing", "adult giraffe with slight neck curve", "younger giraffe, slightly smaller proportions",
];

const GIRAFFE_COLORS = [
  "classic tan and brown reticulated pattern", "warmer amber and brown pattern", "softer cream and light-brown pattern",
];

const SUNFLOWER_STYLES = [
  "single bloom facing slightly toward camera", "single bloom in three-quarter view", "single bloom with a short natural stem",
];

const SUNFLOWER_COLORS = [
  "bright yellow petals with dark brown center", "golden-yellow petals with near-black center", "warm yellow-orange petals with dark center",
];

const BUTTERFLY_STYLES = [
  "butterfly with wings partially open", "butterfly with wings fully open", "butterfly resting with wings upright",
];

const BUTTERFLY_COLORS = [
  "orange and black wing pattern", "yellow and black wing pattern", "blue and black wing pattern",
  "white and black wing pattern", "brown and orange wing pattern",
];

const REGISTRY: CircleAddAsset[] = [
  {
    id: "animal_giraffe", name: "Giraffe", slug: "animal_giraffe", label: "Giraffe",
    category: "animals", categoryLabel: "Animals", tags: ["animals"],
    keywords: ["giraffe", "animal", "wildlife", "safari", "zoo"],
    creditCost: 35, isFree: false, isPremium: false, isActive: true, sortOrder: 1,
    objectSpecificDescription: "one full-body realistic giraffe",
    generationDescriptor: "one full-body realistic giraffe",
    backendPrompt: [
      "Add exactly one realistic giraffe inside the user-selected masked region.",
      "The giraffe must have a long neck, distinctive coat pattern, natural posture, and anatomically correct proportions.",
      "Choose scale from the surrounding scene and mask size so the animal reads as physically present in the photograph.",
      "The giraffe must remain entirely within or naturally intersect the selected editable region.",
      "Do not add any additional animal or object.", INTEGRATE,
    ].join(" "),
    negativePrompt: `multiple giraffes, extra animals, cartoon giraffe, ${NEG_BASE}`,
    variationProfile: { enabled: true, styles: GIRAFFE_STYLES, colors: GIRAFFE_COLORS, sceneAdaptation: true, scaleAdaptation: true, lightingAdaptation: true },
    visualType: "svg", iconPath: ICON.giraffe, emoji: "🦒", mark: "GI",
  },
  {
    id: "flower_sunflower", name: "Sunflower", slug: "flower_sunflower", label: "Sunflower",
    category: "nature", categoryLabel: "Nature", tags: ["nature", "flower"],
    keywords: ["sunflower", "flower", "plant", "yellow", "nature"],
    creditCost: 10, isFree: false, isPremium: false, isActive: true, sortOrder: 2,
    objectSpecificDescription: "one realistic sunflower",
    generationDescriptor: "one realistic sunflower",
    backendPrompt: [
      "Add exactly one realistic sunflower inside the user-selected masked region.",
      "Large petals, dark seed center, natural stem if space allows, botanically plausible proportions.",
      "Scale the flower to the scene and the painted region — a small mark yields a smaller bloom, not a giant flower filling the frame.",
      "The sunflower must remain entirely within or naturally intersect the selected editable region.",
      "Do not add any additional flowers or objects.", INTEGRATE,
    ].join(" "),
    negativePrompt: `multiple sunflowers, extra flowers, bouquet, ${NEG_BASE}`,
    variationProfile: { enabled: true, styles: SUNFLOWER_STYLES, colors: SUNFLOWER_COLORS, sceneAdaptation: true, scaleAdaptation: true, lightingAdaptation: true },
    visualType: "svg", iconPath: ICON.sunflower, emoji: "🌻", mark: "SF",
  },
  {
    id: "animal_dog", name: "Dog", slug: "animal_dog", label: "Dog",
    category: "animals", categoryLabel: "Animals", tags: ["animals"],
    keywords: ["dog", "puppy", "pet", "animal", "canine"],
    creditCost: 20, isFree: false, isPremium: false, isActive: true, sortOrder: 3,
    objectSpecificDescription: "one realistic dog",
    generationDescriptor: "one realistic dog",
    backendPrompt: [
      "Add exactly one realistic dog inside the user-selected masked region.",
      "Natural standing or relaxed posture, realistic fur, correct anatomy, eyes and muzzle coherent with photographic realism.",
      "Scale the dog from surrounding objects and the editable region so it belongs in the scene.",
      "The dog must remain entirely within or naturally intersect the selected editable region.",
      "Do not add any additional animals or objects.", INTEGRATE,
    ].join(" "),
    negativePrompt: `multiple dogs, extra animals, cats, cartoon dog, anthropomorphic, ${NEG_BASE}`,
    variationProfile: { enabled: true, styles: DOG_STYLES, colors: DOG_COLORS, sceneAdaptation: true, scaleAdaptation: true, lightingAdaptation: true },
    visualType: "svg", iconPath: ICON.dog, emoji: "🐕", mark: "DG",
  },
  {
    id: "vehicle_car", name: "Car", slug: "vehicle_car", label: "Car",
    category: "vehicles", categoryLabel: "Vehicles", tags: ["vehicles"],
    keywords: ["car", "vehicle", "auto", "automobile", "sedan"],
    creditCost: 40, isFree: false, isPremium: false, isActive: true, sortOrder: 4,
    objectSpecificDescription: "one realistic passenger vehicle",
    generationDescriptor: "one realistic passenger vehicle",
    backendPrompt: [
      "Add exactly one realistic passenger vehicle inside the user-selected masked region.",
      "The vehicle must look photographed in this scene — not a sticker, not a 3D render, not a line drawing, not a white silhouette.",
      "Match road/ground perspective so wheels sit on the surface with correct foreshortening.",
      "Tires must contact the ground naturally with a soft contact shadow matching the scene light.",
      "Body panels should show realistic reflections of the local environment and sky.",
      "Infer scale from the painted region and nearby objects (walls, people, other vehicles); do not force the car to fill the entire mask.",
      "The vehicle must remain entirely within or naturally intersect the selected editable region.",
      "Do not add any additional vehicles or objects.",
      "Do not use trademarked model names or brand logos.", INTEGRATE,
    ].join(" "),
    negativePrompt: `multiple cars, trucks fleet, motorcycles, white silhouette car, line drawing car, cartoon car, sticker, logo, brand emblem, floating vehicle, ${NEG_BASE}`,
    variationProfile: { enabled: true, styles: CAR_STYLES, colors: CAR_COLORS, sceneAdaptation: true, scaleAdaptation: true, lightingAdaptation: true },
    visualType: "svg", iconPath: ICON.car, emoji: "🚗", mark: "CR",
  },
  {
    id: "insect_butterfly", name: "Butterfly", slug: "insect_butterfly", label: "Butterfly",
    category: "animals", categoryLabel: "Animals", tags: ["animals", "insect"],
    keywords: ["butterfly", "insect", "wing", "moth", "nature"],
    creditCost: 10, isFree: false, isPremium: false, isActive: true, sortOrder: 5,
    objectSpecificDescription: "one realistic butterfly",
    generationDescriptor: "one realistic butterfly",
    backendPrompt: [
      "Add exactly one realistic butterfly inside the user-selected masked region.",
      "Natural wing pattern, correct insect proportions, delicate scale matching the scene.",
      "Scale from the painted region — typically small relative to people and architecture.",
      "The butterfly must remain entirely within or naturally intersect the selected editable region.",
      "Do not add any additional insects or objects.", INTEGRATE,
    ].join(" "),
    negativePrompt: `multiple butterflies, extra insects, birds, cartoon, ${NEG_BASE}`,
    variationProfile: { enabled: true, styles: BUTTERFLY_STYLES, colors: BUTTERFLY_COLORS, sceneAdaptation: true, scaleAdaptation: true, lightingAdaptation: true },
    visualType: "svg", iconPath: ICON.butterfly, emoji: "🦋", mark: "BF",
  },
];

export const ADD_ASSETS: CircleAddAsset[] = REGISTRY;

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

export function resolveAssetVariation(
  asset: CircleAddAsset,
  seed?: number | null,
): ResolvedVariation {
  const s = seed != null && Number.isFinite(seed) ? (seed >>> 0) : (hashSeed(`${asset.id}:${Date.now()}:${Math.random()}`) >>> 0);
  const profile = asset.variationProfile;
  if (!profile?.enabled) {
    return { seed: s, style: null, color: null, variationLine: "" };
  }
  const style = profile.styles.length > 0 ? profile.styles[s % profile.styles.length] : null;
  const color =
    profile.colors.length > 0
      ? profile.colors[Math.floor(s / Math.max(1, profile.styles.length || 1)) % profile.colors.length]
      : null;
  const parts: string[] = [];
  if (style) parts.push(`Style: ${style}`);
  if (color) parts.push(`Color: ${color}`);
  const variationLine = parts.length
    ? `Controlled variation for this generation — ${parts.join("; ")}. Prefer this variation when it remains compatible with the scene; if the scene strongly conflicts, adapt style/color slightly toward realism rather than breaking perspective or scale.`
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
  if (detail) {
    return `Add exactly one realistic ${detail} inside the user-selected masked region. ${INTEGRATE}`;
  }
  return `Add exactly one requested object inside the user-selected masked region. ${INTEGRATE}`;
}
