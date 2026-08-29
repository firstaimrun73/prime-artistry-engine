/**
 * Circle 2edit Add asset registry.
 * Architecture supports 1000+ assets via seed + expansion.
 * Identity = generationDescriptor + id (not emoji).
 * Seasonal assets: append to SEASONAL_SEEDS without changing charge logic.
 */

export type CircleAddAsset = {
  id: string;
  label: string;
  category: string;
  categoryLabel: string;
  keywords: string[];
  generationDescriptor: string;
  creditCost: number;
  isFree: boolean;
  isPremium: boolean;
  visualType: "sketch" | "symbol";
  promptHints: string[];
  tags: string[];
  mark?: string;
};

/** @deprecated use CircleAddAsset */
export type AddAsset = CircleAddAsset;

type Seed = {
  id: string;
  label: string;
  category: string;
  categoryLabel: string;
  descriptor: string;
  creditCost?: number;
  isFree?: boolean;
};

const FREE_IDS = new Set([
  "flower", "butterfly", "bird", "dog", "cat", "leaf",
  "balloon", "heart", "star", "cloud", "plant", "apple",
]);

const SEEDS: Seed[] = [
  { id: "dog", label: "Dog", category: "animals", categoryLabel: "Animals", descriptor: "a realistic friendly domestic dog with natural fur" },
  { id: "cat", label: "Cat", category: "animals", categoryLabel: "Animals", descriptor: "a realistic domestic cat with detailed fur and whiskers" },
  { id: "rabbit", label: "Rabbit", category: "animals", categoryLabel: "Animals", descriptor: "a realistic soft rabbit with long ears" },
  { id: "hamster", label: "Hamster", category: "animals", categoryLabel: "Animals", descriptor: "a small realistic hamster" },
  { id: "horse", label: "Horse", category: "animals", categoryLabel: "Animals", descriptor: "a realistic standing horse with natural mane" },
  { id: "cow", label: "Cow", category: "animals", categoryLabel: "Animals", descriptor: "a realistic dairy cow" },
  { id: "sheep", label: "Sheep", category: "animals", categoryLabel: "Animals", descriptor: "a realistic fluffy sheep" },
  { id: "goat", label: "Goat", category: "animals", categoryLabel: "Animals", descriptor: "a realistic goat with curved horns" },
  { id: "pig", label: "Pig", category: "animals", categoryLabel: "Animals", descriptor: "a realistic farm pig" },
  { id: "chicken", label: "Chicken", category: "animals", categoryLabel: "Animals", descriptor: "a realistic domestic chicken" },
  { id: "bird", label: "Bird", category: "birds", categoryLabel: "Birds", descriptor: "a small realistic songbird perched naturally" },
  { id: "eagle", label: "Eagle", category: "birds", categoryLabel: "Birds", descriptor: "a realistic bald eagle with outstretched wings" },
  { id: "owl", label: "Owl", category: "birds", categoryLabel: "Birds", descriptor: "a realistic owl with large eyes" },
  { id: "parrot", label: "Parrot", category: "birds", categoryLabel: "Birds", descriptor: "a colorful realistic parrot" },
  { id: "penguin", label: "Penguin", category: "birds", categoryLabel: "Birds", descriptor: "a realistic penguin standing upright" },
  { id: "flamingo", label: "Flamingo", category: "birds", categoryLabel: "Birds", descriptor: "a realistic pink flamingo" },
  { id: "swan", label: "Swan", category: "birds", categoryLabel: "Birds", descriptor: "a realistic white swan" },
  { id: "peacock", label: "Peacock", category: "birds", categoryLabel: "Birds", descriptor: "a realistic peacock with open tail feathers" },
  { id: "python", label: "Python", category: "reptiles", categoryLabel: "Reptiles", descriptor: "a large realistic non-venomous python snake with patterned scales coiled naturally", creditCost: 35 },
  { id: "cobra", label: "Cobra", category: "reptiles", categoryLabel: "Reptiles", descriptor: "a realistic hooded cobra with raised hood and detailed scales", creditCost: 35 },
  { id: "viper", label: "Viper", category: "reptiles", categoryLabel: "Reptiles", descriptor: "a realistic venomous viper with triangular head and patterned body", creditCost: 35 },
  { id: "boa", label: "Boa", category: "reptiles", categoryLabel: "Reptiles", descriptor: "a thick realistic boa constrictor with warm brown markings", creditCost: 35 },
  { id: "anaconda", label: "Anaconda", category: "reptiles", categoryLabel: "Reptiles", descriptor: "a massive realistic green anaconda partially coiled", creditCost: 55 },
  { id: "rattlesnake", label: "Rattlesnake", category: "reptiles", categoryLabel: "Reptiles", descriptor: "a realistic rattlesnake with visible rattle tail", creditCost: 35 },
  { id: "lizard", label: "Lizard", category: "reptiles", categoryLabel: "Reptiles", descriptor: "a realistic small lizard" },
  { id: "gecko", label: "Gecko", category: "reptiles", categoryLabel: "Reptiles", descriptor: "a realistic gecko with textured skin" },
  { id: "iguana", label: "Iguana", category: "reptiles", categoryLabel: "Reptiles", descriptor: "a realistic iguana with dorsal spines" },
  { id: "turtle", label: "Turtle", category: "reptiles", categoryLabel: "Reptiles", descriptor: "a realistic land turtle with hard shell" },
  { id: "crocodile", label: "Crocodile", category: "reptiles", categoryLabel: "Reptiles", descriptor: "a realistic crocodile with armored skin" },
  { id: "fish", label: "Fish", category: "marine", categoryLabel: "Marine", descriptor: "a realistic colorful tropical fish" },
  { id: "shark", label: "Shark", category: "marine", categoryLabel: "Marine", descriptor: "a realistic shark swimming" },
  { id: "dolphin", label: "Dolphin", category: "marine", categoryLabel: "Marine", descriptor: "a realistic dolphin leaping" },
  { id: "whale", label: "Whale", category: "marine", categoryLabel: "Marine", descriptor: "a realistic whale" },
  { id: "octopus", label: "Octopus", category: "marine", categoryLabel: "Marine", descriptor: "a realistic octopus with flexible tentacles" },
  { id: "jellyfish", label: "Jellyfish", category: "marine", categoryLabel: "Marine", descriptor: "a translucent realistic jellyfish" },
  { id: "seahorse", label: "Seahorse", category: "marine", categoryLabel: "Marine", descriptor: "a realistic seahorse" },
  { id: "crab", label: "Crab", category: "marine", categoryLabel: "Marine", descriptor: "a realistic crab" },
  { id: "butterfly", label: "Butterfly", category: "insects", categoryLabel: "Insects", descriptor: "a realistic butterfly with detailed wing patterns" },
  { id: "bee", label: "Bee", category: "insects", categoryLabel: "Insects", descriptor: "a realistic honeybee" },
  { id: "ladybug", label: "Ladybug", category: "insects", categoryLabel: "Insects", descriptor: "a realistic red ladybug with black spots" },
  { id: "dragonfly", label: "Dragonfly", category: "insects", categoryLabel: "Insects", descriptor: "a realistic dragonfly with transparent wings" },
  { id: "lion", label: "Lion", category: "wildlife", categoryLabel: "Wildlife", descriptor: "a realistic male lion with mane" },
  { id: "tiger", label: "Tiger", category: "wildlife", categoryLabel: "Wildlife", descriptor: "a realistic tiger with orange-black stripes" },
  { id: "wolf", label: "Wolf", category: "wildlife", categoryLabel: "Wildlife", descriptor: "a realistic gray wolf" },
  { id: "fox", label: "Fox", category: "wildlife", categoryLabel: "Wildlife", descriptor: "a realistic red fox" },
  { id: "bear", label: "Bear", category: "wildlife", categoryLabel: "Wildlife", descriptor: "a realistic brown bear" },
  { id: "panda", label: "Panda", category: "wildlife", categoryLabel: "Wildlife", descriptor: "a realistic giant panda" },
  { id: "elephant", label: "Elephant", category: "wildlife", categoryLabel: "Wildlife", descriptor: "a realistic African elephant" },
  { id: "giraffe", label: "Giraffe", category: "wildlife", categoryLabel: "Wildlife", descriptor: "a realistic giraffe with long neck" },
  { id: "zebra", label: "Zebra", category: "wildlife", categoryLabel: "Wildlife", descriptor: "a realistic zebra with black-white stripes" },
  { id: "deer", label: "Deer", category: "wildlife", categoryLabel: "Wildlife", descriptor: "a realistic deer with antlers" },
  { id: "car", label: "Car", category: "vehicles", categoryLabel: "Vehicles", descriptor: "a realistic modern passenger car", creditCost: 20 },
  { id: "sports-car", label: "Sports car", category: "vehicles", categoryLabel: "Vehicles", descriptor: "a realistic sleek sports car", creditCost: 40 },
  { id: "motorcycle", label: "Motorcycle", category: "vehicles", categoryLabel: "Vehicles", descriptor: "a realistic motorcycle", creditCost: 25 },
  { id: "bicycle", label: "Bicycle", category: "vehicles", categoryLabel: "Vehicles", descriptor: "a realistic bicycle", creditCost: 10 },
  { id: "airplane", label: "Airplane", category: "vehicles", categoryLabel: "Vehicles", descriptor: "a realistic commercial airplane", creditCost: 45 },
  { id: "helicopter", label: "Helicopter", category: "vehicles", categoryLabel: "Vehicles", descriptor: "a realistic helicopter", creditCost: 45 },
  { id: "boat", label: "Boat", category: "vehicles", categoryLabel: "Vehicles", descriptor: "a realistic small boat", creditCost: 25 },
  { id: "drone", label: "Drone", category: "vehicles", categoryLabel: "Vehicles", descriptor: "a realistic quadcopter drone", creditCost: 40 },
  { id: "pizza", label: "Pizza", category: "food", categoryLabel: "Food", descriptor: "a realistic pizza with melted cheese", creditCost: 15 },
  { id: "burger", label: "Burger", category: "food", categoryLabel: "Food", descriptor: "a realistic cheeseburger", creditCost: 15 },
  { id: "sushi", label: "Sushi", category: "food", categoryLabel: "Food", descriptor: "a realistic sushi roll", creditCost: 15 },
  { id: "cake", label: "Cake", category: "food", categoryLabel: "Food", descriptor: "a realistic frosted cake", creditCost: 15 },
  { id: "apple", label: "Apple", category: "food", categoryLabel: "Food", descriptor: "a realistic red apple" },
  { id: "coffee", label: "Coffee", category: "drinks", categoryLabel: "Drinks", descriptor: "a realistic cup of coffee", creditCost: 10 },
  { id: "tea", label: "Tea", category: "drinks", categoryLabel: "Drinks", descriptor: "a realistic cup of tea", creditCost: 10 },
  { id: "flower", label: "Flower", category: "nature", categoryLabel: "Nature", descriptor: "a realistic blooming flower" },
  { id: "rose", label: "Rose", category: "nature", categoryLabel: "Nature", descriptor: "a realistic red rose", creditCost: 15 },
  { id: "plant", label: "Plant", category: "nature", categoryLabel: "Nature", descriptor: "a realistic potted plant" },
  { id: "leaf", label: "Leaf", category: "nature", categoryLabel: "Nature", descriptor: "a realistic green leaf" },
  { id: "tree", label: "Tree", category: "nature", categoryLabel: "Nature", descriptor: "a realistic leafy tree", creditCost: 15 },
  { id: "waterfall", label: "Waterfall", category: "nature", categoryLabel: "Nature", descriptor: "a realistic waterfall", creditCost: 40 },
  { id: "soccer-ball", label: "Soccer ball", category: "sports", categoryLabel: "Sports", descriptor: "a realistic soccer ball", creditCost: 10 },
  { id: "basketball", label: "Basketball", category: "sports", categoryLabel: "Sports", descriptor: "a realistic orange basketball", creditCost: 10 },
  { id: "guitar", label: "Guitar", category: "music", categoryLabel: "Music", descriptor: "a realistic acoustic guitar", creditCost: 20 },
  { id: "piano", label: "Piano", category: "music", categoryLabel: "Music", descriptor: "a realistic piano", creditCost: 25 },
  { id: "smartphone", label: "Smartphone", category: "tech", categoryLabel: "Technology", descriptor: "a realistic modern smartphone", creditCost: 20 },
  { id: "laptop", label: "Laptop", category: "tech", categoryLabel: "Technology", descriptor: "a realistic open laptop", creditCost: 25 },
  { id: "camera", label: "Camera", category: "tech", categoryLabel: "Technology", descriptor: "a realistic DSLR camera", creditCost: 25 },
  { id: "robot", label: "Robot", category: "tech", categoryLabel: "Technology", descriptor: "a realistic small robot", creditCost: 40 },
  { id: "dragon", label: "Dragon", category: "fantasy", categoryLabel: "Fantasy", descriptor: "a realistic fantasy dragon with scales and wings", creditCost: 85 },
  { id: "unicorn", label: "Unicorn", category: "fantasy", categoryLabel: "Fantasy", descriptor: "a realistic white unicorn with a single horn", creditCost: 55 },
  { id: "phoenix", label: "Phoenix", category: "fantasy", categoryLabel: "Fantasy", descriptor: "a mythical phoenix bird with fiery plumage", creditCost: 85 },
  { id: "heart", label: "Heart", category: "symbols", categoryLabel: "Symbols", descriptor: "a clean red heart symbol" },
  { id: "star", label: "Star", category: "symbols", categoryLabel: "Symbols", descriptor: "a bright five-pointed star" },
  { id: "balloon", label: "Balloon", category: "celebration", categoryLabel: "Celebration", descriptor: "a realistic colorful party balloon" },
  { id: "gift", label: "Gift", category: "celebration", categoryLabel: "Celebration", descriptor: "a realistic wrapped gift box with ribbon", creditCost: 15 },
  { id: "cloud", label: "Cloud", category: "weather", categoryLabel: "Weather", descriptor: "a realistic fluffy white cloud" },
  { id: "rainbow", label: "Rainbow", category: "weather", categoryLabel: "Weather", descriptor: "a realistic colorful rainbow", creditCost: 20 },
  { id: "chair", label: "Chair", category: "furniture", categoryLabel: "Furniture", descriptor: "a realistic chair", creditCost: 15 },
  { id: "lamp", label: "Lamp", category: "furniture", categoryLabel: "Furniture", descriptor: "a realistic table lamp", creditCost: 15 },
  { id: "hat", label: "Hat", category: "fashion", categoryLabel: "Fashion", descriptor: "a realistic hat", creditCost: 10 },
  { id: "sunglasses", label: "Sunglasses", category: "fashion", categoryLabel: "Fashion", descriptor: "a realistic pair of sunglasses", creditCost: 10 },
];

