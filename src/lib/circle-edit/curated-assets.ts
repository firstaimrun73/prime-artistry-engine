/**
 * Circle 2edit — PDF-canonical first-release asset set (21).
 * Source of truth: Circle 2edit Diagram-Icon & Asset System Specification §4.
 * Server-authoritative prompts + factors. No emoji. No shared silhouettes.
 */
import type { AssetFactor, CircleAddAsset, Motion2AIMode } from "./add-assets-types";

const INTEGRATE =
  "Match camera angle, perspective, depth of field, and sharpness of the source photograph. " +
  "Match lighting direction, intensity, color temperature, exposure, and shadow softness. " +
  "Infer realistic scale from surrounding objects and the editable region; do not stretch the object to fill the mask. " +
  "Establish natural ground or surface contact with realistic contact shadows; no floating. " +
  "Match material response, reflections, and occlusion. Preserve unmasked pixels. " +
  "Edit only the white mask; leave every black pixel unchanged. " +
  "Do not regenerate the scene or add extra copies. The object must look photographed in the original scene, not like a sticker or cutout.";

/** Unique silhouettes — viewBox 0 0 64 64. No two assets share a path. */
const PATH = {
  // Objects — distinct diagrams per PDF silhouette notes
  obj_shoe:
    "M8 38c2-2 6-4 12-4h18c4 0 8 2 10 6l2 4H10l-2-6z M12 44h36 M14 38l2-6 4 2 3-4 4 3 3-3 4 2",
  obj_vase:
    "M28 8h8l2 6c2 4 6 10 6 18 0 10-4 20-10 22H30c-6-2-10-12-10-22 0-8 4-14 6-18l2-6z M26 54h12",
  obj_cake:
    "M18 36h28v14H18z M22 28h20v8H22z M20 36c2 2 6 3 12 3s10-1 12-3 M30 16v12 M28 16h4 M26 20h12",
  obj_glasses:
    "M10 30h16a8 8 0 110 8H10a8 8 0 110-8zm28 0h16a8 8 0 110 8H38a8 8 0 110-8z M26 34h12 M8 28l-2-6 M56 28l2-6",
  obj_hat:
    "M12 40c0-4 8-10 20-10s20 6 20 10H12z M22 30c1-8 5-14 10-14s9 6 10 14 M20 34h24",

  // Animals — differentiated ears/snouts/tails/antlers per PDF
  animal_cat:
    "M22 22l-4-10 6 4 M42 22l4-10-6 4 M18 34c2-10 8-14 14-12 6 1 10 6 12 12v8c0 6-6 10-12 10s-12-4-14-10v-8z M24 36h2 M38 36h2 M28 42h8",
  animal_dog:
    "M16 24c-2-6 2-12 8-10 2 0 4 2 4 4 M40 24c2-6-2-12-8-10-2 0-4 2-4 4 M18 34c2-8 8-12 14-10 6 2 10 8 12 14v6c0 6-6 10-12 10s-12-4-14-10v-6z M40 32l6-2 2 4-6 2 M30 44h6",
  animal_deer:
    "M28 8l-4 10 4-2 0 6 M36 8l4 10-4-2 0 6 M24 28c4-8 12-10 18-4 4 4 4 12-2 16H26c-2-4-4-10-2-12z M26 40v12 M38 40v12 M24 52h4 M36 52h4 M42 28l4-8",
  animal_horse:
    "M14 36c2-12 10-18 20-16 8 2 12 10 14 18v8H14v-8z M40 28c4-8 10-12 14-8-2 4-6 8-10 10 M22 28c0-4 2-8 4-8 M18 44v8 M42 44v8 M16 52h6 M40 52h6",
  animal_bird:
    "M18 34c6-12 18-14 28-2-4 2-8 6-12 6s-10-2-16-4z M34 32c2 2 4 6 2 10 M40 30l8-4 M28 40v6 M32 40v6",
  animal_rabbit:
    "M24 8c0-2 2-6 4-6s4 4 4 8v10 M36 8c0-2 2-6 4-6s4 4 4 8v10 M20 32c0-8 6-14 12-14s12 6 12 14v12H20V32z M30 48c2 4 4 4 6 0",
  animal_owl:
    "M18 28c0-10 6-16 14-16s14 6 14 16v14H18V28z M24 26a4 4 0 110-8 4 4 0 010 8zm16 0a4 4 0 110-8 4 4 0 010 8z M28 36h8 M22 16l-2-6 M42 16l2-6 M26 48h12",
  animal_fox:
    "M16 34c2-12 8-16 16-14 6 2 12 8 14 16v8H16v-8z M42 28l8-10-2 4 M20 22l-6-8 4 2 M28 42h8 M44 42l4 2",
  animal_squirrel:
    "M20 36c0-10 6-16 14-14 4 2 8 8 8 14v10H20V36z M36 24c6-10 14-12 18-4-4 6-10 8-16 8 M26 22c0-6 2-10 4-10 M28 46h8",
  animal_swan:
    "M12 42c4-14 12-20 24-16 8 2 14 10 16 18H12z M36 26c4-14 14-18 20-10-6 6-12 10-20 12 M48 20c2-4 6-4 8 0",

  // Vehicles
  vehicle_car:
    "M10 36l6-12h32l6 12v8H10v-8zm8 10a4 4 0 110-8 4 4 0 010 8zm28 0a4 4 0 110-8 4 4 0 010 8z M18 28h8 M38 28h8",
  vehicle_motorcycle:
    "M14 44a7 7 0 110-14 7 7 0 010 14zm32 0a7 7 0 110-14 7 7 0 010 14z M22 36l10-14h8l6 10 M28 28h10 M36 22v6",
  vehicle_bus:
    "M12 16h40v30H12V16zm6 26a4 4 0 110-8 4 4 0 010 8zm28 0a4 4 0 110-8 4 4 0 010 8z M16 22h8v8h-8zm12 0h8v8h-8zm12 0h8v8h-8z M18 48h6 M40 48h6",
  vehicle_scooter:
    "M18 46a5 5 0 110-10 5 5 0 010 10zm28 0a5 5 0 110-10 5 5 0 010 10z M22 38h16l6-12h-6 M36 26v-6 M34 20h8",
  vehicle_bicycle:
    "M16 42a7 7 0 110-14 7 7 0 010 14zm32 0a7 7 0 110-14 7 7 0 010 14z M22 32l8-14h8l6 14 M30 18v14 M28 32h12",

  // Nature
  nature_tree:
    "M32 10c-4 10-16 16-20 18 10 2 16 10 20 20 4-10 12-18 20-20-4-2-16-8-20-18z M28 48h8v8h-8z",
} as const;

