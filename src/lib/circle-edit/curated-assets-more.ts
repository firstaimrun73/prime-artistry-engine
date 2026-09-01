/**
 * Circle 2edit — 20 additional everyday objects.
 * Skips IDs already in curated/extra (watch, headphones, guitar, football, travel_bag).
 * Replacements: Television, Laptop, Speaker, Tablet, Pillow.
 */
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

const COLOR = factor("color", "Color", [
  { id: "black", label: "Black", prompt: "black color" },
  { id: "white", label: "White", prompt: "white color" },
  { id: "silver", label: "Silver", prompt: "silver color" },
  { id: "red", label: "Red", prompt: "red color" },
  { id: "blue", label: "Blue", prompt: "blue color" },
]);

/** Exactly 20 net-new objects */
export const MORE_ADD_ASSETS: CircleAddAsset[] = [
  mk("obj_balloon", "Balloon", "objects", "Objects", "A single inflated party balloon with natural highlight and string, photorealistic.", {
    sortOrder: 130,
    keywords: ["party", "helium", "float"],
    motionModes: ["static", "wind"],
    factors: [
      factor("shape", "Shape", [
        { id: "round", label: "Round", prompt: "round balloon" },
        { id: "heart", label: "Heart", prompt: "heart-shaped balloon" },
      ]),
      COLOR,
    ],
  }),
  mk("obj_tripod", "Tripod", "objects", "Objects", "A camera tripod with three legs and head mount, ground contact, correct perspective.", {
    sortOrder: 131,
    keywords: ["stand", "camera stand", "legs"],
  }),
  mk("obj_tv", "Television", "objects", "Objects", "A flat-screen television with thin bezel and stand or wall-ready base, realistic reflections.", {
    sortOrder: 132,
    keywords: ["tv", "screen", "monitor", "flat screen"],
    factors: [
      factor("size", "Size", [
        { id: "small", label: "Small", prompt: "small television" },
        { id: "medium", label: "Medium", prompt: "medium television" },
        { id: "large", label: "Large", prompt: "large television" },
      ]),
    ],
  }),
  mk("obj_wallet", "Wallet", "objects", "Objects", "A bipfold or slim wallet with realistic leather texture, natural scale.", {
    sortOrder: 133,
    keywords: ["purse", "billfold", "leather wallet"],
  }),
  mk("obj_key", "Key", "objects", "Objects", "A single metal house or car key with realistic metallic finish.", {
    sortOrder: 134,
    keywords: ["keys", "lock", "metal key"],
  }),
  mk("obj_laptop", "Laptop", "objects", "Objects", "An open laptop computer with screen and keyboard, no brand logos, realistic materials.", {
    sortOrder: 135,
    keywords: ["notebook", "computer", "macbook", "pc"],
    factors: [
      factor("state", "State", [
        { id: "open", label: "Open", prompt: "open laptop" },
        { id: "closed", label: "Closed", prompt: "closed laptop" },
      ]),
      COLOR,
    ],
  }),
  mk("obj_speaker", "Speaker", "objects", "Objects", "A compact Bluetooth or bookshelf speaker with fabric grille, realistic materials.", {
    sortOrder: 136,
    keywords: ["audio", "bluetooth speaker", "sound"],
  }),
  mk("obj_microphone", "Microphone", "objects", "Objects", "A studio or handheld microphone with realistic metal mesh and stand mount option.", {
    sortOrder: 137,
    keywords: ["mic", "studio mic", "podcast"],
  }),
  mk("obj_tablet", "Tablet", "objects", "Objects", "A modern tablet device with thin bezel and screen, no brand logos.", {
    sortOrder: 138,
    keywords: ["ipad", "slate", "device"],
  }),
  mk("obj_tennis_racket", "Tennis Racket", "objects", "Objects", "A tennis racket with string bed and grip, correct proportions.", {
    sortOrder: 139,
    keywords: ["racquet", "tennis", "sport"],
  }),
  mk("obj_basketball", "Basketball", "objects", "Objects", "A basketball with classic panel seams and orange surface texture.", {
    sortOrder: 140,
    keywords: ["ball", "sport", "hoops"],
    motionModes: ["static"],
  }),
  mk("obj_pillow", "Pillow", "objects", "Objects", "A soft bed or couch pillow with fabric texture and natural folds.", {
    sortOrder: 141,
    keywords: ["cushion", "bedding"],
  }),
  mk("obj_skateboard", "Skateboard", "objects", "Objects", "A skateboard deck with trucks and wheels, ground contact, correct perspective.", {
    sortOrder: 142,
    keywords: ["board", "skate", "wheels"],
    motionModes: ["static", "moving"],
  }),
  mk("obj_helmet", "Bicycle Helmet", "objects", "Objects", "A bicycle helmet with vents and straps, realistic plastic shell.", {
    sortOrder: 143,
    keywords: ["bike helmet", "safety", "cycling"],
    factors: [COLOR],
  }),
  mk("obj_water_bottle", "Water Bottle", "objects", "Objects", "A reusable water bottle with cap, realistic plastic or metal material.", {
    sortOrder: 144,
    keywords: ["bottle", "drink", "hydration", "flask"],
  }),
  mk("obj_bouquet", "Flower Bouquet", "objects", "Objects", "A mixed flower bouquet with stems and wrapping, natural petals.", {
    sortOrder: 145,
    keywords: ["flowers", "bouquet", "floral arrangement"],
    motionModes: ["static", "wind"],
  }),
  mk("obj_plant_pot", "Plant Pot", "objects", "Objects", "A ceramic or terracotta plant pot, optionally empty or with soil surface, ground contact.", {
    sortOrder: 146,
    keywords: ["pot", "planter", "ceramic", "terracotta"],
  }),
  mk("obj_candle", "Candle", "objects", "Objects", "A single candle in a holder or free-standing with soft wax texture; optional small flame.", {
    sortOrder: 147,
    keywords: ["wax", "flame", "candlelight"],
    motionModes: ["static"],
  }),
  mk("obj_mirror", "Mirror", "objects", "Objects", "A freestanding or wall mirror with realistic frame and reflective surface treatment suitable for photo edit.", {
    sortOrder: 148,
    keywords: ["looking glass", "vanity mirror"],
  }),
  mk("obj_table", "Table", "objects", "Objects", "A simple table with legs and top surface, correct perspective and ground contact.", {
    sortOrder: 149,
    keywords: ["desk", "furniture", "side table"],
    factors: [
      factor("style", "Style", [
        { id: "wood", label: "Wood", prompt: "wooden table" },
        { id: "modern", label: "Modern", prompt: "modern table" },
        { id: "round", label: "Round", prompt: "round table" },
      ]),
    ],
  }),
];
