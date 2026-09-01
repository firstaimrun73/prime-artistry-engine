/** Extra Circle 2edit assets + Costume. 3D visuals via AssetVisual (no emoji). */
import type { CircleAddAsset, AssetFactor, Motion2AIMode } from "./add-assets-types";

const INTEGRATE =
  "Match camera angle, perspective, depth of field, and sharpness of the source photograph. " +
  "Match lighting direction, intensity, color temperature, exposure, and shadow softness. " +
  "Infer realistic scale from surrounding objects and the editable region; do not stretch the object to fill the mask. " +
  "Establish natural ground or surface contact with realistic contact shadows; no floating. " +
  "Match material response, reflections, and occlusion. Preserve unmasked pixels. " +
  "Edit only the white mask; leave every black pixel unchanged. " +
  "Do not regenerate the scene or add extra copies. The object must look photographed in the original scene, not like a sticker or cutout.";

function factor(
  id: string,
  label: string,
  options: { id: string; label: string; prompt: string }[],
): AssetFactor {
  return { id, label, options };
}

const OUTFIT_FACTORS: AssetFactor[] = [
  factor("style", "Style", [
    { id: "casual", label: "Casual", prompt: "casual everyday outfit" },
    { id: "formal", label: "Formal", prompt: "formal attire" },
    { id: "business", label: "Business", prompt: "business professional clothing" },
    { id: "jacket", label: "Jacket", prompt: "outfit with a jacket" },
    { id: "hoodie", label: "Hoodie", prompt: "casual hoodie outfit" },
    { id: "sportswear", label: "Sportswear", prompt: "athletic sportswear" },
    { id: "traditional", label: "Traditional", prompt: "traditional cultural clothing, non-specific" },
    { id: "summer", label: "Summer", prompt: "light summer clothing" },
    { id: "winter", label: "Winter", prompt: "warm winter clothing" },
    { id: "streetwear", label: "Streetwear", prompt: "modern streetwear" },
  ]),
  factor("color", "Color", [
    { id: "neutral", label: "Neutral", prompt: "neutral tones" },
    { id: "dark", label: "Dark", prompt: "dark tones" },
    { id: "light", label: "Light", prompt: "light tones" },
    { id: "colorful", label: "Colorful", prompt: "subtle color accents" },
  ]),
];

function mk(
  id: string,
  name: string,
  category: string,
  categoryLabel: string,
  desc: string,
  opts: {
    creditCost?: number;
    factors?: AssetFactor[];
    motionModes?: Motion2AIMode[];
    sortOrder: number;
    keywords?: string[];
  },
): CircleAddAsset {
  const creditCost = opts.creditCost ?? 0;
  return {
    id,
    name,
    slug: id,
    label: name,
    category,
    categoryLabel,
    tags: [category],
    keywords: [name.toLowerCase(), id.replace(/_/g, " "), ...(opts.keywords ?? [])],
    creditCost,
    isFree: creditCost === 0,
    isPremium: creditCost >= 30,
    isActive: true,
    sortOrder: opts.sortOrder,
    objectSpecificDescription: desc,
    generationDescriptor: desc,
    backendPrompt: `Add exactly one realistic ${name.toLowerCase()} inside the user-selected masked region. ${desc} ${INTEGRATE}`,
    negativePrompt: `multiple ${name.toLowerCase()}s, extra objects, sticker, cutout, floating, wrong perspective, wrong scale, text, watermark, artifacts, background replacement, identifiable real person, celebrity likeness`,
    variationProfile: {
      enabled: false,
      styles: [],
      colors: [],
      sceneAdaptation: true,
      scaleAdaptation: true,
      lightingAdaptation: true,
    },
    visualType: "svg",
    iconPath: "",
    emoji: "",
    mark: name.slice(0, 2).toUpperCase(),
    factors: opts.factors,
    motionModes: opts.motionModes ?? ["static"],
    motionCapable: !!(opts.motionModes && opts.motionModes.length > 1),
  };
}