function factor(
  id: string,
  label: string,
  options: { id: string; label: string; prompt: string }[],
): AssetFactor {
  return { id, label, options };
}

const CAT_FACTORS: AssetFactor[] = [
  factor("breed", "Breed", [
    { id: "persian", label: "Persian", prompt: "Persian cat with long luxurious fur and flat face" },
    { id: "maine_coon", label: "Maine Coon", prompt: "Maine Coon cat with large frame and tufted ears" },
    { id: "siamese", label: "Siamese", prompt: "Siamese cat with sleek body and pointed color pattern" },
    { id: "bengal", label: "Bengal", prompt: "Bengal cat with spotted wild-looking coat" },
    { id: "british_shorthair", label: "British Shorthair", prompt: "British Shorthair with dense plush coat and round face" },
    { id: "ragdoll", label: "Ragdoll", prompt: "Ragdoll cat with semi-long fur and blue eyes" },
    { id: "domestic_shorthair", label: "Domestic Shorthair", prompt: "domestic shorthair cat" },
  ]),
  factor("fur", "Fur", [
    { id: "short", label: "Short", prompt: "short clean fur" },
    { id: "long", label: "Long", prompt: "long flowing fur" },
    { id: "fluffy", label: "Fluffy", prompt: "fluffy dense fur" },
    { id: "smooth", label: "Smooth", prompt: "smooth sleek fur" },
  ]),
  factor("color", "Color", [
    { id: "white", label: "White", prompt: "clean white fur" },
    { id: "black", label: "Black", prompt: "solid black fur" },
    { id: "orange", label: "Orange", prompt: "orange tabby coloring" },
    { id: "grey", label: "Grey", prompt: "grey fur" },
    { id: "brown", label: "Brown", prompt: "brown fur" },
    { id: "tabby", label: "Tabby", prompt: "classic tabby markings" },
    { id: "calico", label: "Calico", prompt: "calico multi-color pattern" },
  ]),
  factor("size", "Size", [
    { id: "small", label: "Small", prompt: "small cat" },
    { id: "medium", label: "Medium", prompt: "medium-sized cat" },
    { id: "large", label: "Large", prompt: "large cat" },
  ]),
  factor("pose", "Pose", [
    { id: "sitting", label: "Sitting", prompt: "natural seated posture" },
    { id: "standing", label: "Standing", prompt: "standing on all fours" },
    { id: "walking", label: "Walking", prompt: "mid-stride walking pose" },
    { id: "lying", label: "Lying", prompt: "lying relaxed" },
    { id: "jumping", label: "Jumping", prompt: "mid-jump pose suitable for a still photograph" },
  ]),
  factor("expression", "Expression", [
    { id: "calm", label: "Calm", prompt: "calm neutral expression" },
    { id: "alert", label: "Alert", prompt: "alert attentive expression" },
    { id: "playful", label: "Playful", prompt: "playful expression" },
  ]),
  factor("age", "Age", [
    { id: "kitten", label: "Kitten", prompt: "young kitten" },
    { id: "adult", label: "Adult", prompt: "adult cat" },
    { id: "senior", label: "Senior", prompt: "senior cat" },
  ]),
];

const DOG_FACTORS: AssetFactor[] = [
  factor("breed", "Breed", [
    { id: "labrador", label: "Labrador", prompt: "Labrador Retriever" },
    { id: "golden", label: "Golden Retriever", prompt: "Golden Retriever with golden coat" },
    { id: "german_shepherd", label: "German Shepherd", prompt: "German Shepherd" },
    { id: "bulldog", label: "Bulldog", prompt: "Bulldog" },
    { id: "poodle", label: "Poodle", prompt: "Poodle with curly coat" },
    { id: "husky", label: "Husky", prompt: "Siberian Husky" },
    { id: "terrier", label: "Terrier", prompt: "terrier breed" },
  ]),
  factor("fur", "Fur", [
    { id: "short", label: "Short", prompt: "short coat" },
    { id: "long", label: "Long", prompt: "long coat" },
    { id: "fluffy", label: "Fluffy", prompt: "fluffy coat" },
    { id: "smooth", label: "Smooth", prompt: "smooth coat" },
  ]),
  factor("color", "Color", [
    { id: "golden", label: "Golden", prompt: "golden coat" },
    { id: "black", label: "Black", prompt: "black coat" },
    { id: "brown", label: "Brown", prompt: "brown coat" },
    { id: "white", label: "White", prompt: "white coat" },
    { id: "mixed", label: "Mixed", prompt: "mixed coat colors" },
  ]),
  factor("size", "Size", [
    { id: "small", label: "Small", prompt: "small dog" },
    { id: "medium", label: "Medium", prompt: "medium-sized dog" },
    { id: "large", label: "Large", prompt: "large dog" },
  ]),
  factor("pose", "Pose", [
    { id: "sitting", label: "Sitting", prompt: "sitting attentively" },
    { id: "standing", label: "Standing", prompt: "standing alert" },
    { id: "walking", label: "Walking", prompt: "walking forward" },
    { id: "lying", label: "Lying", prompt: "lying down" },
    { id: "jumping", label: "Jumping", prompt: "mid-jump pose for a still photograph" },
  ]),
  factor("expression", "Expression", [
    { id: "happy", label: "Happy", prompt: "happy expression" },
    { id: "alert", label: "Alert", prompt: "alert expression" },
    { id: "calm", label: "Calm", prompt: "calm expression" },
  ]),
  factor("age", "Age", [
    { id: "puppy", label: "Puppy", prompt: "young puppy" },
    { id: "adult", label: "Adult", prompt: "adult dog" },
    { id: "senior", label: "Senior", prompt: "senior dog" },
  ]),
];