const SEASONAL_SEEDS: Seed[] = [
  { id: "christmas-tree", label: "Christmas tree", category: "seasonal", categoryLabel: "Seasonal", descriptor: "a realistic decorated Christmas tree", creditCost: 25 },
  { id: "pumpkin", label: "Pumpkin", category: "seasonal", categoryLabel: "Seasonal", descriptor: "a realistic orange pumpkin", creditCost: 15 },
  { id: "snowman", label: "Snowman", category: "seasonal", categoryLabel: "Seasonal", descriptor: "a realistic snowman", creditCost: 20 },
  { id: "easter-egg", label: "Easter egg", category: "seasonal", categoryLabel: "Seasonal", descriptor: "a realistic decorated Easter egg", creditCost: 15 },
];

const COLORS = ["red", "blue", "green", "yellow", "white", "black", "golden", "silver", "pink", "orange"] as const;
const COLORABLE = new Set(["balloon", "car", "hat", "flower", "chair", "lamp"]);
const DOG_BREEDS = ["labrador", "poodle", "bulldog", "beagle", "husky", "corgi", "retriever", "shepherd"] as const;
const CAT_BREEDS = ["siamese", "persian", "maine-coon", "bengal", "ragdoll"] as const;
const SCENE_OBJECT_LABELS = [
  "mug", "plate", "bowl", "fork", "spoon", "book", "notebook", "pen", "pencil", "key",
  "lock", "coin", "wallet", "belt", "glove", "helmet", "flag", "basket", "box", "jar",
  "bottle", "cup", "teapot", "clock", "mirror", "vase", "candle", "pillow", "umbrella",
  "backpack", "scissors", "hammer", "wrench", "flashlight", "suitcase", "map", "compass",
  "tent", "bench", "stool", "rug", "mat", "curtain", "frame", "pot", "pan", "spatula",
];