export const EXTRA_ADD_ASSETS: CircleAddAsset[] = [
  mk("obj_flower", "Flower", "objects", "Objects", "A single flower with natural petals and stem, photorealistic.", {
    sortOrder: 40,
    keywords: ["bloom", "rose", "floral"],
    factors: [
      factor("type", "Type", [
        { id: "rose", label: "Rose", prompt: "rose flower" },
        { id: "tulip", label: "Tulip", prompt: "tulip flower" },
        { id: "sunflower", label: "Sunflower", prompt: "sunflower" },
        { id: "daisy", label: "Daisy", prompt: "daisy flower" },
      ]),
      factor("color", "Color", [
        { id: "red", label: "Red", prompt: "red petals" },
        { id: "pink", label: "Pink", prompt: "pink petals" },
        { id: "yellow", label: "Yellow", prompt: "yellow petals" },
        { id: "white", label: "White", prompt: "white petals" },
      ]),
    ],
    motionModes: ["static", "wind"],
  }),
  mk("obj_camera", "Camera", "objects", "Objects", "A realistic camera body with lens, natural reflections.", {
    sortOrder: 41,
    keywords: ["dslr", "photo"],
  }),
  mk("obj_phone", "Phone", "objects", "Objects", "A modern smartphone with realistic screen and frame.", {
    sortOrder: 42,
    keywords: ["mobile", "smartphone", "iphone", "cellphone"],
  }),
  mk("obj_watch", "Watch", "objects", "Objects", "A wristwatch with realistic metal or leather strap.", {
    sortOrder: 43,
    keywords: ["timepiece", "wristwatch"],
  }),
  mk("obj_backpack", "Backpack", "objects", "Objects", "A backpack with fabric texture and straps, ground contact.", {
    sortOrder: 44,
    keywords: ["bag", "rucksack", "travel"],
  }),
  mk("obj_chair", "Chair", "objects", "Objects", "A single chair with correct perspective and ground contact.", {
    sortOrder: 45,
  }),
  mk("obj_lamp", "Lamp", "objects", "Objects", "A table or floor lamp with realistic materials.", {
    sortOrder: 46,
    keywords: ["light", "desk lamp"],
  }),
  mk("obj_plant", "Plant", "objects", "Objects", "A potted indoor plant with leaves and pot.", {
    sortOrder: 47,
    keywords: ["pot", "houseplant", "succulent"],
    motionModes: ["static", "wind"],
  }),
  mk("obj_book", "Book", "objects", "Objects", "A closed book with realistic cover and pages edge.", {
    sortOrder: 48,
  }),
  mk("obj_umbrella", "Umbrella", "objects", "Objects", "An open or closed umbrella with fabric canopy.", {
    sortOrder: 49,
  }),
  mk("obj_headphones", "Headphones", "objects", "Objects", "Over-ear headphones with realistic cushions and headband.", {
    sortOrder: 50,
    keywords: ["earphones", "headset", "audio"],
  }),
  mk("obj_guitar", "Guitar", "objects", "Objects", "An acoustic or electric guitar with correct proportions.", {
    sortOrder: 51,
    keywords: ["instrument", "music", "acoustic"],
    factors: [
      factor("type", "Type", [
        { id: "acoustic", label: "Acoustic", prompt: "acoustic guitar" },
        { id: "electric", label: "Electric", prompt: "electric guitar" },
      ]),
    ],
  }),
  mk("obj_football", "Football", "objects", "Objects", "A realistic football (soccer ball) with panel texture.", {
    sortOrder: 52,
    keywords: ["soccer", "ball", "sport"],
  }),
  mk("obj_teddy", "Teddy", "objects", "Objects", "A soft teddy bear plush toy, non-branded.", {
    sortOrder: 53,
    keywords: ["bear", "plush", "toy"],
  }),
  mk("obj_gift", "Gift", "objects", "Objects", "A wrapped gift box with ribbon, photorealistic.", {
    sortOrder: 54,
    keywords: ["present", "box", "package"],
  }),
  mk("obj_sofa", "Sofa", "objects", "Objects", "A sofa or couch with fabric texture and ground contact.", {
    sortOrder: 55,
    keywords: ["couch", "furniture", "settee"],
  }),
  mk("obj_travel_bag", "Travel Bag", "objects", "Objects", "A travel bag or soft luggage with handles, ground contact.", {
    sortOrder: 56,
    keywords: ["luggage", "duffel", "suitcase", "bag"],
  }),
  mk("food_coffee", "Coffee", "food", "Food", "A cup of coffee with steam optional, realistic ceramic.", {
    sortOrder: 60,
    keywords: ["cup", "latte", "espresso"],
  }),
  mk("food_pizza", "Pizza", "food", "Food", "A pizza slice or whole pizza with realistic toppings.", {
    sortOrder: 61,
  }),
  mk("food_burger", "Burger", "food", "Food", "A hamburger with bun, patty and toppings, photorealistic.", {
    sortOrder: 62,
    keywords: ["hamburger", "cheeseburger"],
  }),
  mk("food_icecream", "Ice cream", "food", "Food", "An ice cream cone or cup with realistic soft texture.", {
    sortOrder: 63,
    keywords: ["gelato", "cone", "dessert"],
  }),
  mk("nature_cloud", "Cloud", "nature", "Nature", "A soft realistic cloud volume in sky context.", {
    sortOrder: 70,
  }),
  mk("nature_sun", "Sun", "nature", "Nature", "A bright sun disk with subtle glow appropriate for photo.", {
    sortOrder: 71,
  }),
  mk("nature_moon", "Moon", "nature", "Nature", "A realistic moon with crater texture.", {
    sortOrder: 72,
  }),
  mk("animal_panda", "Panda", "animals", "Animals", "Photorealistic giant panda with correct black-and-white markings.", {
    sortOrder: 80,
    creditCost: 8,
    keywords: ["bear", "bamboo"],
    motionModes: ["static", "sitting", "walking"],
  }),
  mk("animal_penguin", "Penguin", "animals", "Animals", "Photorealistic penguin standing or sitting, correct proportions.", {
    sortOrder: 81,
    creditCost: 8,
    motionModes: ["static", "walking"],
  }),
  mk("vehicle_truck", "Truck", "vehicles", "Vehicles", "Photorealistic truck with ground contact and body reflections. No brand logos.", {
    sortOrder: 90,
    creditCost: 18,
    keywords: ["lorry", "pickup", "vehicle"],
    motionModes: ["static", "moving"],
  }),
  mk("vehicle_van", "Van", "vehicles", "Vehicles", "Photorealistic van with ground contact. No brand logos.", {
    sortOrder: 91,
    creditCost: 15,
    keywords: ["vehicle", "minivan"],
    motionModes: ["static", "moving"],
  }),
  mk(
    "costume_male",
    "Male Outfit",
    "costume",
    "Costume",
    "Generic male clothing outfit only — no face, no identity, no celebrity. Photorealistic fabric folds matching the scene.",
    {
      sortOrder: 100,
      keywords: ["men", "man", "mens", "outfit", "clothes", "clothing", "apparel"],
      factors: OUTFIT_FACTORS,
    },
  ),
  mk(
    "costume_female",
    "Female Outfit",
    "costume",
    "Costume",
    "Generic female clothing outfit only — no face, no identity, no celebrity. Photorealistic fabric folds matching the scene.",
    {
      sortOrder: 101,
      keywords: ["women", "woman", "womens", "outfit", "clothes", "clothing", "apparel"],
      factors: OUTFIT_FACTORS,
    },
  ),
];
