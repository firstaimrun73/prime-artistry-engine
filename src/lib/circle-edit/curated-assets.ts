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
  obj_shoe:
    "M6 40c1-3 4-6 10-7h22c5 0 9 2 12 6l3 5H8l-2-4z M10 44h40 M12 37c2-5 5-9 9-10l3 4 M24 28c2-1 4 0 5 2l2 4 M32 27c2-1 5 1 6 3l1 4 M22 30h14",
  obj_vase:
    "M26 6h12l1 5c1 3 5 8 5 16 0 12-5 22-12 24H28c-7-2-12-12-12-24 0-8 4-13 5-16l1-5z M24 52h16 M28 6v4 M36 6v4 M22 28c2 2 6 3 10 3s8-1 10-3",
  obj_cake:
    "M16 38h32v16H16z M20 28h24v10H20z M24 20h16v8H24z M18 38c3 2 8 3 14 3s11-1 14-3 M22 28c2 1 5 2 10 2s8-1 10-2 M32 8v12 M30 8h4 M28 12h8 M20 50h6 M30 50h4 M38 50h6",
  obj_glasses:
    "M8 28h18c5 0 9 4 9 6s-4 6-9 6H8c-5 0-9-4-9-6s4-6 9-6z M38 28h18c5 0 9 4 9 6s-4 6-9 6H38c-5 0-9-4-9-6s4-6 9-6z M26 34h12 M6 26l-3-8 M58 26l3-8 M14 32h6 M46 32h6",
  obj_hat:
    "M8 42c2-6 12-12 24-12s22 6 24 12H8z M20 30c1-10 6-16 12-16s11 6 12 16 M18 34h28 M22 22h20",
  animal_cat:
    "M20 20l-6-12 8 5 M44 20l6-12-8 5 M16 32c2-12 10-16 16-14 8 1 12 8 14 14v10c0 7-7 12-14 12s-14-5-16-12V32z M24 34h3 M37 34h3 M28 42c2 1 6 1 8 0 M46 36c6 2 10 8 8 14",
  animal_dog:
    "M14 22c-3-8 3-14 10-11 2 1 3 3 3 5 M42 22c3-8-3-14-10-11-2 1-3 3-3 5 M16 34c2-10 10-14 16-12 8 2 12 10 14 16v8c0 7-7 12-14 12s-14-5-16-12v-8z M42 34l8-3 2 5-7 3 M28 44h8 M26 36h3 M35 36h3",
  animal_deer:
    "M26 6l-5 12 5-3 1 8 M38 6l5 12-5-3-1 8 M22 28c5-10 14-12 20-4 5 5 4 14-2 18H24c-2-5-4-12-2-14z M24 42v14 M40 42v14 M22 56h6 M38 56h6 M44 30l6-10 M28 38h8",
  animal_horse:
    "M12 38c3-14 12-20 22-18 10 2 14 12 16 20v10H12V38z M42 28c5-10 12-14 16-8-3 5-8 9-12 11 M20 26c0-5 3-10 6-10 M16 48v10 M24 48v10 M40 48v10 M48 48v10 M14 58h8 M38 58h8 M44 22c2-4 1-8-2-10",
  animal_bird:
    "M16 36c8-14 22-16 32-2-5 2-10 6-14 6s-12-2-18-4z M36 32c3 3 5 8 3 12 M44 28l10-6 M28 42v8 M34 42v8 M26 50h6 M32 50h6 M20 34c4-2 8-1 10 2",
  animal_rabbit:
    "M22 6c0-2 3-5 5-5s4 3 4 7v12 M34 6c0-2 3-5 5-5s4 3 4 7v12 M18 30c0-10 7-16 14-16s14 6 14 16v14H18V30z M28 48c3 5 5 5 8 0 M26 36h3 M35 36h3 M30 42h4",
  animal_owl:
    "M16 26c0-12 7-18 16-18s16 6 16 18v16H16V26z M22 24c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5z M38 24c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5z M30 32l-3 4h6z M20 14l-3-7 M44 14l3-7 M24 50h16",
  animal_fox:
    "M14 32c3-14 10-18 18-16 8 2 14 10 16 18v10H14V32z M18 20l-8-10 6 3 M46 20l8-10-6 3 M48 36c8 4 12 12 10 16H48 M28 42h8 M26 34h3 M35 34h3",
  animal_squirrel:
    "M18 34c0-12 8-18 16-16 6 2 10 10 10 16v12H18V34z M38 22c8-12 16-14 20-4-5 7-12 10-18 10 M24 20c0-7 3-12 6-12 M26 46h10 M28 36h3",
  animal_swan:
    "M10 44c5-16 14-22 28-18 10 3 16 12 18 20H10z M34 26c5-16 16-20 22-10-7 7-14 12-22 14 M50 18c3-5 8-5 10 1 M52 16l4-2",
  vehicle_car:
    "M8 36l8-14h32l8 14v10H8V36z M11 46c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5z M43 46c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5z M18 26h10v8H18z M36 26h10v8H36z",
  vehicle_motorcycle:
    "M6 44c0-4 4-8 8-8s8 4 8 8-4 8-8 8-8-4-8-8z M42 44c0-4 4-8 8-8s8 4 8 8-4 8-8 8-8-4-8-8z M20 36l12-16h10l6 12 M26 26h14 M38 20v8 M32 30h8",
  vehicle_bus:
    "M10 14h44v32H10V14z M11 42c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5z M43 42c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5z M14 20h10v10H14z M28 20h10v10H28z M42 20h8v10h-8z M16 50h8 M40 50h8",
  vehicle_scooter:
    "M10 48c0-3 3-6 6-6s6 3 6 6-3 6-6 6-6-3-6-6z M40 48c0-3 3-6 6-6s6 3 6 6-3 6-6 6-6-3-6-6z M20 40h20l8-14h-8 M40 26v-8 M36 18h12",
  vehicle_bicycle:
    "M6 42c0-4 4-8 8-8s8 4 8 8-4 8-8 8-8-4-8-8z M42 42c0-4 4-8 8-8s8 4 8 8-4 8-8 8-8-4-8-8z M20 34l10-16h12l8 16 M30 18v16 M28 34h16 M26 18h8",
  nature_tree:
    "M32 8c-6 12-20 18-24 20 12 2 20 12 24 24 4-12 14-22 24-24-4-2-18-8-24-20z M28 48h8v12h-8z M24 52h16",
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
  asset("obj_shoe", "Shoes", "objects", "Objects", "A pair of shoes photographed to match scene lighting, correct perspective and ground contact.", PATH.obj_shoe, { sortOrder: 1, motionModes: ["static"], negativeExtra: "mismatched pairs, floating detached soles, extra laces, warped proportions", factors: [factor("type", "Type", [{ id: "sneaker", label: "Sneaker", prompt: "pair of sneakers" }, { id: "boot", label: "Boot", prompt: "pair of boots" }, { id: "sandal", label: "Sandal", prompt: "pair of sandals" }, { id: "heel", label: "Heel", prompt: "pair of heeled shoes" }]), factor("color", "Color", [{ id: "black", label: "Black", prompt: "black colorway" }, { id: "white", label: "White", prompt: "white colorway" }, { id: "brown", label: "Brown", prompt: "brown colorway" }, { id: "red", label: "Red", prompt: "red colorway" }]), factor("material", "Material", [{ id: "leather", label: "Leather", prompt: "leather material" }, { id: "canvas", label: "Canvas", prompt: "canvas material" }, { id: "mesh", label: "Mesh", prompt: "mesh material" }]), factor("sole", "Sole", [{ id: "flat", label: "Flat", prompt: "flat sole" }, { id: "chunky", label: "Chunky", prompt: "chunky sole" }, { id: "heeled", label: "Heeled", prompt: "heeled sole" }]), factor("style", "Style", [{ id: "casual", label: "Casual", prompt: "casual style" }, { id: "sport", label: "Sport", prompt: "sport style" }, { id: "formal", label: "Formal", prompt: "formal style" }]), factor("orientation", "Orientation", [{ id: "side", label: "Side view", prompt: "side-profile orientation" }, { id: "three_quarter", label: "¾ view", prompt: "three-quarter view orientation" }])] }),
  asset("obj_vase", "Vase", "objects", "Objects", "A decorative vase placed naturally in scene with material reflections matching the photograph.", PATH.obj_vase, { sortOrder: 2, motionModes: ["static"], negativeExtra: "cracked broken vase, floating flowers unless requested, mismatched material texture", factors: [factor("shape", "Shape", [{ id: "classic", label: "Classic", prompt: "classic flared-neck vase shape" }, { id: "bulb", label: "Bulb", prompt: "bulb-shaped vase" }, { id: "cylindrical", label: "Cylindrical", prompt: "cylindrical vase" }, { id: "fluted", label: "Fluted", prompt: "fluted vase" }]), factor("material", "Material", [{ id: "ceramic", label: "Ceramic", prompt: "ceramic material" }, { id: "glass", label: "Glass", prompt: "glass material" }, { id: "stone", label: "Stone", prompt: "stone material" }]), factor("color", "Color", [{ id: "white", label: "White", prompt: "white color" }, { id: "blue", label: "Blue", prompt: "blue color" }, { id: "terracotta", label: "Terracotta", prompt: "terracotta color" }, { id: "clear", label: "Clear", prompt: "clear transparent" }]), factor("finish", "Finish", [{ id: "matte", label: "Matte", prompt: "matte finish" }, { id: "glossy", label: "Glossy", prompt: "glossy finish" }, { id: "textured", label: "Textured", prompt: "textured finish" }]), factor("size", "Size", [{ id: "small", label: "Small", prompt: "small vase" }, { id: "medium", label: "Medium", prompt: "medium vase" }, { id: "large", label: "Large", prompt: "large vase" }]), factor("decoration", "Decoration", [{ id: "plain", label: "Plain", prompt: "plain undecorated surface" }, { id: "patterned", label: "Patterned", prompt: "subtle patterned decoration" }])] }),
  asset("obj_cake", "Cake", "objects", "Objects", "A cake on a matching surface with natural frosting texture, photorealistic.", PATH.obj_cake, { sortOrder: 3, motionModes: ["static"], negativeExtra: "melted collapsed cake, mismatched tier alignment, extra candles unless requested", factors: [factor("type", "Type", [{ id: "birthday", label: "Birthday", prompt: "birthday cake" }, { id: "wedding", label: "Wedding", prompt: "wedding cake" }, { id: "single_tier", label: "Single tier", prompt: "single-tier cake" }]), factor("shape", "Shape", [{ id: "round", label: "Round", prompt: "round shape" }, { id: "square", label: "Square", prompt: "square shape" }]), factor("icing", "Icing", [{ id: "buttercream", label: "Buttercream", prompt: "buttercream icing" }, { id: "fondant", label: "Fondant", prompt: "fondant icing" }, { id: "drip", label: "Drip", prompt: "drip icing" }]), factor("color", "Color", [{ id: "white", label: "White", prompt: "white color scheme" }, { id: "chocolate", label: "Chocolate", prompt: "chocolate color scheme" }, { id: "pastel", label: "Pastel", prompt: "pastel color scheme" }]), factor("decoration", "Decoration", [{ id: "simple", label: "Simple", prompt: "simple decoration" }, { id: "floral", label: "Floral", prompt: "floral decoration" }, { id: "candles", label: "Candles", prompt: "with candles" }]), factor("size", "Size", [{ id: "small", label: "Small", prompt: "small cake" }, { id: "medium", label: "Medium", prompt: "medium cake" }, { id: "large", label: "Large", prompt: "large cake" }])] }),
  asset("obj_glasses", "Glasses", "objects", "Objects", "A pair of eyeglasses with realistic lenses and frames, correct scale.", PATH.obj_glasses, { sortOrder: 4, motionModes: ["static"], negativeExtra: "asymmetric lenses, missing temple arm, warped frame geometry", factors: [factor("frame_type", "Frame type", [{ id: "round", label: "Round", prompt: "round frame type" }, { id: "square", label: "Square", prompt: "square frame type" }, { id: "aviator", label: "Aviator", prompt: "aviator frame type" }, { id: "cat_eye", label: "Cat-eye", prompt: "cat-eye frame type" }]), factor("frame_color", "Frame color", [{ id: "black", label: "Black", prompt: "black frame" }, { id: "gold", label: "Gold", prompt: "gold frame" }, { id: "tortoise", label: "Tortoise", prompt: "tortoise-shell frame" }]), factor("lens_type", "Lens type", [{ id: "clear", label: "Clear", prompt: "clear lenses" }, { id: "tinted", label: "Tinted", prompt: "tinted lenses" }, { id: "reflective", label: "Reflective", prompt: "reflective lenses" }]), factor("lens_tint", "Lens tint", [{ id: "none", label: "None", prompt: "no tint" }, { id: "grey", label: "Grey", prompt: "grey tint" }, { id: "brown", label: "Brown", prompt: "brown tint" }]), factor("size", "Size", [{ id: "compact", label: "Compact", prompt: "compact size" }, { id: "standard", label: "Standard", prompt: "standard size" }, { id: "oversized", label: "Oversized", prompt: "oversized frames" }]), factor("orientation", "Orientation", [{ id: "front", label: "Front", prompt: "front-facing orientation" }, { id: "three_quarter", label: "¾ view", prompt: "three-quarter orientation" }])] }),
  asset("obj_hat", "Hat", "objects", "Objects", "A hat with fabric or material texture, natural contact with implied wear surface.", PATH.obj_hat, { sortOrder: 5, motionModes: ["static"], negativeExtra: "floating hat with no contact point, mismatched brim symmetry", factors: [factor("type", "Type", [{ id: "fedora", label: "Fedora", prompt: "fedora hat" }, { id: "beanie", label: "Beanie", prompt: "beanie hat" }, { id: "cap", label: "Cap", prompt: "baseball-style cap" }, { id: "sunhat", label: "Sun hat", prompt: "wide-brim sun hat" }]), factor("material", "Material", [{ id: "felt", label: "Felt", prompt: "felt material" }, { id: "straw", label: "Straw", prompt: "straw material" }, { id: "wool", label: "Wool", prompt: "wool material" }, { id: "cotton", label: "Cotton", prompt: "cotton material" }]), factor("color", "Color", [{ id: "black", label: "Black", prompt: "black color" }, { id: "beige", label: "Beige", prompt: "beige color" }, { id: "navy", label: "Navy", prompt: "navy color" }, { id: "brown", label: "Brown", prompt: "brown color" }]), factor("shape", "Crown shape", [{ id: "round", label: "Round", prompt: "round crown shape" }, { id: "creased", label: "Creased", prompt: "creased crown shape" }]), factor("decoration", "Decoration", [{ id: "plain", label: "Plain", prompt: "plain band" }, { id: "banded", label: "Banded", prompt: "decorative band" }]), factor("orientation", "Orientation", [{ id: "front", label: "Front", prompt: "front orientation" }, { id: "side", label: "Side", prompt: "side orientation" }])] }),
  asset("animal_cat", "Cat", "animals", "Animals", "Photorealistic cat, correct anatomy, natural fur, scene-matched scale.", PATH.animal_cat, { sortOrder: 10, factors: CAT_FACTORS, motionModes: ["static", "sitting", "walking", "running"], negativeExtra: "extra limbs, distorted face, incorrect breed markings, unnatural proportions" }),
  asset("animal_dog", "Dog", "animals", "Animals", "Photorealistic dog, correct anatomy, natural fur.", PATH.animal_dog, { sortOrder: 11, factors: DOG_FACTORS, motionModes: ["static", "sitting", "walking", "running"], negativeExtra: "incorrect breed proportions, extra limbs, distorted face" }),
  asset("animal_deer", "Deer", "animals", "Animals", "Photorealistic deer with natural proportions, forest-scale.", PATH.animal_deer, { sortOrder: 12, motionModes: ["static", "walking"], negativeExtra: "antlers on a doe unless specified, malformed leg count, incorrect proportions", factors: [factor("species", "Species", [{ id: "whitetail", label: "Whitetail", prompt: "whitetail deer" }, { id: "mule", label: "Mule", prompt: "mule deer" }, { id: "red_deer", label: "Red deer", prompt: "red deer" }, { id: "fawn", label: "Fawn", prompt: "young fawn deer without antlers" }]), factor("antler", "Antlers", [{ id: "branching", label: "Branching", prompt: "branching antlers" }, { id: "small", label: "Small", prompt: "small antlers" }, { id: "none", label: "None", prompt: "no antlers" }]), factor("fur_color", "Coat", [{ id: "brown", label: "Brown", prompt: "brown coat" }, { id: "tan", label: "Tan", prompt: "tan coat" }, { id: "spotted", label: "Spotted", prompt: "spotted coat" }]), factor("size", "Size", [{ id: "small", label: "Small", prompt: "small deer" }, { id: "medium", label: "Medium", prompt: "medium deer" }, { id: "large", label: "Large", prompt: "large deer" }]), factor("pose", "Pose", [{ id: "standing", label: "Standing", prompt: "standing alert" }, { id: "walking", label: "Walking", prompt: "walking through the scene" }]), factor("direction", "Facing", [{ id: "left", label: "Left", prompt: "facing left" }, { id: "right", label: "Right", prompt: "facing right" }, { id: "camera", label: "Camera", prompt: "facing the camera" }])] }),
  asset("animal_horse", "Horse", "animals", "Animals", "Photorealistic horse, correct anatomy, natural mane.", PATH.animal_horse, { sortOrder: 13, motionModes: ["static", "walking", "running"], negativeExtra: "malformed legs, incorrect mane attachment, distorted proportions", factors: [factor("breed", "Breed", [{ id: "arabian", label: "Arabian", prompt: "Arabian horse" }, { id: "thoroughbred", label: "Thoroughbred", prompt: "Thoroughbred horse" }, { id: "clydesdale", label: "Clydesdale", prompt: "Clydesdale horse" }, { id: "pony", label: "Pony", prompt: "pony" }]), factor("coat", "Coat", [{ id: "short", label: "Short", prompt: "short coat" }, { id: "glossy", label: "Glossy", prompt: "glossy coat" }]), factor("mane", "Mane", [{ id: "flowing", label: "Flowing", prompt: "flowing mane" }, { id: "braided", label: "Braided", prompt: "braided mane" }, { id: "short", label: "Short", prompt: "short mane" }]), factor("color", "Color", [{ id: "bay", label: "Bay", prompt: "bay coloring" }, { id: "black", label: "Black", prompt: "black coloring" }, { id: "white", label: "White", prompt: "white coloring" }, { id: "chestnut", label: "Chestnut", prompt: "chestnut coloring" }]), factor("body_type", "Build", [{ id: "athletic", label: "Athletic", prompt: "athletic build" }, { id: "stocky", label: "Stocky", prompt: "stocky build" }]), factor("pose", "Pose", [{ id: "standing", label: "Standing", prompt: "standing calmly" }, { id: "walking", label: "Walking", prompt: "walking" }]), factor("direction", "Facing", [{ id: "left", label: "Left", prompt: "facing left" }, { id: "right", label: "Right", prompt: "facing right" }])] }),
  asset("animal_bird", "Bird", "animals", "Animals", "Photorealistic small songbird, delicate feathers, correct scale.", PATH.animal_bird, { sortOrder: 14, motionModes: ["static", "flying"], negativeExtra: "extra wings, malformed beak, distorted feet", factors: [factor("species", "Species", [{ id: "sparrow", label: "Sparrow", prompt: "sparrow" }, { id: "robin", label: "Robin", prompt: "robin" }, { id: "finch", label: "Finch", prompt: "finch" }, { id: "songbird", label: "Songbird", prompt: "generic songbird" }]), factor("feather_color", "Plumage", [{ id: "brown", label: "Brown", prompt: "brown plumage" }, { id: "blue", label: "Blue", prompt: "blue plumage" }, { id: "red", label: "Red", prompt: "red plumage" }, { id: "yellow", label: "Yellow", prompt: "yellow plumage" }]), factor("size", "Size", [{ id: "small", label: "Small", prompt: "small bird" }, { id: "medium", label: "Medium", prompt: "medium bird" }]), factor("pose", "Pose", [{ id: "perched", label: "Perched", prompt: "perched pose" }, { id: "standing", label: "Standing", prompt: "standing pose" }]), factor("wing_state", "Wings", [{ id: "folded", label: "Folded", prompt: "wings folded" }, { id: "spread", label: "Spread", prompt: "wings spread" }, { id: "mid_flap", label: "Mid-flap", prompt: "wings mid-flap for a still frame" }]), factor("direction", "Facing", [{ id: "left", label: "Left", prompt: "facing left" }, { id: "right", label: "Right", prompt: "facing right" }])] }),
  asset("animal_rabbit", "Rabbit", "animals", "Animals", "Photorealistic rabbit, soft fur, natural posture.", PATH.animal_rabbit, { sortOrder: 15, motionModes: ["static", "sitting"], negativeExtra: "malformed ear count, incorrect proportions", factors: [factor("breed", "Breed", [{ id: "holland_lop", label: "Holland Lop", prompt: "Holland Lop rabbit" }, { id: "dutch", label: "Dutch", prompt: "Dutch rabbit" }, { id: "angora", label: "Angora", prompt: "Angora rabbit" }, { id: "cottontail", label: "Cottontail", prompt: "wild cottontail rabbit" }]), factor("fur", "Fur", [{ id: "short", label: "Short", prompt: "short fur" }, { id: "long", label: "Long", prompt: "long fur" }, { id: "fluffy", label: "Fluffy", prompt: "fluffy fur" }]), factor("color", "Color", [{ id: "white", label: "White", prompt: "white coloring" }, { id: "brown", label: "Brown", prompt: "brown coloring" }, { id: "grey", label: "Grey", prompt: "grey coloring" }, { id: "black", label: "Black", prompt: "black coloring" }]), factor("size", "Size", [{ id: "small", label: "Small", prompt: "small rabbit" }, { id: "medium", label: "Medium", prompt: "medium rabbit" }]), factor("ear_type", "Ears", [{ id: "upright", label: "Upright", prompt: "upright ears" }, { id: "lop", label: "Lop", prompt: "lop ears" }]), factor("pose", "Pose", [{ id: "sitting", label: "Sitting", prompt: "sitting pose" }, { id: "standing", label: "Standing", prompt: "standing pose" }])] }),
  asset("animal_owl", "Owl", "animals", "Animals", "Photorealistic owl, detailed feathers, alert frontal eyes.", PATH.animal_owl, { sortOrder: 16, motionModes: ["static", "flying"], negativeExtra: "side-profile eye placement, malformed talons", factors: [factor("species", "Species", [{ id: "barn", label: "Barn owl", prompt: "barn owl" }, { id: "great_horned", label: "Great horned", prompt: "great horned owl" }, { id: "snowy", label: "Snowy", prompt: "snowy owl" }]), factor("feather_color", "Plumage", [{ id: "brown", label: "Brown", prompt: "brown plumage" }, { id: "white", label: "White", prompt: "white plumage" }, { id: "grey", label: "Grey", prompt: "grey plumage" }]), factor("eye", "Eyes", [{ id: "wide", label: "Wide", prompt: "wide alert eyes" }, { id: "half_closed", label: "Half-closed", prompt: "half-closed eyes" }, { id: "alert", label: "Alert", prompt: "alert eyes" }]), factor("size", "Size", [{ id: "small", label: "Small", prompt: "small owl" }, { id: "large", label: "Large", prompt: "large owl" }]), factor("pose", "Pose", [{ id: "perched", label: "Perched", prompt: "perched pose" }, { id: "standing", label: "Standing", prompt: "standing pose" }]), factor("wing_state", "Wings", [{ id: "folded", label: "Folded", prompt: "wings folded" }, { id: "open", label: "Open", prompt: "wings open" }])] }),
  asset("animal_fox", "Fox", "animals", "Animals", "Photorealistic fox with bushy tail, natural wild appearance.", PATH.animal_fox, { sortOrder: 17, motionModes: ["static", "sitting", "walking"], negativeExtra: "dog-like blunt snout, malformed tail", factors: [factor("species", "Species", [{ id: "red", label: "Red fox", prompt: "red fox" }, { id: "arctic", label: "Arctic fox", prompt: "arctic fox" }, { id: "kit", label: "Kit", prompt: "kit fox" }]), factor("fur", "Fur", [{ id: "full", label: "Full", prompt: "full thick fur" }, { id: "summer", label: "Summer", prompt: "summer coat" }]), factor("color", "Color", [{ id: "red_orange", label: "Red-orange", prompt: "red-orange coloring" }, { id: "white", label: "White", prompt: "white coloring" }, { id: "grey", label: "Grey", prompt: "grey coloring" }]), factor("size", "Size", [{ id: "small", label: "Small", prompt: "small fox" }, { id: "medium", label: "Medium", prompt: "medium fox" }]), factor("pose", "Pose", [{ id: "sitting", label: "Sitting", prompt: "sitting pose" }, { id: "standing", label: "Standing", prompt: "standing pose" }, { id: "walking", label: "Walking", prompt: "walking pose" }]), factor("expression", "Expression", [{ id: "alert", label: "Alert", prompt: "alert expression" }, { id: "calm", label: "Calm", prompt: "calm expression" }])] }),
  asset("animal_squirrel", "Squirrel", "animals", "Animals", "Photorealistic squirrel, bushy arched tail, small scale.", PATH.animal_squirrel, { sortOrder: 18, motionModes: ["static", "sitting"], negativeExtra: "flat non-arched tail, malformed paw count", factors: [factor("species", "Species", [{ id: "grey", label: "Grey", prompt: "grey squirrel" }, { id: "red", label: "Red", prompt: "red squirrel" }, { id: "chipmunk", label: "Chipmunk", prompt: "chipmunk" }]), factor("fur", "Fur", [{ id: "full", label: "Full", prompt: "full fur" }, { id: "sleek", label: "Sleek", prompt: "sleek fur" }]), factor("color", "Color", [{ id: "grey", label: "Grey", prompt: "grey coloring" }, { id: "red", label: "Red", prompt: "red coloring" }, { id: "brown", label: "Brown", prompt: "brown coloring" }]), factor("size", "Size", [{ id: "small", label: "Small", prompt: "small squirrel" }, { id: "medium", label: "Medium", prompt: "medium squirrel" }]), factor("tail", "Tail", [{ id: "full_arch", label: "Full arch", prompt: "tail in full arch over the back" }, { id: "partial_arch", label: "Partial arch", prompt: "partially arched tail" }]), factor("pose", "Pose", [{ id: "sitting", label: "Sitting", prompt: "upright sitting pose" }, { id: "standing", label: "Standing", prompt: "standing pose" }])] }),
  asset("animal_swan", "Swan", "animals", "Animals", "Photorealistic swan with elegant S-curve neck.", PATH.animal_swan, { sortOrder: 19, motionModes: ["static", "flying"], negativeExtra: "short straight neck, malformed wing attachment", factors: [factor("species", "Species", [{ id: "mute", label: "Mute swan", prompt: "mute swan" }, { id: "black", label: "Black swan", prompt: "black swan" }, { id: "trumpeter", label: "Trumpeter", prompt: "trumpeter swan" }]), factor("feather_color", "Plumage", [{ id: "white", label: "White", prompt: "white plumage" }, { id: "black", label: "Black", prompt: "black plumage" }]), factor("size", "Size", [{ id: "medium", label: "Medium", prompt: "medium swan" }, { id: "large", label: "Large", prompt: "large swan" }]), factor("neck", "Neck", [{ id: "upright_curve", label: "Upright curve", prompt: "neck in upright S-curve" }, { id: "lowered", label: "Lowered", prompt: "lowered neck posture" }, { id: "alert", label: "Alert", prompt: "alert neck posture" }]), factor("pose", "Pose", [{ id: "floating", label: "Floating", prompt: "floating pose" }, { id: "standing", label: "Standing", prompt: "standing pose" }]), factor("wing_state", "Wings", [{ id: "folded", label: "Folded", prompt: "wings folded" }, { id: "open", label: "Open", prompt: "wings open" }])] }),
  asset("vehicle_car", "Car", "vehicles", "Vehicles", "Photographed passenger vehicle with ground contact, tire shadows, body reflections. No brand logos.", PATH.vehicle_car, { creditCost: 15, sortOrder: 20, motionModes: ["static", "moving"], negativeExtra: "malformed wheel count, mismatched panel proportions, floating vehicle", factors: [factor("body", "Body type", [{ id: "sedan", label: "Sedan", prompt: "sedan body type" }, { id: "suv", label: "SUV", prompt: "SUV body type" }, { id: "sports", label: "Sports", prompt: "sports car body" }, { id: "hatchback", label: "Hatchback", prompt: "hatchback body" }, { id: "coupe", label: "Coupe", prompt: "coupe body" }, { id: "convertible", label: "Convertible", prompt: "convertible body" }]), factor("color", "Color", [{ id: "black", label: "Black", prompt: "black paint" }, { id: "white", label: "White", prompt: "white paint" }, { id: "red", label: "Red", prompt: "red paint" }, { id: "blue", label: "Blue", prompt: "blue paint" }, { id: "silver", label: "Silver", prompt: "silver metallic paint" }]), factor("finish", "Finish", [{ id: "gloss", label: "Gloss", prompt: "glossy finish" }, { id: "matte", label: "Matte", prompt: "matte finish" }]), factor("wheel_style", "Wheels", [{ id: "standard", label: "Standard", prompt: "standard wheels" }, { id: "sport", label: "Sport", prompt: "sport wheels" }]), factor("orientation", "Orientation", [{ id: "side", label: "Side", prompt: "side-profile orientation" }, { id: "three_quarter", label: "¾ view", prompt: "three-quarter orientation" }])] }),
  asset("vehicle_motorcycle", "Motorcycle", "vehicles", "Vehicles", "Photorealistic motorcycle with ground contact and correct perspective.", PATH.vehicle_motorcycle, { creditCost: 12, sortOrder: 21, motionModes: ["static", "moving"], negativeExtra: "malformed wheel count, missing engine mass, floating vehicle", factors: [factor("type", "Type", [{ id: "cruiser", label: "Cruiser", prompt: "cruiser motorcycle" }, { id: "sport", label: "Sport", prompt: "sport motorcycle" }, { id: "naked", label: "Naked", prompt: "naked motorcycle" }, { id: "touring", label: "Touring", prompt: "touring motorcycle" }]), factor("color", "Color", [{ id: "black", label: "Black", prompt: "black paint" }, { id: "red", label: "Red", prompt: "red paint" }, { id: "silver", label: "Silver", prompt: "silver paint" }]), factor("finish", "Finish", [{ id: "gloss", label: "Gloss", prompt: "glossy finish" }, { id: "matte", label: "Matte", prompt: "matte finish" }]), factor("wheel_style", "Wheels", [{ id: "standard", label: "Standard", prompt: "standard wheels" }, { id: "sport", label: "Sport", prompt: "sport wheels" }]), factor("rider", "Rider", [{ id: "none", label: "No rider", prompt: "no rider" }, { id: "with_rider", label: "With rider", prompt: "with a rider" }]), factor("orientation", "Orientation", [{ id: "side", label: "Side", prompt: "side-profile orientation" }])] }),
  asset("vehicle_bus", "Bus", "vehicles", "Vehicles", "Photorealistic transit bus, correct proportions, ground contact.", PATH.vehicle_bus, { creditCost: 15, sortOrder: 22, motionModes: ["static", "moving"], negativeExtra: "malformed window spacing, incorrect wheel count for size class", factors: [factor("type", "Type", [{ id: "city", label: "City bus", prompt: "city bus" }, { id: "coach", label: "Coach", prompt: "coach bus" }, { id: "school", label: "School bus", prompt: "school bus" }]), factor("size", "Size", [{ id: "standard", label: "Standard", prompt: "standard size" }, { id: "long", label: "Long", prompt: "long bus" }]), factor("color", "Color", [{ id: "yellow", label: "Yellow", prompt: "yellow livery" }, { id: "white", label: "White", prompt: "white livery" }, { id: "blue", label: "Blue", prompt: "blue livery" }]), factor("style", "Style", [{ id: "modern", label: "Modern", prompt: "modern styling" }, { id: "classic", label: "Classic", prompt: "classic styling" }]), factor("orientation", "Orientation", [{ id: "side", label: "Side", prompt: "side orientation" }])] }),
  asset("vehicle_scooter", "Scooter", "vehicles", "Vehicles", "Photorealistic step-through scooter, compact scale.", PATH.vehicle_scooter, { sortOrder: 23, motionModes: ["static", "moving"], negativeExtra: "engine-block bulk, malformed footboard", factors: [factor("type", "Type", [{ id: "classic", label: "Classic", prompt: "classic step-through scooter" }, { id: "electric", label: "Electric", prompt: "electric scooter" }]), factor("color", "Color", [{ id: "white", label: "White", prompt: "white paint" }, { id: "red", label: "Red", prompt: "red paint" }, { id: "black", label: "Black", prompt: "black paint" }]), factor("finish", "Finish", [{ id: "gloss", label: "Gloss", prompt: "glossy finish" }, { id: "matte", label: "Matte", prompt: "matte finish" }]), factor("orientation", "Orientation", [{ id: "side", label: "Side", prompt: "side orientation" }])] }),
  asset("vehicle_bicycle", "Bicycle", "vehicles", "Vehicles", "Photorealistic bicycle with correct geometry and ground contact.", PATH.vehicle_bicycle, { sortOrder: 24, motionModes: ["static", "moving"], negativeExtra: "engine mass, malformed spoke count, missing pedals", factors: [factor("type", "Type", [{ id: "road", label: "Road", prompt: "road bicycle" }, { id: "mountain", label: "Mountain", prompt: "mountain bicycle" }, { id: "city", label: "City", prompt: "city bicycle" }, { id: "bmx", label: "BMX", prompt: "BMX bicycle" }]), factor("frame_style", "Frame", [{ id: "diamond", label: "Diamond", prompt: "diamond frame style" }, { id: "step_through", label: "Step-through", prompt: "step-through frame" }]), factor("color", "Color", [{ id: "black", label: "Black", prompt: "black paint" }, { id: "red", label: "Red", prompt: "red paint" }, { id: "blue", label: "Blue", prompt: "blue paint" }, { id: "silver", label: "Silver", prompt: "silver paint" }]), factor("wheel_style", "Wheels", [{ id: "thin", label: "Thin", prompt: "thin road wheels" }, { id: "knobby", label: "Knobby", prompt: "knobby tires" }]), factor("orientation", "Orientation", [{ id: "side", label: "Side", prompt: "side orientation" }])] }),
  asset("nature_tree", "Tree", "nature", "Nature", "Photorealistic tree with natural canopy and trunk, scene-correct scale.", PATH.nature_tree, { sortOrder: 30, motionModes: ["static", "wind"], negativeExtra: "malformed trunk-to-canopy attachment, floating canopy with no trunk contact", factors: [factor("species", "Species", [{ id: "oak", label: "Oak", prompt: "oak tree with broad canopy" }, { id: "pine", label: "Pine", prompt: "pine tree with needle foliage" }, { id: "maple", label: "Maple", prompt: "maple tree" }, { id: "palm", label: "Palm", prompt: "palm tree" }]), factor("trunk", "Trunk", [{ id: "straight", label: "Straight", prompt: "straight trunk" }, { id: "tapered", label: "Tapered", prompt: "tapered trunk widening at the base" }]), factor("foliage", "Foliage", [{ id: "full", label: "Full", prompt: "full dense foliage" }, { id: "sparse", label: "Sparse", prompt: "sparse foliage" }]), factor("season", "Season", [{ id: "spring", label: "Spring", prompt: "spring coloring" }, { id: "summer", label: "Summer", prompt: "summer coloring" }, { id: "autumn", label: "Autumn", prompt: "autumn coloring" }, { id: "winter", label: "Winter", prompt: "winter bare or sparse coloring" }]), factor("size", "Size", [{ id: "small", label: "Small", prompt: "small tree" }, { id: "medium", label: "Medium", prompt: "medium tree" }, { id: "large", label: "Large", prompt: "large tree" }]), factor("lean", "Lean", [{ id: "upright", label: "Upright", prompt: "upright posture" }, { id: "slight", label: "Slight lean", prompt: "slight lean" }]), factor("wind", "Wind", [{ id: "still", label: "Still", prompt: "still foliage" }, { id: "light_breeze", label: "Light breeze", prompt: "foliage gently affected by light breeze" }, { id: "strong_breeze", label: "Strong breeze", prompt: "foliage swayed by strong breeze" }])] }),
];

export const CURATED_ASSET_COUNT = CURATED_ADD_ASSETS.length;
