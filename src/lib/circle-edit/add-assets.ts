/**
 * Circle 2edit Add — CONTROLLED 5-ASSET REGISTRY (test phase).
 *
 * Frontend browsing metadata + server-authoritative backendPrompt.
 * Frontend MUST send assetId only; server resolves prompt via resolveCircleAddPrompt.
 * DO NOT expand beyond these 5 until Giraffe/Sunflower/Dog/Car/Butterfly all pass.
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
  /** Server-authoritative generation instructions. */
  backendPrompt: string;
  /** Server-side negative prompt for inpaint. */
  negativePrompt: string;
  visualType: "svg";
  /** Unique per-asset SVG path (viewBox 0 0 64 64). */
  iconPath: string;
  /** Emoji fallback for rail recognition. */
  emoji: string;
  mark?: string;
};

export type AddAsset = CircleAddAsset;

/** Unique silhouette paths — one distinct shape per asset. */
const ICON = {
  giraffe:
    "M28 8c2 0 4 2 5 6l2 10 3-2 2 3-4 3v8l4 18h-5l-3-12-2 12h-5l2-14v-8c-4 0-6-4-5-8 1-4 4-6 6-6z M33 14c1 0 2 1 2 2s-1 2-2 2",
  sunflower:
    "M32 18c-2 0-4 2-4 4 0 1 .5 2 1 3h-6c-2 0-3 2-2 4l2 2c-2 1-3 3-2 5l3 1c-1 2 0 4 2 5l2-1v6h4v-6l2 1c2-1 3-3 2-5l3-1c1-2 0-4-2-5l2-2c1-2 0-4-2-4h-6c.5-1 1-2 1-3 0-2-2-4-4-4zm0 14a4 4 0 110-8 4 4 0 010 8z",
  dog: "M18 28c0-6 4-10 10-10h4c4 0 6 2 8 5l4-3 2 3-3 4v6c0 6-4 12-10 12s-10-4-12-10l-2 2-3-2 2-4v-3zm8 4a2 2 0 110-4 2 2 0 010 4z",
  car: "M12 36l6-12h28l6 12v8H12v-8zm8 10a4 4 0 110-8 4 4 0 010 8zm24 0a4 4 0 110-8 4 4 0 010 8zM20 28h24l-2-6H22l-2 6z",
  butterfly:
    "M32 32c-6-10-16-14-20-8-3 5 2 12 10 14-4 6-2 12 4 10 4-1 6-6 6-10 0 4 2 9 6 10 6 2 8-4 4-10 8-2 13-9 10-14-4-6-14-2-20 8z",
} as const;

const PRESERVE =
  "Preserve the source image composition and modify only the white masked region. Match perspective, scale, depth, lighting, shadows, color temperature, camera characteristics and environmental conditions. Do not alter the person's face, body, clothing, hair, hands, architecture, railing, floor, wall, background or any unmasked region. Do not regenerate the entire scene. Edit ONLY the white mask; leave every black pixel unchanged.";

const NEG_BASE =
  "extra objects, multiple copies, duplicated object, changed person, changed face, changed clothing, changed architecture, changed railing, changed background, scene regeneration, unrelated objects, artifacts, blur, watermark, text";