function asset(
  id: string,
  name: string,
  category: string,
  categoryLabel: string,
  desc: string,
  iconPath: string,
  opts: {
    creditCost?: number;
    factors?: AssetFactor[];
    motionModes?: Motion2AIMode[];
    sortOrder: number;
    negativeExtra?: string;
  },
): CircleAddAsset {
  const creditCost = opts.creditCost ?? 0;
  const negExtra = opts.negativeExtra ?? "";
  return {
    id,
    name,
    slug: id,
    label: name,
    category,
    categoryLabel,
    tags: [category],
    keywords: [name.toLowerCase(), id.replace(/_/g, " ")],
    creditCost,
    isFree: creditCost === 0,
    isPremium: creditCost >= 30,
    isActive: true,
    sortOrder: opts.sortOrder,
    objectSpecificDescription: desc,
    generationDescriptor: desc,
    backendPrompt: `Add exactly one realistic ${name.toLowerCase()} inside the user-selected masked region. ${desc} ${INTEGRATE}`,
    negativePrompt:
      `multiple ${name.toLowerCase()}s, extra objects, sticker, cutout, floating, wrong perspective, wrong scale, malformed anatomy, extra limbs, text, watermark, artifacts, background replacement, face changes, body changes${negExtra ? `, ${negExtra}` : ""}`,
    variationProfile: {
      enabled: false,
      styles: [],
      colors: [],
      sceneAdaptation: true,
      scaleAdaptation: true,
      lightingAdaptation: true,
    },
    visualType: "svg",
    iconPath,
    emoji: "",
    mark: name.slice(0, 2).toUpperCase(),
    factors: opts.factors,
    motionModes: opts.motionModes ?? ["static"],
    motionCapable: !!(opts.motionModes && opts.motionModes.length > 1),
  };
}