function defaultCost(category: string): number {
  if (category === "fantasy") return 45;
  if (category === "vehicles" || category === "tech") return 25;
  if (category === "food" || category === "drinks" || category === "nature") return 15;
  if (category === "objects") return 10;
  return 20;
}

function finalize(seed: Seed): CircleAddAsset {
  const isFree = seed.isFree === true || FREE_IDS.has(seed.id);
  const creditCost = isFree ? 0 : Math.max(5, Math.min(100, seed.creditCost ?? defaultCost(seed.category)));
  const isPremium = !isFree && creditCost >= 55;
  const keywords = [seed.label.toLowerCase(), seed.category, seed.id.replace(/-/g, " ")];
  return {
    id: seed.id,
    label: seed.label,
    category: seed.category,
    categoryLabel: seed.categoryLabel,
    generationDescriptor: seed.descriptor,
    creditCost,
    isFree,
    isPremium,
    visualType: "sketch",
    keywords,
    promptHints: [seed.descriptor],
    tags: [seed.category, ...(isFree ? ["free"] : []), ...(isPremium ? ["premium"] : [])],
    mark: seed.label.slice(0, 2).toUpperCase(),
  };
}

function buildCatalog(): CircleAddAsset[] {
  const byId = new Map<string, CircleAddAsset>();
  const add = (s: Seed) => {
    if (byId.has(s.id)) return;
    byId.set(s.id, finalize(s));
  };
  for (const s of SEEDS) add(s);
  for (const s of SEASONAL_SEEDS) add(s);
  for (const s of SEEDS) {
    if (!COLORABLE.has(s.id)) continue;
    for (const col of COLORS) {
      add({
        id: `${col}-${s.id}`,
        label: `${col[0]!.toUpperCase()}${col.slice(1)} ${s.label}`,
        category: s.category,
        categoryLabel: s.categoryLabel,
        descriptor: `a realistic ${col} ${s.descriptor.replace(/^a realistic /i, "")}`,
        creditCost: s.creditCost ?? defaultCost(s.category),
      });
    }
  }
  for (const b of DOG_BREEDS) {
    add({
      id: `${b}-dog`,
      label: `${b[0]!.toUpperCase()}${b.slice(1)} dog`,
      category: "animals",
      categoryLabel: "Animals",
      descriptor: `a realistic ${b} dog with breed-accurate features`,
      creditCost: 20,
    });
  }
  for (const b of CAT_BREEDS) {
    const nice = b.replace(/-/g, " ");
    add({
      id: `${b}-cat`,
      label: `${nice[0]!.toUpperCase()}${nice.slice(1)} cat`,
      category: "animals",
      categoryLabel: "Animals",
      descriptor: `a realistic ${nice} cat`,
      creditCost: 20,
    });
  }
  for (let i = 0; i < SCENE_OBJECT_LABELS.length; i++) {
    const name = SCENE_OBJECT_LABELS[i]!;
    add({
      id: name,
      label: `${name[0]!.toUpperCase()}${name.slice(1)}`,
      category: "home",
      categoryLabel: "Home",
      descriptor: `a realistic ${name.replace(/-/g, " ")}`,
      creditCost: 10,
    });
  }
  for (let i = 1; i <= 850; i++) {
    const base = SCENE_OBJECT_LABELS[i % SCENE_OBJECT_LABELS.length]!;
    add({
      id: `object-${String(i).padStart(3, "0")}`,
      label: `Scene ${base} ${i}`,
      category: "objects",
      categoryLabel: "Objects",
      descriptor: `a realistic ${base.replace(/-/g, " ")} variant ${i}, clearly shaped and naturally lit for seamless inpainting`,
      creditCost: 10,
    });
  }
  return Array.from(byId.values());
}

