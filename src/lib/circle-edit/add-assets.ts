/**
 * Circle 2edit — curated launch Add catalog (50 high-quality assets).
 * Each asset has its own backendPrompt. creditCost is persisted (never randomized).
 * Frontend sends assetId only; backend resolves prompt + price.
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

/** Strict mask-preserving template — used for every asset. */
const maskPreserve = (name: string, appearance: string) =>
  [
    `Add exactly one realistic ${name} inside the user-selected masked region.`,
    `The ${name} must be naturally integrated into the existing scene.`,
    "Preserve the original image outside the mask.",
    "Do not modify, remove, replace, repaint, or regenerate any unmasked area.",
    "Preserve the existing architecture, railing, walls, floor, lighting, camera perspective, colors, textures, and all unrelated objects.",
    "Match the perspective, scale, lighting, shadows, depth of field, and color temperature of the original photograph.",
    `Only generate the requested ${name} inside the selected region.`,
    "Do not add any additional animals, people, objects, structures, furniture, railings, scenery, or decorative elements.",
    `Object-specific appearance: ${appearance}.`,
    "Edit ONLY the white masked area. Preserve every unmasked pixel exactly.",
  ].join(" ");

const CAT_ICON: Record<string, string> = {
  animals: "M20 28c0-6 4-10 12-10s12 4 12 10v8c0 8-5 14-12 14s-12-6-12-14v-8z",
  birds: "M12 32c8-12 20-16 28-8 4 4 6 12 2 18-8 4-18 2-24-4l-6-6z",
  nature: "M32 8c-6 10-18 18-18 32a18 18 0 0036 0c0-14-12-22-18-32z",
  objects: "M14 34h36v6H14v-6zm4-16h28v16H18V18z",
  food: "M16 28h32v4c0 12-7 20-16 20s-16-8-16-20v-4z",
  vehicles: "M10 36l6-12h32l6 12v8H10v-8zm8 10a4 4 0 110-8 4 4 0 010 8zm28 0a4 4 0 110-8 4 4 0 010 8z",
};

type Seed = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  creditCost: number;
  appearance: string;
};