/** Exactly five controlled test assets. */
const REGISTRY: CircleAddAsset[] = [
  {
    id: "animal_giraffe",
    name: "Giraffe",
    slug: "animal_giraffe",
    label: "Giraffe",
    category: "animals",
    categoryLabel: "Animals",
    tags: ["animals"],
    keywords: ["giraffe", "animal", "wildlife", "safari", "zoo"],
    creditCost: 35,
    isFree: false,
    isPremium: false,
    isActive: true,
    sortOrder: 1,
    objectSpecificDescription: "one full-body realistic giraffe",
    generationDescriptor: "one full-body realistic giraffe",
    backendPrompt: [
      "Add exactly one realistic giraffe inside the user-selected masked region.",
      "The giraffe must have a long neck, distinctive coat pattern, natural posture, and correct scale for the scene.",
      "The giraffe must remain entirely within or naturally intersect the selected editable region.",
      "Do not add any additional animal or object.",
      PRESERVE,
    ].join(" "),
    negativePrompt: `multiple giraffes, extra animals, ${NEG_BASE}`,
    visualType: "svg",
    iconPath: ICON.giraffe,
    emoji: "🦒",
    mark: "GI",
  },
  {
    id: "flower_sunflower",
    name: "Sunflower",
    slug: "flower_sunflower",
    label: "Sunflower",
    category: "nature",
    categoryLabel: "Nature",
    tags: ["nature", "flower"],
    keywords: ["sunflower", "flower", "plant", "yellow", "nature"],
    creditCost: 10,
    isFree: false,
    isPremium: false,
    isActive: true,
    sortOrder: 2,
    objectSpecificDescription: "one realistic sunflower",
    generationDescriptor: "one realistic sunflower",
    backendPrompt: [
      "Add exactly one realistic sunflower inside the user-selected masked region.",
      "The sunflower must have large yellow petals and a dark center, natural stem if space allows, correct scale for the scene.",
      "The sunflower must remain entirely within or naturally intersect the selected editable region.",
      "Do not add any additional flowers or objects.",
      PRESERVE,
    ].join(" "),
    negativePrompt: `multiple sunflowers, extra flowers, ${NEG_BASE}`,
    visualType: "svg",
    iconPath: ICON.sunflower,
    emoji: "🌻",
    mark: "SF",
  },
  {
    id: "animal_dog",
    name: "Dog",
    slug: "animal_dog",
    label: "Dog",
    category: "animals",
    categoryLabel: "Animals",
    tags: ["animals"],
    keywords: ["dog", "puppy", "pet", "animal", "canine"],
    creditCost: 20,
    isFree: false,
    isPremium: false,
    isActive: true,
    sortOrder: 3,
    objectSpecificDescription: "one realistic medium-sized dog",
    generationDescriptor: "one realistic medium-sized dog",
    backendPrompt: [
      "Add exactly one realistic medium-sized dog inside the user-selected masked region.",
      "Natural posture, correct scale for the scene, realistic fur and proportions.",
      "The dog must remain entirely within or naturally intersect the selected editable region.",
      "Do not add any additional animals or objects.",
      PRESERVE,
    ].join(" "),
    negativePrompt: `multiple dogs, extra animals, cats, ${NEG_BASE}`,
    visualType: "svg",
    iconPath: ICON.dog,
    emoji: "🐕",
    mark: "DG",
  },
  {
    id: "vehicle_car",
    name: "Car",
    slug: "vehicle_car",
    label: "Car",
    category: "vehicles",
    categoryLabel: "Vehicles",
    tags: ["vehicles"],
    keywords: ["car", "vehicle", "auto", "automobile", "sedan"],
    creditCost: 40,
    isFree: false,
    isPremium: false,
    isActive: true,
    sortOrder: 4,
    objectSpecificDescription: "one realistic passenger car",
    generationDescriptor: "one realistic passenger car",
    backendPrompt: [
      "Add exactly one realistic passenger car inside the user-selected masked region.",
      "Correct perspective, scale, and ground contact for the scene; natural reflections and shadows.",
      "The car must remain entirely within or naturally intersect the selected editable region.",
      "Do not add any additional vehicles or objects.",
      PRESERVE,
    ].join(" "),
    negativePrompt: `multiple cars, trucks, motorcycles, ${NEG_BASE}`,
    visualType: "svg",
    iconPath: ICON.car,
    emoji: "🚗",
    mark: "CR",
  },
  {
    id: "insect_butterfly",
    name: "Butterfly",
    slug: "insect_butterfly",
    label: "Butterfly",
    category: "animals",
    categoryLabel: "Animals",
    tags: ["animals", "insect"],
    keywords: ["butterfly", "insect", "wing", "moth", "nature"],
    creditCost: 10,
    isFree: false,
    isPremium: false,
    isActive: true,
    sortOrder: 5,
    objectSpecificDescription: "one realistic butterfly",
    generationDescriptor: "one realistic butterfly",
    backendPrompt: [
      "Add exactly one realistic butterfly inside the user-selected masked region.",
      "Open or partially open wings, natural colors, correct scale for the scene.",
      "The butterfly must remain entirely within or naturally intersect the selected editable region.",
      "Do not add any additional insects or objects.",
      PRESERVE,
    ].join(" "),
    negativePrompt: `multiple butterflies, extra insects, birds, ${NEG_BASE}`,
    visualType: "svg",
    iconPath: ICON.butterfly,
    emoji: "🦋",
    mark: "BF",
  },
];

export const ADD_ASSETS: CircleAddAsset[] = REGISTRY;

export const ADD_ASSET_CATEGORIES = Array.from(
  new Map(ADD_ASSETS.map((a) => [a.category, a.categoryLabel])).entries(),
).map(([id, label]) => ({ id, label }));

/** Stable IDs only — also accepts legacy short ids from earlier tests. */
const LEGACY_ID_MAP: Record<string, string> = {
  giraffe: "animal_giraffe",
  sunflower: "flower_sunflower",
  dog: "animal_dog",
  car: "vehicle_car",
  butterfly: "insect_butterfly",
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
      a.name.toLowerCase().includes(q) ||
      a.id.includes(q) ||
      a.keywords.some((k) => k.includes(q)) ||
      a.tags.some((t) => t.includes(q)) ||
      a.categoryLabel.toLowerCase().includes(q),
  );
}

/** Client display helper only — server must use resolveCircleAddPrompt. */
export function buildAddPrompt(opts: {
  asset: CircleAddAsset | null;
  userDetail: string;
}): string {
  const detail = opts.userDetail.trim();
  if (opts.asset) {
    if (detail) return `${opts.asset.backendPrompt} Additional detail from user: ${detail}`;
    return opts.asset.backendPrompt;
  }
  if (detail) {
    return `Add exactly one realistic ${detail} inside the user-selected masked region. ${PRESERVE}`;
  }
  return `Add exactly one requested object inside the user-selected masked region. ${PRESERVE}`;
}
