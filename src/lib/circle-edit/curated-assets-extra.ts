/** Extra Circle 2edit assets — modern emoji visuals via AssetIcon. Free + 5–25 credit tiers. */
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
    negativePrompt: `multiple ${name.toLowerCase()}s, extra objects, sticker, cutout, floating, wrong perspective, wrong scale, text, watermark, artifacts, background replacement`,
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

/** Additional high-quality objects — emoji rendered by AssetIcon */
export const EXTRA_ADD_ASSETS: CircleAddAsset[] = [
  mk("obj_flower", "Flower", "objects", "Objects", "A single flower with natural petals and stem, photorealistic.", {
    sortOrder: 40,
    creditCost: 0,
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
  }),
  mk("obj_camera", "Camera", "objects", "Objects", "A realistic camera body with lens, natural reflections.", {
    sortOrder: 41,
    creditCost: 0,
    keywords: ["dslr", "photo"],
  }),
  mk("obj_phone", "Phone", "objects", "Objects", "A modern smartphone with realistic screen and frame.", {
    sortOrder: 42,
    creditCost: 0,
    keywords: ["mobile", "smartphone", "iphone"],
  }),
  mk("obj_watch", "Watch", "objects", "Objects", "A wristwatch with realistic metal or leather strap.", {
    sortOrder: 43,
    creditCost: 0,
    keywords: ["timepiece", "wristwatch"],
  }),
  mk("obj_backpack", "Backpack", "objects", "Objects", "A backpack with fabric texture and straps, ground contact.", {
    sortOrder: 44,
    creditCost: 0,
    keywords: ["bag", "rucksack"],
  }),
  mk("obj_chair", "Chair", "objects", "Objects", "A single chair with correct perspective and ground contact.", {
    sortOrder: 45,
    creditCost: 0,
  }),
  mk("obj_lamp", "Lamp", "objects", "Objects", "A table or floor lamp with realistic materials.", {
    sortOrder: 46,
    creditCost: 0,
    keywords: ["light", "desk lamp"],
  }),
  mk("obj_plant", "Plant", "objects", "Objects", "A potted indoor plant with leaves and pot.", {
    sortOrder: 47,
    creditCost: 0,
    keywords: ["pot", "houseplant", "succulent"],
    motionModes: ["static", "wind"],
  }),
  mk("obj_book", "Book", "objects", "Objects", "A closed book with realistic cover and pages edge.", {
    sortOrder: 48,
    creditCost: 0,
  }),
  mk("obj_umbrella", "Umbrella", "objects", "Objects", "An open or closed umbrella with fabric canopy.", {
    sortOrder: 49,
    creditCost: 0,
  }),
  mk("food_coffee", "Coffee", "food", "Food", "A cup of coffee with steam optional, realistic ceramic.", {
    sortOrder: 50,
    creditCost: 0,
    keywords: ["cup", "latte", "espresso"],
  }),
  mk("food_pizza", "Pizza", "food", "Food", "A pizza slice or whole pizza with realistic toppings.", {
    sortOrder: 51,
    creditCost: 0,
  }),
  mk("food_burger", "Burger", "food", "Food", "A hamburger with bun, patty and toppings, photorealistic.", {
    sortOrder: 52,
    creditCost: 0,
    keywords: ["hamburger", "cheeseburger"],
  }),
  mk("food_icecream", "Ice cream", "food", "Food", "An ice cream cone or cup with realistic soft texture.", {
    sortOrder: 53,
    creditCost: 0,
    keywords: ["gelato", "cone"],
  }),
  mk("nature_cloud", "Cloud", "nature", "Nature", "A soft realistic cloud volume in sky context.", {
    sortOrder: 54,
    creditCost: 0,
  }),
  mk("nature_sun", "Sun", "nature", "Nature", "A bright sun disk with subtle glow appropriate for photo.", {
    sortOrder: 55,
    creditCost: 0,
  }),
  mk("nature_moon", "Moon", "nature", "Nature", "A realistic moon with crater texture.", {
    sortOrder: 56,
    creditCost: 0,
  }),
  mk("animal_panda", "Panda", "animals", "Animals", "Photorealistic giant panda with correct black-and-white markings.", {
    sortOrder: 57,
    creditCost: 8,
    keywords: ["bear", "bamboo"],
    motionModes: ["static", "sitting", "walking"],
  }),
  mk("animal_penguin", "Penguin", "animals", "Animals", "Photorealistic penguin standing or sitting, correct proportions.", {
    sortOrder: 58,
    creditCost: 8,
    motionModes: ["static", "walking"],
  }),
  mk("vehicle_truck", "Truck", "vehicles", "Vehicles", "Photorealistic truck with ground contact and body reflections. No brand logos.", {
    sortOrder: 59,
    creditCost: 18,
    keywords: ["lorry", "pickup"],
    motionModes: ["static", "moving"],
  }),
  mk("vehicle_van", "Van", "vehicles", "Vehicles", "Photorealistic van with ground contact. No brand logos.", {
    sortOrder: 60,
    creditCost: 15,
    motionModes: ["static", "moving"],
  }),
];