/** Exactly the 50 launch objects from product spec. */
const SEEDS: Seed[] = [
  { id: "giraffe", name: "Giraffe", category: "animals", categoryLabel: "Animals", creditCost: 35, appearance: "one full-body realistic giraffe with long neck, distinctive coat pattern, natural posture, correct scale for the scene" },
  { id: "elephant", name: "Elephant", category: "animals", categoryLabel: "Animals", creditCost: 40, appearance: "one realistic African elephant with wrinkled skin, large ears, and tusks" },
  { id: "lion", name: "Lion", category: "animals", categoryLabel: "Animals", creditCost: 35, appearance: "one realistic adult lion with full mane and natural feline posture" },
  { id: "tiger", name: "Tiger", category: "animals", categoryLabel: "Animals", creditCost: 40, appearance: "one realistic tiger with orange coat and black stripes" },
  { id: "panda", name: "Panda", category: "animals", categoryLabel: "Animals", creditCost: 30, appearance: "one realistic giant panda with black-and-white fur" },
  { id: "bear", name: "Bear", category: "animals", categoryLabel: "Animals", creditCost: 30, appearance: "one realistic brown bear with thick fur" },
  { id: "wolf", name: "Wolf", category: "animals", categoryLabel: "Animals", creditCost: 30, appearance: "one realistic grey wolf standing naturally" },
  { id: "fox", name: "Fox", category: "animals", categoryLabel: "Animals", creditCost: 25, appearance: "one realistic red fox with bushy tail" },
  { id: "deer", name: "Deer", category: "animals", categoryLabel: "Animals", creditCost: 30, appearance: "one realistic deer with antlers" },
  { id: "horse", name: "Horse", category: "animals", categoryLabel: "Animals", creditCost: 30, appearance: "one realistic horse standing in natural pose" },
  { id: "zebra", name: "Zebra", category: "animals", categoryLabel: "Animals", creditCost: 35, appearance: "one realistic zebra with black-and-white stripes" },
  { id: "cow", name: "Cow", category: "animals", categoryLabel: "Animals", creditCost: 25, appearance: "one realistic dairy cow" },
  { id: "dog", name: "Dog", category: "animals", categoryLabel: "Animals", creditCost: 20, appearance: "one realistic medium-sized dog" },
  { id: "cat", name: "Cat", category: "animals", categoryLabel: "Animals", creditCost: 15, appearance: "one realistic domestic cat" },
  { id: "rabbit", name: "Rabbit", category: "animals", categoryLabel: "Animals", creditCost: 15, appearance: "one realistic rabbit with soft fur" },
  { id: "eagle", name: "Eagle", category: "birds", categoryLabel: "Birds", creditCost: 30, appearance: "one realistic eagle with spread wings or perched" },
  { id: "parrot", name: "Parrot", category: "birds", categoryLabel: "Birds", creditCost: 25, appearance: "one realistic colorful parrot" },
  { id: "owl", name: "Owl", category: "birds", categoryLabel: "Birds", creditCost: 25, appearance: "one realistic owl with large eyes" },
  { id: "flamingo", name: "Flamingo", category: "birds", categoryLabel: "Birds", creditCost: 30, appearance: "one realistic pink flamingo" },
  { id: "peacock", name: "Peacock", category: "birds", categoryLabel: "Birds", creditCost: 35, appearance: "one realistic peacock with open tail feathers" },
  { id: "rose", name: "Rose", category: "nature", categoryLabel: "Nature", creditCost: 10, appearance: "one realistic single red rose with natural petals and stem" },
  { id: "sunflower", name: "Sunflower", category: "nature", categoryLabel: "Nature", creditCost: 10, appearance: "one realistic sunflower with large yellow petals and dark center" },
  { id: "lotus", name: "Lotus", category: "nature", categoryLabel: "Nature", creditCost: 12, appearance: "one realistic lotus flower" },
  { id: "palm-tree", name: "Palm Tree", category: "nature", categoryLabel: "Nature", creditCost: 15, appearance: "one realistic palm tree" },
  { id: "bonsai", name: "Bonsai", category: "nature", categoryLabel: "Nature", creditCost: 20, appearance: "one realistic bonsai tree in miniature form" },
  { id: "cactus", name: "Cactus", category: "nature", categoryLabel: "Nature", creditCost: 10, appearance: "one realistic cactus plant" },
  { id: "mushroom", name: "Mushroom", category: "nature", categoryLabel: "Nature", creditCost: 10, appearance: "one realistic mushroom" },
  { id: "leafy-plant", name: "Large Leafy Plant", category: "nature", categoryLabel: "Nature", creditCost: 12, appearance: "one realistic large leafy green plant" },
  { id: "chair", name: "Chair", category: "objects", categoryLabel: "Objects", creditCost: 15, appearance: "one realistic wooden or modern chair" },
  { id: "table", name: "Table", category: "objects", categoryLabel: "Objects", creditCost: 18, appearance: "one realistic table" },
  { id: "lamp", name: "Lamp", category: "objects", categoryLabel: "Objects", creditCost: 12, appearance: "one realistic table or floor lamp" },
  { id: "mirror", name: "Mirror", category: "objects", categoryLabel: "Objects", creditCost: 15, appearance: "one realistic mirror with frame" },
  { id: "vase", name: "Vase", category: "objects", categoryLabel: "Objects", creditCost: 10, appearance: "one realistic decorative vase" },
  { id: "clock", name: "Clock", category: "objects", categoryLabel: "Objects", creditCost: 12, appearance: "one realistic wall or table clock" },
  { id: "bicycle", name: "Bicycle", category: "objects", categoryLabel: "Objects", creditCost: 20, appearance: "one realistic bicycle" },
  { id: "suitcase", name: "Suitcase", category: "objects", categoryLabel: "Objects", creditCost: 15, appearance: "one realistic travel suitcase" },
  { id: "backpack", name: "Backpack", category: "objects", categoryLabel: "Objects", creditCost: 12, appearance: "one realistic backpack" },
  { id: "umbrella", name: "Umbrella", category: "objects", categoryLabel: "Objects", creditCost: 10, appearance: "one realistic open or closed umbrella" },
  { id: "apple", name: "Apple", category: "food", categoryLabel: "Food", creditCost: 8, appearance: "one realistic red apple" },
  { id: "orange", name: "Orange", category: "food", categoryLabel: "Food", creditCost: 8, appearance: "one realistic orange fruit" },
  { id: "strawberry", name: "Strawberry", category: "food", categoryLabel: "Food", creditCost: 8, appearance: "one realistic strawberry" },
  { id: "watermelon", name: "Watermelon", category: "food", categoryLabel: "Food", creditCost: 12, appearance: "one realistic watermelon" },
  { id: "pizza", name: "Pizza", category: "food", categoryLabel: "Food", creditCost: 15, appearance: "one realistic pizza slice or whole pizza" },
  { id: "sports-car", name: "Sports Car", category: "vehicles", categoryLabel: "Vehicles", creditCost: 45, appearance: "one realistic sports car" },
  { id: "motorcycle", name: "Motorcycle", category: "vehicles", categoryLabel: "Vehicles", creditCost: 35, appearance: "one realistic motorcycle" },
  { id: "scooter", name: "Scooter", category: "vehicles", categoryLabel: "Vehicles", creditCost: 25, appearance: "one realistic scooter" },
  { id: "vintage-car", name: "Vintage Car", category: "vehicles", categoryLabel: "Vehicles", creditCost: 40, appearance: "one realistic vintage classic car" },
  { id: "pickup-truck", name: "Pickup Truck", category: "vehicles", categoryLabel: "Vehicles", creditCost: 40, appearance: "one realistic pickup truck" },
  { id: "small-boat", name: "Small Boat", category: "vehicles", categoryLabel: "Vehicles", creditCost: 35, appearance: "one realistic small boat" },
  { id: "city-bike", name: "City Bike", category: "vehicles", categoryLabel: "Vehicles", creditCost: 20, appearance: "one realistic city bicycle" },
];

function buildAsset(seed: Seed, idx: number): CircleAddAsset {
  const isFree = seed.creditCost === 0;
  const creditCost = isFree ? 0 : Math.max(5, Math.min(100, seed.creditCost));
  const isPremium = !isFree && creditCost >= 55;
  return {
    id: seed.id,
    name: seed.name,
    slug: seed.id,
    label: seed.name,
    category: seed.category,
    categoryLabel: seed.categoryLabel,
    tags: [seed.category, ...(isFree ? ["free"] : []), ...(isPremium ? ["premium"] : [])],
    keywords: [seed.name.toLowerCase(), seed.category, seed.id.replace(/-/g, " ")],
    creditCost,
    isFree,
    isPremium,
    isActive: true,
    sortOrder: idx + 1,
    objectSpecificDescription: seed.appearance,
    generationDescriptor: seed.appearance,
    backendPrompt: maskPreserve(seed.name, seed.appearance),
    visualType: "svg",
    iconPath: CAT_ICON[seed.category] ?? CAT_ICON.nature!,
    mark: seed.name.slice(0, 2).toUpperCase(),
  };
}

export const ADD_ASSETS: CircleAddAsset[] = SEEDS.map(buildAsset);

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
  if (detail) return maskPreserve(detail, `a realistic ${detail}`);
  return maskPreserve("the requested object", "a realistic object matching the user request");
}