/** PDF §4 required first-release set — exactly 21 assets */
export const CURATED_ADD_ASSETS: CircleAddAsset[] = [
  // —— Objects (5)
  asset(
    "obj_shoe",
    "Shoes",
    "objects",
    "Objects",
    "A pair of shoes photographed to match scene lighting, correct perspective and ground contact.",
    PATH.obj_shoe,
    {
      sortOrder: 1,
      motionModes: ["static"],
      negativeExtra: "mismatched pairs, floating detached soles, extra laces, warped proportions",
      factors: [
        factor("type", "Type", [
          { id: "sneaker", label: "Sneaker", prompt: "pair of sneakers" },
          { id: "boot", label: "Boot", prompt: "pair of boots" },
          { id: "sandal", label: "Sandal", prompt: "pair of sandals" },
          { id: "heel", label: "Heel", prompt: "pair of heeled shoes" },
        ]),
        factor("color", "Color", [
          { id: "black", label: "Black", prompt: "black colorway" },
          { id: "white", label: "White", prompt: "white colorway" },
          { id: "brown", label: "Brown", prompt: "brown colorway" },
          { id: "red", label: "Red", prompt: "red colorway" },
        ]),
        factor("material", "Material", [
          { id: "leather", label: "Leather", prompt: "leather material" },
          { id: "canvas", label: "Canvas", prompt: "canvas material" },
          { id: "mesh", label: "Mesh", prompt: "mesh material" },
        ]),
        factor("sole", "Sole", [
          { id: "flat", label: "Flat", prompt: "flat sole" },
          { id: "chunky", label: "Chunky", prompt: "chunky sole" },
          { id: "heeled", label: "Heeled", prompt: "heeled sole" },
        ]),
        factor("style", "Style", [
          { id: "casual", label: "Casual", prompt: "casual style" },
          { id: "sport", label: "Sport", prompt: "sport style" },
          { id: "formal", label: "Formal", prompt: "formal style" },
        ]),
        factor("orientation", "Orientation", [
          { id: "side", label: "Side view", prompt: "side-profile orientation" },
          { id: "three_quarter", label: "¾ view", prompt: "three-quarter view orientation" },
        ]),
      ],
    },
  ),
  asset(
    "obj_vase",
    "Vase",
    "objects",
    "Objects",
    "A decorative vase placed naturally in scene with material reflections matching the photograph.",
    PATH.obj_vase,
    {
      sortOrder: 2,
      motionModes: ["static"],
      negativeExtra: "cracked broken vase, floating flowers unless requested, mismatched material texture",
      factors: [
        factor("shape", "Shape", [
          { id: "classic", label: "Classic", prompt: "classic flared-neck vase shape" },
          { id: "bulb", label: "Bulb", prompt: "bulb-shaped vase" },
          { id: "cylindrical", label: "Cylindrical", prompt: "cylindrical vase" },
          { id: "fluted", label: "Fluted", prompt: "fluted vase" },
        ]),
        factor("material", "Material", [
          { id: "ceramic", label: "Ceramic", prompt: "ceramic material" },
          { id: "glass", label: "Glass", prompt: "glass material" },
          { id: "stone", label: "Stone", prompt: "stone material" },
        ]),
        factor("color", "Color", [
          { id: "white", label: "White", prompt: "white color" },
          { id: "blue", label: "Blue", prompt: "blue color" },
          { id: "terracotta", label: "Terracotta", prompt: "terracotta color" },
          { id: "clear", label: "Clear", prompt: "clear transparent" },
        ]),
        factor("finish", "Finish", [
          { id: "matte", label: "Matte", prompt: "matte finish" },
          { id: "glossy", label: "Glossy", prompt: "glossy finish" },
          { id: "textured", label: "Textured", prompt: "textured finish" },
        ]),
        factor("size", "Size", [
          { id: "small", label: "Small", prompt: "small vase" },
          { id: "medium", label: "Medium", prompt: "medium vase" },
          { id: "large", label: "Large", prompt: "large vase" },
        ]),
        factor("decoration", "Decoration", [
          { id: "plain", label: "Plain", prompt: "plain undecorated surface" },
          { id: "patterned", label: "Patterned", prompt: "subtle patterned decoration" },
        ]),
      ],
    },
  ),
  asset(
    "obj_cake",
    "Cake",
    "objects",
    "Objects",
    "A cake on a matching surface with natural frosting texture, photorealistic.",
    PATH.obj_cake,
    {
      sortOrder: 3,
      motionModes: ["static"],
      negativeExtra: "melted collapsed cake, mismatched tier alignment, extra candles unless requested",
      factors: [
        factor("type", "Type", [
          { id: "birthday", label: "Birthday", prompt: "birthday cake" },
          { id: "wedding", label: "Wedding", prompt: "wedding cake" },
          { id: "single_tier", label: "Single tier", prompt: "single-tier cake" },
        ]),
        factor("shape", "Shape", [
          { id: "round", label: "Round", prompt: "round shape" },
          { id: "square", label: "Square", prompt: "square shape" },
        ]),
        factor("icing", "Icing", [
          { id: "buttercream", label: "Buttercream", prompt: "buttercream icing" },
          { id: "fondant", label: "Fondant", prompt: "fondant icing" },
          { id: "drip", label: "Drip", prompt: "drip icing" },
        ]),
        factor("color", "Color", [
          { id: "white", label: "White", prompt: "white color scheme" },
          { id: "chocolate", label: "Chocolate", prompt: "chocolate color scheme" },
          { id: "pastel", label: "Pastel", prompt: "pastel color scheme" },
        ]),
        factor("decoration", "Decoration", [
          { id: "simple", label: "Simple", prompt: "simple decoration" },
          { id: "floral", label: "Floral", prompt: "floral decoration" },
          { id: "candles", label: "Candles", prompt: "with candles" },
        ]),
        factor("size", "Size", [
          { id: "small", label: "Small", prompt: "small cake" },
          { id: "medium", label: "Medium", prompt: "medium cake" },
          { id: "large", label: "Large", prompt: "large cake" },
        ]),
      ],
    },
  ),
  asset(
    "obj_glasses",
    "Glasses",
    "objects",
    "Objects",
    "A pair of eyeglasses with realistic lenses and frames, correct scale.",
    PATH.obj_glasses,
    {
      sortOrder: 4,
      motionModes: ["static"],
      negativeExtra: "asymmetric lenses, missing temple arm, warped frame geometry",
      factors: [
        factor("frame_type", "Frame type", [
          { id: "round", label: "Round", prompt: "round frame type" },
          { id: "square", label: "Square", prompt: "square frame type" },
          { id: "aviator", label: "Aviator", prompt: "aviator frame type" },
          { id: "cat_eye", label: "Cat-eye", prompt: "cat-eye frame type" },
        ]),
        factor("frame_color", "Frame color", [
          { id: "black", label: "Black", prompt: "black frame" },
          { id: "gold", label: "Gold", prompt: "gold frame" },
          { id: "tortoise", label: "Tortoise", prompt: "tortoise-shell frame" },
        ]),
        factor("lens_type", "Lens type", [
          { id: "clear", label: "Clear", prompt: "clear lenses" },
          { id: "tinted", label: "Tinted", prompt: "tinted lenses" },
          { id: "reflective", label: "Reflective", prompt: "reflective lenses" },
        ]),
        factor("lens_tint", "Lens tint", [
          { id: "none", label: "None", prompt: "no tint" },
          { id: "grey", label: "Grey", prompt: "grey tint" },
          { id: "brown", label: "Brown", prompt: "brown tint" },
        ]),
        factor("size", "Size", [
          { id: "compact", label: "Compact", prompt: "compact size" },
          { id: "standard", label: "Standard", prompt: "standard size" },
          { id: "oversized", label: "Oversized", prompt: "oversized frames" },
        ]),
        factor("orientation", "Orientation", [
          { id: "front", label: "Front", prompt: "front-facing orientation" },
          { id: "three_quarter", label: "¾ view", prompt: "three-quarter orientation" },
        ]),
      ],
    },
  ),
  asset(
    "obj_hat",
    "Hat",
    "objects",
    "Objects",
    "A hat with fabric or material texture, natural contact with implied wear surface.",
    PATH.obj_hat,
    {
      sortOrder: 5,
      motionModes: ["static"],
      negativeExtra: "floating hat with no contact point, mismatched brim symmetry",
      factors: [
        factor("type", "Type", [
          { id: "fedora", label: "Fedora", prompt: "fedora hat" },
          { id: "beanie", label: "Beanie", prompt: "beanie hat" },
          { id: "cap", label: "Cap", prompt: "baseball-style cap" },
          { id: "sunhat", label: "Sun hat", prompt: "wide-brim sun hat" },
        ]),
        factor("material", "Material", [
          { id: "felt", label: "Felt", prompt: "felt material" },
          { id: "straw", label: "Straw", prompt: "straw material" },
          { id: "wool", label: "Wool", prompt: "wool material" },
          { id: "cotton", label: "Cotton", prompt: "cotton material" },
        ]),
        factor("color", "Color", [
          { id: "black", label: "Black", prompt: "black color" },
          { id: "beige", label: "Beige", prompt: "beige color" },
          { id: "navy", label: "Navy", prompt: "navy color" },
          { id: "brown", label: "Brown", prompt: "brown color" },
        ]),
        factor("shape", "Crown shape", [
          { id: "round", label: "Round", prompt: "round crown shape" },
          { id: "creased", label: "Creased", prompt: "creased crown shape" },
        ]),
        factor("decoration", "Decoration", [
          { id: "plain", label: "Plain", prompt: "plain band" },
          { id: "banded", label: "Banded", prompt: "decorative band" },
        ]),
        factor("orientation", "Orientation", [
          { id: "front", label: "Front", prompt: "front orientation" },
          { id: "side", label: "Side", prompt: "side orientation" },
        ]),
      ],
    },
  ),

  // —— Animals (10)
  asset(
    "animal_cat",
    "Cat",
    "animals",
    "Animals",
    "Photorealistic cat, correct anatomy, natural fur, scene-matched scale.",
    PATH.animal_cat,
    {
      sortOrder: 10,
      factors: CAT_FACTORS,
      motionModes: ["static", "sitting", "walking", "running"],
      negativeExtra: "extra limbs, distorted face, incorrect breed markings, unnatural proportions",
    },
  ),
  asset(
    "animal_dog",
    "Dog",
    "animals",
    "Animals",
    "Photorealistic dog, correct anatomy, natural fur.",
    PATH.animal_dog,
    {
      sortOrder: 11,
      factors: DOG_FACTORS,
      motionModes: ["static", "sitting", "walking", "running"],
      negativeExtra: "incorrect breed proportions, extra limbs, distorted face",
    },
  ),
  asset(
    "animal_deer",
    "Deer",
    "animals",
    "Animals",
    "Photorealistic deer with natural proportions, forest-scale.",
    PATH.animal_deer,
    {
      sortOrder: 12,
      motionModes: ["static", "walking"],
      negativeExtra: "antlers on a doe unless specified, malformed leg count, incorrect proportions",
      factors: [
        factor("species", "Species", [
          { id: "whitetail", label: "Whitetail", prompt: "whitetail deer" },
          { id: "mule", label: "Mule", prompt: "mule deer" },
          { id: "red_deer", label: "Red deer", prompt: "red deer" },
          { id: "fawn", label: "Fawn", prompt: "young fawn deer without antlers" },
        ]),
        factor("antler", "Antlers", [
          { id: "branching", label: "Branching", prompt: "branching antlers" },
          { id: "small", label: "Small", prompt: "small antlers" },
          { id: "none", label: "None", prompt: "no antlers" },
        ]),
        factor("fur_color", "Coat", [
          { id: "brown", label: "Brown", prompt: "brown coat" },
          { id: "tan", label: "Tan", prompt: "tan coat" },
          { id: "spotted", label: "Spotted", prompt: "spotted coat" },
        ]),
        factor("size", "Size", [
          { id: "small", label: "Small", prompt: "small deer" },
          { id: "medium", label: "Medium", prompt: "medium deer" },
          { id: "large", label: "Large", prompt: "large deer" },
        ]),
        factor("pose", "Pose", [
          { id: "standing", label: "Standing", prompt: "standing alert" },
          { id: "walking", label: "Walking", prompt: "walking through the scene" },
        ]),
        factor("direction", "Facing", [
          { id: "left", label: "Left", prompt: "facing left" },
          { id: "right", label: "Right", prompt: "facing right" },
          { id: "camera", label: "Camera", prompt: "facing the camera" },
        ]),
      ],
    },
  ),
  asset(
    "animal_horse",
    "Horse",
    "animals",
    "Animals",
    "Photorealistic horse, correct anatomy, natural mane.",
    PATH.animal_horse,
    {
      sortOrder: 13,
      motionModes: ["static", "walking", "running"],
      negativeExtra: "malformed legs, incorrect mane attachment, distorted proportions",
      factors: [
        factor("breed", "Breed", [
          { id: "arabian", label: "Arabian", prompt: "Arabian horse" },
          { id: "thoroughbred", label: "Thoroughbred", prompt: "Thoroughbred horse" },
          { id: "clydesdale", label: "Clydesdale", prompt: "Clydesdale horse" },
          { id: "pony", label: "Pony", prompt: "pony" },
        ]),
        factor("coat", "Coat", [
          { id: "short", label: "Short", prompt: "short coat" },
          { id: "glossy", label: "Glossy", prompt: "glossy coat" },
        ]),
        factor("mane", "Mane", [
          { id: "flowing", label: "Flowing", prompt: "flowing mane" },
          { id: "braided", label: "Braided", prompt: "braided mane" },
          { id: "short", label: "Short", prompt: "short mane" },
        ]),
        factor("color", "Color", [
          { id: "bay", label: "Bay", prompt: "bay coloring" },
          { id: "black", label: "Black", prompt: "black coloring" },
          { id: "white", label: "White", prompt: "white coloring" },
          { id: "chestnut", label: "Chestnut", prompt: "chestnut coloring" },
        ]),
        factor("body_type", "Build", [
          { id: "athletic", label: "Athletic", prompt: "athletic build" },
          { id: "stocky", label: "Stocky", prompt: "stocky build" },
        ]),
        factor("pose", "Pose", [
          { id: "standing", label: "Standing", prompt: "standing calmly" },
          { id: "walking", label: "Walking", prompt: "walking" },
        ]),
        factor("direction", "Facing", [
          { id: "left", label: "Left", prompt: "facing left" },
          { id: "right", label: "Right", prompt: "facing right" },
        ]),
      ],
    },
  ),
  asset(
    "animal_bird",
    "Bird",
    "animals",
    "Animals",
    "Photorealistic small songbird, delicate feathers, correct scale.",
    PATH.animal_bird,
    {
      sortOrder: 14,
      motionModes: ["static", "flying"],
      negativeExtra: "extra wings, malformed beak, distorted feet",
      factors: [
        factor("species", "Species", [
          { id: "sparrow", label: "Sparrow", prompt: "sparrow" },
          { id: "robin", label: "Robin", prompt: "robin" },
          { id: "finch", label: "Finch", prompt: "finch" },
          { id: "songbird", label: "Songbird", prompt: "generic songbird" },
        ]),
        factor("feather_color", "Plumage", [
          { id: "brown", label: "Brown", prompt: "brown plumage" },
          { id: "blue", label: "Blue", prompt: "blue plumage" },
          { id: "red", label: "Red", prompt: "red plumage" },
          { id: "yellow", label: "Yellow", prompt: "yellow plumage" },
        ]),
        factor("size", "Size", [
          { id: "small", label: "Small", prompt: "small bird" },
          { id: "medium", label: "Medium", prompt: "medium bird" },
        ]),
        factor("pose", "Pose", [
          { id: "perched", label: "Perched", prompt: "perched pose" },
          { id: "standing", label: "Standing", prompt: "standing pose" },
        ]),
        factor("wing_state", "Wings", [
          { id: "folded", label: "Folded", prompt: "wings folded" },
          { id: "spread", label: "Spread", prompt: "wings spread" },
          { id: "mid_flap", label: "Mid-flap", prompt: "wings mid-flap for a still frame" },
        ]),
        factor("direction", "Facing", [
          { id: "left", label: "Left", prompt: "facing left" },
          { id: "right", label: "Right", prompt: "facing right" },
        ]),
      ],
    },
  ),
  asset(
    "animal_rabbit",
    "Rabbit",
    "animals",
    "Animals",
    "Photorealistic rabbit, soft fur, natural posture.",
    PATH.animal_rabbit,
    {
      sortOrder: 15,
      motionModes: ["static", "sitting"],
      negativeExtra: "malformed ear count, incorrect proportions",
      factors: [
        factor("breed", "Breed", [
          { id: "holland_lop", label: "Holland Lop", prompt: "Holland Lop rabbit" },
          { id: "dutch", label: "Dutch", prompt: "Dutch rabbit" },
          { id: "angora", label: "Angora", prompt: "Angora rabbit" },
          { id: "cottontail", label: "Cottontail", prompt: "wild cottontail rabbit" },
        ]),
        factor("fur", "Fur", [
          { id: "short", label: "Short", prompt: "short fur" },
          { id: "long", label: "Long", prompt: "long fur" },
          { id: "fluffy", label: "Fluffy", prompt: "fluffy fur" },
        ]),
        factor("color", "Color", [
          { id: "white", label: "White", prompt: "white coloring" },
          { id: "brown", label: "Brown", prompt: "brown coloring" },
          { id: "grey", label: "Grey", prompt: "grey coloring" },
          { id: "black", label: "Black", prompt: "black coloring" },
        ]),
        factor("size", "Size", [
          { id: "small", label: "Small", prompt: "small rabbit" },
          { id: "medium", label: "Medium", prompt: "medium rabbit" },
        ]),
        factor("ear_type", "Ears", [
          { id: "upright", label: "Upright", prompt: "upright ears" },
          { id: "lop", label: "Lop", prompt: "lop ears" },
        ]),
        factor("pose", "Pose", [
          { id: "sitting", label: "Sitting", prompt: "sitting pose" },
          { id: "standing", label: "Standing", prompt: "standing pose" },
        ]),
      ],
    },
  ),
  asset(
    "animal_owl",
    "Owl",
    "animals",
    "Animals",
    "Photorealistic owl, detailed feathers, alert frontal eyes.",
    PATH.animal_owl,
    {
      sortOrder: 16,
      motionModes: ["static", "flying"],
      negativeExtra: "side-profile eye placement, malformed talons",
      factors: [
        factor("species", "Species", [
          { id: "barn", label: "Barn owl", prompt: "barn owl" },
          { id: "great_horned", label: "Great horned", prompt: "great horned owl" },
          { id: "snowy", label: "Snowy", prompt: "snowy owl" },
        ]),
        factor("feather_color", "Plumage", [
          { id: "brown", label: "Brown", prompt: "brown plumage" },
          { id: "white", label: "White", prompt: "white plumage" },
          { id: "grey", label: "Grey", prompt: "grey plumage" },
        ]),
        factor("eye", "Eyes", [
          { id: "wide", label: "Wide", prompt: "wide alert eyes" },
          { id: "half_closed", label: "Half-closed", prompt: "half-closed eyes" },
          { id: "alert", label: "Alert", prompt: "alert eyes" },
        ]),
        factor("size", "Size", [
          { id: "small", label: "Small", prompt: "small owl" },
          { id: "large", label: "Large", prompt: "large owl" },
        ]),
        factor("pose", "Pose", [
          { id: "perched", label: "Perched", prompt: "perched pose" },
          { id: "standing", label: "Standing", prompt: "standing pose" },
        ]),
        factor("wing_state", "Wings", [
          { id: "folded", label: "Folded", prompt: "wings folded" },
          { id: "open", label: "Open", prompt: "wings open" },
        ]),
      ],
    },
  ),
  asset(
    "animal_fox",
    "Fox",
    "animals",
    "Animals",
    "Photorealistic fox with bushy tail, natural wild appearance.",
    PATH.animal_fox,
    {
      sortOrder: 17,
      motionModes: ["static", "sitting", "walking"],
      negativeExtra: "dog-like blunt snout, malformed tail",
      factors: [
        factor("species", "Species", [
          { id: "red", label: "Red fox", prompt: "red fox" },
          { id: "arctic", label: "Arctic fox", prompt: "arctic fox" },
          { id: "kit", label: "Kit", prompt: "kit fox" },
        ]),
        factor("fur", "Fur", [
          { id: "full", label: "Full", prompt: "full thick fur" },
          { id: "summer", label: "Summer", prompt: "summer coat" },
        ]),
        factor("color", "Color", [
          { id: "red_orange", label: "Red-orange", prompt: "red-orange coloring" },
          { id: "white", label: "White", prompt: "white coloring" },
          { id: "grey", label: "Grey", prompt: "grey coloring" },
        ]),
        factor("size", "Size", [
          { id: "small", label: "Small", prompt: "small fox" },
          { id: "medium", label: "Medium", prompt: "medium fox" },
        ]),
        factor("pose", "Pose", [
          { id: "sitting", label: "Sitting", prompt: "sitting pose" },
          { id: "standing", label: "Standing", prompt: "standing pose" },
          { id: "walking", label: "Walking", prompt: "walking pose" },
        ]),
        factor("expression", "Expression", [
          { id: "alert", label: "Alert", prompt: "alert expression" },
          { id: "calm", label: "Calm", prompt: "calm expression" },
        ]),
      ],
    },
  ),
  asset(
    "animal_squirrel",
    "Squirrel",
    "animals",
    "Animals",
    "Photorealistic squirrel, bushy arched tail, small scale.",
    PATH.animal_squirrel,
    {
      sortOrder: 18,
      motionModes: ["static", "sitting"],
      negativeExtra: "flat non-arched tail, malformed paw count",
      factors: [
        factor("species", "Species", [
          { id: "grey", label: "Grey", prompt: "grey squirrel" },
          { id: "red", label: "Red", prompt: "red squirrel" },
          { id: "chipmunk", label: "Chipmunk", prompt: "chipmunk" },
        ]),
        factor("fur", "Fur", [
          { id: "full", label: "Full", prompt: "full fur" },
          { id: "sleek", label: "Sleek", prompt: "sleek fur" },
        ]),
        factor("color", "Color", [
          { id: "grey", label: "Grey", prompt: "grey coloring" },
          { id: "red", label: "Red", prompt: "red coloring" },
          { id: "brown", label: "Brown", prompt: "brown coloring" },
        ]),
        factor("size", "Size", [
          { id: "small", label: "Small", prompt: "small squirrel" },
          { id: "medium", label: "Medium", prompt: "medium squirrel" },
        ]),
        factor("tail", "Tail", [
          { id: "full_arch", label: "Full arch", prompt: "tail in full arch over the back" },
          { id: "partial_arch", label: "Partial arch", prompt: "partially arched tail" },
        ]),
        factor("pose", "Pose", [
          { id: "sitting", label: "Sitting", prompt: "upright sitting pose" },
          { id: "standing", label: "Standing", prompt: "standing pose" },
        ]),
      ],
    },
  ),
  asset(
    "animal_swan",
    "Swan",
    "animals",
    "Animals",
    "Photorealistic swan with elegant S-curve neck.",
    PATH.animal_swan,
    {
      sortOrder: 19,
      motionModes: ["static", "flying"],
      negativeExtra: "short straight neck, malformed wing attachment",
      factors: [
        factor("species", "Species", [
          { id: "mute", label: "Mute swan", prompt: "mute swan" },
          { id: "black", label: "Black swan", prompt: "black swan" },
          { id: "trumpeter", label: "Trumpeter", prompt: "trumpeter swan" },
        ]),
        factor("feather_color", "Plumage", [
          { id: "white", label: "White", prompt: "white plumage" },
          { id: "black", label: "Black", prompt: "black plumage" },
        ]),
        factor("size", "Size", [
          { id: "medium", label: "Medium", prompt: "medium swan" },
          { id: "large", label: "Large", prompt: "large swan" },
        ]),
        factor("neck", "Neck", [
          { id: "upright_curve", label: "Upright curve", prompt: "neck in upright S-curve" },
          { id: "lowered", label: "Lowered", prompt: "lowered neck posture" },
          { id: "alert", label: "Alert", prompt: "alert neck posture" },
        ]),
        factor("pose", "Pose", [
          { id: "floating", label: "Floating", prompt: "floating pose" },
          { id: "standing", label: "Standing", prompt: "standing pose" },
        ]),
        factor("wing_state", "Wings", [
          { id: "folded", label: "Folded", prompt: "wings folded" },
          { id: "open", label: "Open", prompt: "wings open" },
        ]),
      ],
    },
  ),

  // —— Vehicles (5)
  asset(
    "vehicle_car",
    "Car",
    "vehicles",
    "Vehicles",
    "Photographed passenger vehicle with ground contact, tire shadows, body reflections. No brand logos.",
    PATH.vehicle_car,
    {
      creditCost: 15,
      sortOrder: 20,
      motionModes: ["static", "moving"],
      negativeExtra: "malformed wheel count, mismatched panel proportions, floating vehicle",
      factors: [
        factor("body", "Body type", [
          { id: "sedan", label: "Sedan", prompt: "sedan body type" },
          { id: "suv", label: "SUV", prompt: "SUV body type" },
          { id: "sports", label: "Sports", prompt: "sports car body" },
          { id: "hatchback", label: "Hatchback", prompt: "hatchback body" },
          { id: "coupe", label: "Coupe", prompt: "coupe body" },
          { id: "convertible", label: "Convertible", prompt: "convertible body" },
        ]),
        factor("color", "Color", [
          { id: "black", label: "Black", prompt: "black paint" },
          { id: "white", label: "White", prompt: "white paint" },
          { id: "red", label: "Red", prompt: "red paint" },
          { id: "blue", label: "Blue", prompt: "blue paint" },
          { id: "silver", label: "Silver", prompt: "silver metallic paint" },
        ]),
        factor("finish", "Finish", [
          { id: "gloss", label: "Gloss", prompt: "glossy finish" },
          { id: "matte", label: "Matte", prompt: "matte finish" },
        ]),
        factor("wheel_style", "Wheels", [
          { id: "standard", label: "Standard", prompt: "standard wheels" },
          { id: "sport", label: "Sport", prompt: "sport wheels" },
        ]),
        factor("orientation", "Orientation", [
          { id: "side", label: "Side", prompt: "side-profile orientation" },
          { id: "three_quarter", label: "¾ view", prompt: "three-quarter orientation" },
        ]),
      ],
    },
  ),
  asset(
    "vehicle_motorcycle",
    "Motorcycle",
    "vehicles",
    "Vehicles",
    "Photorealistic motorcycle with ground contact and correct perspective.",
    PATH.vehicle_motorcycle,
    {
      creditCost: 12,
      sortOrder: 21,
      motionModes: ["static", "moving"],
      negativeExtra: "malformed wheel count, missing engine mass, floating vehicle",
      factors: [
        factor("type", "Type", [
          { id: "cruiser", label: "Cruiser", prompt: "cruiser motorcycle" },
          { id: "sport", label: "Sport", prompt: "sport motorcycle" },
          { id: "naked", label: "Naked", prompt: "naked motorcycle" },
          { id: "touring", label: "Touring", prompt: "touring motorcycle" },
        ]),
        factor("color", "Color", [
          { id: "black", label: "Black", prompt: "black paint" },
          { id: "red", label: "Red", prompt: "red paint" },
          { id: "silver", label: "Silver", prompt: "silver paint" },
        ]),
        factor("finish", "Finish", [
          { id: "gloss", label: "Gloss", prompt: "glossy finish" },
          { id: "matte", label: "Matte", prompt: "matte finish" },
        ]),
        factor("wheel_style", "Wheels", [
          { id: "standard", label: "Standard", prompt: "standard wheels" },
          { id: "sport", label: "Sport", prompt: "sport wheels" },
        ]),
        factor("rider", "Rider", [
          { id: "none", label: "No rider", prompt: "no rider" },
          { id: "with_rider", label: "With rider", prompt: "with a rider" },
        ]),
        factor("orientation", "Orientation", [
          { id: "side", label: "Side", prompt: "side-profile orientation" },
        ]),
      ],
    },
  ),
  asset(
    "vehicle_bus",
    "Bus",
    "vehicles",
    "Vehicles",
    "Photorealistic transit bus, correct proportions, ground contact.",
    PATH.vehicle_bus,
    {
      creditCost: 15,
      sortOrder: 22,
      motionModes: ["static", "moving"],
      negativeExtra: "malformed window spacing, incorrect wheel count for size class",
      factors: [
        factor("type", "Type", [
          { id: "city", label: "City bus", prompt: "city bus" },
          { id: "coach", label: "Coach", prompt: "coach bus" },
          { id: "school", label: "School bus", prompt: "school bus" },
        ]),
        factor("size", "Size", [
          { id: "standard", label: "Standard", prompt: "standard size" },
          { id: "long", label: "Long", prompt: "long bus" },
        ]),
        factor("color", "Color", [
          { id: "yellow", label: "Yellow", prompt: "yellow livery" },
          { id: "white", label: "White", prompt: "white livery" },
          { id: "blue", label: "Blue", prompt: "blue livery" },
        ]),
        factor("style", "Style", [
          { id: "modern", label: "Modern", prompt: "modern styling" },
          { id: "classic", label: "Classic", prompt: "classic styling" },
        ]),
        factor("orientation", "Orientation", [
          { id: "side", label: "Side", prompt: "side orientation" },
        ]),
      ],
    },
  ),
  asset(
    "vehicle_scooter",
    "Scooter",
    "vehicles",
    "Vehicles",
    "Photorealistic step-through scooter, compact scale.",
    PATH.vehicle_scooter,
    {
      sortOrder: 23,
      motionModes: ["static", "moving"],
      negativeExtra: "engine-block bulk, malformed footboard",
      factors: [
        factor("type", "Type", [
          { id: "classic", label: "Classic", prompt: "classic step-through scooter" },
          { id: "electric", label: "Electric", prompt: "electric scooter" },
        ]),
        factor("color", "Color", [
          { id: "white", label: "White", prompt: "white paint" },
          { id: "red", label: "Red", prompt: "red paint" },
          { id: "black", label: "Black", prompt: "black paint" },
        ]),
        factor("finish", "Finish", [
          { id: "gloss", label: "Gloss", prompt: "glossy finish" },
          { id: "matte", label: "Matte", prompt: "matte finish" },
        ]),
        factor("orientation", "Orientation", [
          { id: "side", label: "Side", prompt: "side orientation" },
        ]),
      ],
    },
  ),
  asset(
    "vehicle_bicycle",
    "Bicycle",
    "vehicles",
    "Vehicles",
    "Photorealistic bicycle with correct geometry and ground contact.",
    PATH.vehicle_bicycle,
    {
      sortOrder: 24,
      motionModes: ["static", "moving"],
      negativeExtra: "engine mass, malformed spoke count, missing pedals",
      factors: [
        factor("type", "Type", [
          { id: "road", label: "Road", prompt: "road bicycle" },
          { id: "mountain", label: "Mountain", prompt: "mountain bicycle" },
          { id: "city", label: "City", prompt: "city bicycle" },
          { id: "bmx", label: "BMX", prompt: "BMX bicycle" },
        ]),
        factor("frame_style", "Frame", [
          { id: "diamond", label: "Diamond", prompt: "diamond frame style" },
          { id: "step_through", label: "Step-through", prompt: "step-through frame" },
        ]),
        factor("color", "Color", [
          { id: "black", label: "Black", prompt: "black paint" },
          { id: "red", label: "Red", prompt: "red paint" },
          { id: "blue", label: "Blue", prompt: "blue paint" },
          { id: "silver", label: "Silver", prompt: "silver paint" },
        ]),
        factor("wheel_style", "Wheels", [
          { id: "thin", label: "Thin", prompt: "thin road wheels" },
          { id: "knobby", label: "Knobby", prompt: "knobby tires" },
        ]),
        factor("orientation", "Orientation", [
          { id: "side", label: "Side", prompt: "side orientation" },
        ]),
      ],
    },
  ),

  // —— Nature (1)
  asset(
    "nature_tree",
    "Tree",
    "nature",
    "Nature",
    "Photorealistic tree with natural canopy and trunk, scene-correct scale.",
    PATH.nature_tree,
    {
      sortOrder: 30,
      motionModes: ["static", "wind"],
      negativeExtra: "malformed trunk-to-canopy attachment, floating canopy with no trunk contact",
      factors: [
        factor("species", "Species", [
          { id: "oak", label: "Oak", prompt: "oak tree with broad canopy" },
          { id: "pine", label: "Pine", prompt: "pine tree with needle foliage" },
          { id: "maple", label: "Maple", prompt: "maple tree" },
          { id: "palm", label: "Palm", prompt: "palm tree" },
        ]),
        factor("trunk", "Trunk", [
          { id: "straight", label: "Straight", prompt: "straight trunk" },
          { id: "tapered", label: "Tapered", prompt: "tapered trunk widening at the base" },
        ]),
        factor("foliage", "Foliage", [
          { id: "full", label: "Full", prompt: "full dense foliage" },
          { id: "sparse", label: "Sparse", prompt: "sparse foliage" },
        ]),
        factor("season", "Season", [
          { id: "spring", label: "Spring", prompt: "spring coloring" },
          { id: "summer", label: "Summer", prompt: "summer coloring" },
          { id: "autumn", label: "Autumn", prompt: "autumn coloring" },
          { id: "winter", label: "Winter", prompt: "winter bare or sparse coloring" },
        ]),
        factor("size", "Size", [
          { id: "small", label: "Small", prompt: "small tree" },
          { id: "medium", label: "Medium", prompt: "medium tree" },
          { id: "large", label: "Large", prompt: "large tree" },
        ]),
        factor("lean", "Lean", [
          { id: "upright", label: "Upright", prompt: "upright posture" },
          { id: "slight", label: "Slight lean", prompt: "slight lean" },
        ]),
        factor("wind", "Wind", [
          { id: "still", label: "Still", prompt: "still foliage" },
          { id: "light_breeze", label: "Light breeze", prompt: "foliage gently affected by light breeze" },
          { id: "strong_breeze", label: "Strong breeze", prompt: "foliage swayed by strong breeze" },
        ]),
      ],
    },
  ),
];

export const CURATED_ASSET_COUNT = CURATED_ADD_ASSETS.length;