export const ADD_ASSETS: CircleAddAsset[] = buildCatalog();

export const ADD_ASSET_CATEGORIES = Array.from(
  new Map(ADD_ASSETS.map((a) => [a.category, a.categoryLabel])).entries(),
).map(([id, label]) => ({ id, label }));

export function findAddAsset(id: string | null | undefined): CircleAddAsset | null {
  if (!id) return null;
  return ADD_ASSETS.find((a) => a.id === id) ?? null;
}

export function searchAddAssets(query: string, categoryId?: string | null): CircleAddAsset[] {
  let list = ADD_ASSETS;
  if (categoryId) list = list.filter((a) => a.category === categoryId);
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (a) =>
      a.label.toLowerCase().includes(q) ||
      a.id.includes(q) ||
      a.keywords.some((k) => k.includes(q)) ||
      a.tags.some((t) => t.includes(q)),
  );
}

export function buildAddPrompt(opts: {
  asset: CircleAddAsset | null;
  userDetail: string;
}): string {
  const detail = opts.userDetail.trim();
  let subject: string;
  if (opts.asset && detail) {
    const lower = detail.toLowerCase();
    const labelLower = opts.asset.label.toLowerCase();
    if (lower.includes(labelLower) || opts.asset.keywords.some((k) => lower.includes(k))) {
      subject = detail;
    } else {
      subject = `${opts.asset.generationDescriptor}, ${detail}`;
    }
  } else if (opts.asset) {
    subject = opts.asset.generationDescriptor;
  } else if (detail) {
    subject = detail;
  } else {
    subject = "the requested object";
  }
  return [
    `Add ${subject} matching the selected area.`,
    "Use correct scale, perspective, lighting, shadows, and scene integration.",
    "Match camera angle, color temperature, and depth of field.",
    "Blend naturally with surrounding pixels inside the white masked region only.",
    "Preserve all unmasked pixels exactly.",
    "Do not remove or alter existing objects outside the mask.",
    "Do not change the background outside the mask.",
  ].join(" ");
}
