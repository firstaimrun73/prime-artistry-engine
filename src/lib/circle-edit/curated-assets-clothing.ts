/**
 * Circle 2edit — Clothing / Fashion category assets.
 * Individual wearable items (not full outfits). 3D visuals via AssetVisual.
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

const COLOR_FACTOR = factor("color", "Color", [
  { id: "black", label: "Black", prompt: "black color" },
  { id: "white", label: "White", prompt: "white color" },
  { id: "navy", label: "Navy", prompt: "navy color" },
  { id: "grey", label: "Grey", prompt: "grey color" },
  { id: "beige", label: "Beige", prompt: "beige color" },
  { id: "red", label: "Red", prompt: "red color" },
  { id: "blue", label: "Blue", prompt: "blue color" },
]);

const MATERIAL_FACTOR = factor("material", "Material", [
  { id: "cotton", label: "Cotton", prompt: "cotton fabric" },
  { id: "denim", label: "Denim", prompt: "denim fabric" },
  { id: "leather", label: "Leather", prompt: "leather material" },
  { id: "wool", label: "Wool", prompt: "wool fabric" },
  { id: "synthetic", label: "Synthetic", prompt: "synthetic fabric" },
]);

function mk(
  id: string,
  name: string,
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
    category: "clothing",
    categoryLabel: "Clothing",
    tags: ["clothing", "fashion"],
    keywords: [
      name.toLowerCase(),
      id.replace(/_/g, " "),
      "clothing",
      "clothes",
      "fashion",
      "apparel",
      ...(opts.keywords ?? []),
    ],
    creditCost,
    isFree: creditCost === 0,
    isPremium: creditCost >= 30,
    isActive: true,
    sortOrder: opts.sortOrder,
    objectSpecificDescription: desc,
    generationDescriptor: desc,
    backendPrompt: `Add exactly one realistic ${name.toLowerCase()} inside the user-selected masked region. ${desc} ${INTEGRATE}`,
    negativePrompt: `multiple ${name.toLowerCase()}s, extra objects, sticker, cutout, floating, wrong perspective, wrong scale, text, watermark, artifacts, background replacement, face changes, body changes, identifiable real person`,
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
    factors: opts.factors ?? [COLOR_FACTOR, MATERIAL_FACTOR],
    motionModes: opts.motionModes ?? ["static"],
    motionCapable: false,
  };
}

export const CLOTHING_ADD_ASSETS: CircleAddAsset[] = [
  mk("cloth_tshirt", "T-Shirt", "A casual t-shirt with natural fabric folds, correct scale for placement.", {
    sortOrder: 110,
    keywords: ["tshirt", "t-shirt", "tee", "shirt"],
    factors: [
      factor("style", "Style", [
        { id: "crew", label: "Crew neck", prompt: "crew-neck t-shirt" },
        { id: "vneck", label: "V-neck", prompt: "v-neck t-shirt" },
        { id: "oversized", label: "Oversized", prompt: "oversized t-shirt" },
      ]),
      COLOR_FACTOR,
      MATERIAL_FACTOR,
    ],
  }),
  mk("cloth_shirt", "Shirt", "A button-up shirt with realistic collar and fabric texture.", {
    sortOrder: 111,
    keywords: ["button-up", "oxford", "blouse"],
    factors: [
      factor("style", "Style", [
        { id: "casual", label: "Casual", prompt: "casual button-up shirt" },
        { id: "formal", label: "Formal", prompt: "formal dress shirt" },
        { id: "flannel", label: "Flannel", prompt: "flannel shirt" },
      ]),
      COLOR_FACTOR,
      MATERIAL_FACTOR,
    ],
  }),
  mk("cloth_jacket", "Jacket", "A jacket with realistic structure, zipper or buttons, natural drape.", {
    sortOrder: 112,
    keywords: ["coat", "blazer", "outerwear"],
    factors: [
      factor("style", "Style", [
        { id: "denim", label: "Denim", prompt: "denim jacket" },
        { id: "leather", label: "Leather", prompt: "leather jacket" },
        { id: "bomber", label: "Bomber", prompt: "bomber jacket" },
        { id: "blazer", label: "Blazer", prompt: "blazer jacket" },
      ]),
      COLOR_FACTOR,
      MATERIAL_FACTOR,
    ],
  }),
  mk("cloth_hoodie", "Hoodie", "A hoodie with hood, kangaroo pocket, soft fabric texture.", {
    sortOrder: 113,
    keywords: ["sweatshirt", "hooded"],
    factors: [
      factor("style", "Style", [
        { id: "pullover", label: "Pullover", prompt: "pullover hoodie" },
        { id: "zip", label: "Zip-up", prompt: "zip-up hoodie" },
        { id: "oversized", label: "Oversized", prompt: "oversized hoodie" },
      ]),
      COLOR_FACTOR,
      MATERIAL_FACTOR,
    ],
  }),
  mk("cloth_dress", "Dress", "A dress with natural fabric drape and silhouette.", {
    sortOrder: 114,
    keywords: ["gown", "frock"],
    factors: [
      factor("style", "Style", [
        { id: "casual", label: "Casual", prompt: "casual day dress" },
        { id: "formal", label: "Formal", prompt: "formal dress" },
        { id: "maxi", label: "Maxi", prompt: "maxi dress" },
        { id: "midi", label: "Midi", prompt: "midi dress" },
      ]),
      COLOR_FACTOR,
      MATERIAL_FACTOR,
    ],
  }),
  mk("cloth_jeans", "Jeans", "A pair of jeans with denim texture and natural folds.", {
    sortOrder: 115,
    keywords: ["denim", "pants", "trousers"],
    factors: [
      factor("style", "Style", [
        { id: "slim", label: "Slim", prompt: "slim-fit jeans" },
        { id: "straight", label: "Straight", prompt: "straight-leg jeans" },
        { id: "wide", label: "Wide leg", prompt: "wide-leg jeans" },
      ]),
      COLOR_FACTOR,
      MATERIAL_FACTOR,
    ],
  }),
  mk("cloth_shorts", "Shorts", "A pair of shorts with realistic fabric and hem.", {
    sortOrder: 116,
    keywords: ["bermuda", "trunks"],
  }),
  mk("cloth_skirt", "Skirt", "A skirt with natural drape and fabric texture.", {
    sortOrder: 117,
    keywords: ["mini", "midi", "maxi"],
  }),
  mk("cloth_sneakers", "Sneakers", "A pair of sneakers with realistic sole and upper, ground contact.", {
    sortOrder: 118,
    keywords: ["trainers", "shoes", "kicks"],
    factors: [
      factor("style", "Style", [
        { id: "low", label: "Low-top", prompt: "low-top sneakers" },
        { id: "high", label: "High-top", prompt: "high-top sneakers" },
        { id: "running", label: "Running", prompt: "running sneakers" },
      ]),
      COLOR_FACTOR,
      MATERIAL_FACTOR,
    ],
  }),
  mk("cloth_boots", "Boots", "A pair of boots with realistic material and sole, ground contact.", {
    sortOrder: 119,
    keywords: ["ankle boots", "footwear"],
  }),
  mk("cloth_cap", "Cap", "A baseball-style or casual cap with realistic brim and fabric.", {
    sortOrder: 120,
    keywords: ["hat", "baseball cap", "beanie"],
  }),
  mk("cloth_handbag", "Handbag", "A handbag or purse with realistic material and handles.", {
    sortOrder: 121,
    keywords: ["purse", "bag", "tote"],
  }),
  mk("cloth_scarf", "Scarf", "A scarf with soft fabric folds and natural drape.", {
    sortOrder: 122,
    keywords: ["wrap", "shawl"],
  }),
  mk("cloth_tie", "Tie", "A necktie with realistic fabric and knot.", {
    sortOrder: 123,
    keywords: ["necktie", "bowtie"],
  }),
  mk("cloth_coat", "Coat", "A long coat with realistic structure and fabric weight.", {
    sortOrder: 124,
    keywords: ["overcoat", "trench", "parka"],
  }),
  mk("cloth_suit", "Suit", "A formal suit jacket or full suit silhouette, photorealistic fabric.", {
    sortOrder: 125,
    keywords: ["blazer", "formal", "tuxedo"],
  }),
];
