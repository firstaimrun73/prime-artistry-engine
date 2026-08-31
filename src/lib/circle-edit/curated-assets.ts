/**
 * Circle 2edit — curated initial free asset set (~50).
 * Server-authoritative prompts + factors. No emoji. Expandable later.
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

const NEG =
  "extra objects, multiple copies, sticker, cutout, floating, wrong perspective, wrong scale, malformed anatomy, extra limbs, text, watermark, artifacts, cartoon when photorealism requested, background replacement, face changes, body changes";

const PATH = {
  cat: "M20 36c2-8 8-12 14-12 4 0 8 2 10 6l4-2 2 3-3 3v6c0 8-6 14-12 14s-12-4-14-12v-6z M28 28c0-2 2-4 4-4",
  dog: "M18 28c0-6 4-10 10-10h4c4 0 6 2 8 5l4-3 2 3-3 4v6c0 6-4 12-10 12s-10-4-12-10z",
  deer: "M24 20l4 8 4-8 M28 28v18 M22 36h12 M20 46l8-4 8 4",
  horse: "M14 36c2-10 10-16 18-14 6 2 10 8 12 14v8H14v-8z M40 30l6-8",
  bird: "M16 32c8-10 20-10 28 0-6 2-10 6-14 6s-8-4-14-6z M30 32v6",
  rabbit: "M22 20c0-6 2-10 4-10s4 4 4 10 M34 20c0-6 2-10 4-10s4 4 4 10 M20 32c0-6 6-10 12-10s12 4 12 10v10H20V32z",
  car: "M12 36l6-12h28l6 12v8H12v-8zm8 10a4 4 0 110-8 4 4 0 010 8zm24 0a4 4 0 110-8 4 4 0 010 8z",
  motorcycle: "M18 42a6 6 0 110-12 6 6 0 010 12zm28 0a6 6 0 110-12 6 6 0 010 12zM24 34l12-10h8l4 10",
  bicycle: "M18 40a6 6 0 110-12 6 6 0 010 12zm28 0a6 6 0 110-12 6 6 0 010 12zM22 30l10-12h6l4 12",
  tree: "M32 12c-2 8-12 14-16 16 8 0 12 6 16 14 4-8 8-14 16-14-4-2-14-8-16-16z M32 42v12",
  flower: "M32 20c-4 0-6 4-4 8-4 0-6 4-4 8 2 0 6-2 8-4 2 2 6 4 8 4 2-4 0-8-4-8 2-4 0-8-4-8z M32 36v12",
  chair: "M20 28h24v6H20z M22 34v14 M42 34v14 M20 48h24",
  table: "M14 30h36v4H14z M18 34v16 M46 34v16",
  lamp: "M28 14h8l4 12H24l4-12z M32 26v20 M24 46h16",
  cake: "M18 34h28v14H18z M22 28h20v6H22z M30 18v10 M34 20v8",
  pizza: "M32 14L14 46h36L32 14z M28 30h2 M34 34h2 M26 38h2",
  phone: "M24 12h16a4 4 0 014 4v32a4 4 0 01-4 4H24a4 4 0 01-4-4V16a4 4 0 014-4z M28 44h8",
  camera: "M18 24h8l4-4h12l4 4h8v20H18V24z M32 40a6 6 0 100-12 6 6 0 000 12z",
  bag: "M22 24h20l4 28H18l4-28z M26 24c0-6 4-10 6-10s6 4 6 10",
  vase: "M26 14h12l2 8-4 28H28l-4-28 2-8z",
} as const;

function factor(id: string, label: string, options: { id: string; label: string; prompt: string }[]): AssetFactor {
  return { id, label, options };
}

const CAT_FACTORS: AssetFactor[] = [
  factor("breed", "Breed", [
    { id: "persian", label: "Persian", prompt: "Persian cat with long luxurious fur and flat face" },
    { id: "siamese", label: "Siamese", prompt: "Siamese cat with sleek body and pointed color pattern" },
    { id: "maine_coon", label: "Maine Coon", prompt: "Maine Coon cat with large frame and tufted ears" },
    { id: "bengal", label: "Bengal", prompt: "Bengal cat with spotted wild-looking coat" },
    { id: "british_shorthair", label: "British Shorthair", prompt: "British Shorthair with dense plush coat and round face" },
  ]),
  factor("fur", "Fur", [
    { id: "short", label: "Short", prompt: "short clean fur" },
    { id: "long", label: "Long", prompt: "long flowing fur" },
    { id: "fluffy", label: "Fluffy", prompt: "fluffy dense fur" },
  ]),
  factor("color", "Color", [
    { id: "white", label: "White", prompt: "clean white fur" },
    { id: "black", label: "Black", prompt: "solid black fur" },
    { id: "orange", label: "Orange", prompt: "orange tabby coloring" },
    { id: "grey", label: "Grey", prompt: "grey fur" },
    { id: "mixed", label: "Mixed", prompt: "mixed multi-color fur" },
  ]),
  factor("pose", "Pose", [
    { id: "sitting", label: "Sitting", prompt: "natural seated posture" },
    { id: "standing", label: "Standing", prompt: "standing on all fours" },
    { id: "walking", label: "Walking", prompt: "mid-stride walking pose" },
    { id: "lying", label: "Lying", prompt: "lying relaxed" },
  ]),
];

const DOG_FACTORS: AssetFactor[] = [
  factor("breed", "Breed", [
    { id: "golden", label: "Golden Retriever", prompt: "Golden Retriever with golden coat" },
    { id: "labrador", label: "Labrador", prompt: "Labrador Retriever" },
    { id: "german_shepherd", label: "Shepherd", prompt: "German Shepherd" },
    { id: "husky", label: "Husky", prompt: "Siberian Husky" },
    { id: "poodle", label: "Poodle", prompt: "Poodle with curly coat" },
  ]),
  factor("color", "Color", [
    { id: "golden", label: "Golden", prompt: "golden coat" },
    { id: "black", label: "Black", prompt: "black coat" },
    { id: "brown", label: "Brown", prompt: "brown coat" },
    { id: "white", label: "White", prompt: "white coat" },
  ]),
  factor("pose", "Pose", [
    { id: "sitting", label: "Sitting", prompt: "sitting attentively" },
    { id: "standing", label: "Standing", prompt: "standing alert" },
    { id: "walking", label: "Walking", prompt: "walking forward" },
  ]),
];

const CAR_FACTORS: AssetFactor[] = [
  factor("body", "Body type", [
    { id: "sedan", label: "Sedan", prompt: "modern sedan body" },
    { id: "suv", label: "SUV", prompt: "compact SUV body" },
    { id: "coupe", label: "Coupe", prompt: "sporty coupe body" },
    { id: "hatchback", label: "Hatchback", prompt: "hatchback body" },
    { id: "sports", label: "Sports", prompt: "sports car body" },
  ]),
  factor("color", "Color", [
    { id: "black", label: "Black", prompt: "black paint" },
    { id: "white", label: "White", prompt: "white paint" },
    { id: "red", label: "Red", prompt: "red paint" },
    { id: "blue", label: "Blue", prompt: "blue paint" },
    { id: "silver", label: "Silver", prompt: "silver metallic paint" },
  ]),
  factor("style", "Style", [
    { id: "modern", label: "Modern", prompt: "modern contemporary design" },
    { id: "classic", label: "Classic", prompt: "classic timeless design" },
    { id: "luxury", label: "Luxury", prompt: "luxury refined design" },
  ]),
  factor("finish", "Paint finish", [
    { id: "gloss", label: "Gloss", prompt: "glossy paint finish" },
    { id: "matte", label: "Matte", prompt: "matte paint finish" },
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
    keywords: [name.toLowerCase(), id.replace(/_/g, " ")],
    creditCost,
    isFree: creditCost === 0,
    isPremium: creditCost >= 30,
    isActive: true,
    sortOrder: opts.sortOrder,
    objectSpecificDescription: desc,
    generationDescriptor: desc,
    backendPrompt: `Add exactly one realistic ${name.toLowerCase()} inside the user-selected masked region. ${desc} ${INTEGRATE}`,
    negativePrompt: `multiple ${name.toLowerCase()}s, ${NEG}`,
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
    motionModes: opts.motionModes,
    motionCapable: !!(opts.motionModes && opts.motionModes.length > 1),
  };
}

/** ~50 curated assets — majority free */
export const CURATED_ADD_ASSETS: CircleAddAsset[] = [
  asset("animal_cat", "Cat", "animals", "Animals", "Photorealistic cat, correct anatomy, natural fur, scene-matched scale.", PATH.cat, {
    factors: CAT_FACTORS,
    motionModes: ["static", "walking", "sitting"],
    sortOrder: 1,
  }),
  asset("animal_dog", "Dog", "animals", "Animals", "Photorealistic dog, correct anatomy, natural fur.", PATH.dog, {
    factors: DOG_FACTORS,
    motionModes: ["static", "walking", "sitting"],
    sortOrder: 2,
  }),
  asset("animal_deer", "Deer", "animals", "Animals", "Photorealistic deer with natural antlers if adult, forest-scale proportions.", PATH.deer, {
    factors: [
      factor("pose", "Pose", [
        { id: "standing", label: "Standing", prompt: "standing alert" },
        { id: "walking", label: "Walking", prompt: "walking through the scene" },
      ]),
    ],
    motionModes: ["static", "walking"],
    sortOrder: 3,
  }),
  asset("animal_horse", "Horse", "animals", "Animals", "Photorealistic horse, correct anatomy, natural mane.", PATH.horse, {
    factors: [
      factor("color", "Color", [
        { id: "bay", label: "Bay", prompt: "bay coat" },
        { id: "black", label: "Black", prompt: "black coat" },
        { id: "white", label: "White", prompt: "white coat" },
      ]),
      factor("pose", "Pose", [
        { id: "standing", label: "Standing", prompt: "standing calmly" },
        { id: "walking", label: "Walking", prompt: "walking" },
      ]),
    ],
    motionModes: ["static", "walking", "running"],
    sortOrder: 4,
  }),
  asset("animal_bird", "Bird", "animals", "Animals", "Photorealistic small bird, delicate feathers, correct scale.", PATH.bird, {
    factors: [
      factor("color", "Color", [
        { id: "blue", label: "Blue", prompt: "blue plumage" },
        { id: "red", label: "Red", prompt: "red plumage" },
        { id: "yellow", label: "Yellow", prompt: "yellow plumage" },
      ]),
    ],
    motionModes: ["static", "flying"],
    sortOrder: 5,
  }),
  asset("animal_rabbit", "Rabbit", "animals", "Animals", "Photorealistic rabbit, soft fur, natural posture.", PATH.rabbit, {
    motionModes: ["static", "sitting"],
    sortOrder: 6,
  }),
  asset("animal_fox", "Fox", "animals", "Animals", "Photorealistic fox with bushy tail, natural wild appearance.", PATH.dog, {
    motionModes: ["static", "walking"],
    sortOrder: 7,
  }),
  asset("animal_squirrel", "Squirrel", "animals", "Animals", "Photorealistic squirrel, bushy tail, small scale.", PATH.rabbit, { sortOrder: 8 }),
  asset("animal_owl", "Owl", "animals", "Animals", "Photorealistic owl, detailed feathers, alert eyes.", PATH.bird, { sortOrder: 9 }),
  asset("animal_swan", "Swan", "animals", "Animals", "Photorealistic white swan, elegant neck curve.", PATH.bird, { sortOrder: 10 }),

  asset("vehicle_car", "Car", "vehicles", "Vehicles", "Photographed passenger vehicle with ground contact, tire shadows, body reflections. No brand logos.", PATH.car, {
    creditCost: 15,
    factors: CAR_FACTORS,
    motionModes: ["static", "moving"],
    sortOrder: 20,
  }),
  asset("vehicle_motorcycle", "Motorcycle", "vehicles", "Vehicles", "Photorealistic motorcycle with ground contact and correct perspective.", PATH.motorcycle, {
    creditCost: 12,
    factors: [
      factor("color", "Color", [
        { id: "black", label: "Black", prompt: "black motorcycle" },
        { id: "red", label: "Red", prompt: "red motorcycle" },
        { id: "silver", label: "Silver", prompt: "silver motorcycle" },
      ]),
    ],
    motionModes: ["static", "moving"],
    sortOrder: 21,
  }),
  asset("vehicle_bicycle", "Bicycle", "vehicles", "Vehicles", "Photorealistic bicycle with correct geometry and ground contact.", PATH.bicycle, {
    motionModes: ["static", "moving"],
    sortOrder: 22,
  }),
  asset("vehicle_truck", "Truck", "vehicles", "Vehicles", "Photorealistic pickup or light truck, ground contact, correct scale.", PATH.car, {
    creditCost: 15,
    sortOrder: 23,
  }),
  asset("vehicle_bus", "Bus", "vehicles", "Vehicles", "Photorealistic transit bus, correct proportions, ground contact.", PATH.car, {
    creditCost: 15,
    sortOrder: 24,
  }),
  asset("vehicle_scooter", "Scooter", "vehicles", "Vehicles", "Photorealistic motor scooter, compact scale.", PATH.motorcycle, { sortOrder: 25 }),

  asset("nature_tree", "Tree", "nature", "Nature", "Photorealistic tree with natural canopy and trunk, scene-correct scale.", PATH.tree, {
    factors: [
      factor("type", "Type", [
        { id: "oak", label: "Oak", prompt: "oak tree with broad canopy" },
        { id: "pine", label: "Pine", prompt: "pine tree with needle foliage" },
        { id: "palm", label: "Palm", prompt: "palm tree" },
        { id: "birch", label: "Birch", prompt: "birch tree with pale bark" },
      ]),
    ],
    motionModes: ["static", "wind"],
    sortOrder: 30,
  }),
  asset("nature_flower", "Flower", "nature", "Nature", "Photorealistic flower bloom, botanically plausible.", PATH.flower, {
    factors: [
      factor("color", "Color", [
        { id: "red", label: "Red", prompt: "red petals" },
        { id: "yellow", label: "Yellow", prompt: "yellow petals" },
        { id: "white", label: "White", prompt: "white petals" },
        { id: "pink", label: "Pink", prompt: "pink petals" },
      ]),
    ],
    sortOrder: 31,
  }),
  asset("nature_plant", "Plant", "nature", "Nature", "Photorealistic potted or garden plant with healthy foliage.", PATH.tree, { sortOrder: 32 }),
  asset("nature_bush", "Bush", "nature", "Nature", "Photorealistic shrub or bush, natural foliage density.", PATH.tree, { sortOrder: 33 }),
  asset("nature_rock", "Rock", "nature", "Nature", "Natural rock or boulder with realistic texture and contact shadows.", PATH.vase, { sortOrder: 34 }),
  asset("nature_sunflower", "Sunflower", "nature", "Nature", "Large sunflower bloom with dark seed center.", PATH.flower, { sortOrder: 35 }),
  asset("nature_cactus", "Cactus", "nature", "Nature", "Photorealistic cactus with natural spines and form.", PATH.tree, { sortOrder: 36 }),

  asset("object_chair", "Chair", "objects", "Objects", "Photorealistic chair with correct perspective and ground contact.", PATH.chair, {
    factors: [
      factor("style", "Style", [
        { id: "modern", label: "Modern", prompt: "modern minimal chair" },
        { id: "wooden", label: "Wooden", prompt: "wooden chair" },
        { id: "office", label: "Office", prompt: "office chair" },
      ]),
      factor("color", "Color", [
        { id: "black", label: "Black", prompt: "black finish" },
        { id: "wood", label: "Wood", prompt: "natural wood tone" },
        { id: "white", label: "White", prompt: "white finish" },
      ]),
    ],
    sortOrder: 40,
  }),
  asset("object_table", "Table", "objects", "Objects", "Photorealistic table with surface reflections and ground contact.", PATH.table, { sortOrder: 41 }),
  asset("object_lamp", "Lamp", "objects", "Objects", "Photorealistic lamp, optional soft glow consistent with scene light.", PATH.lamp, { sortOrder: 42 }),
  asset("object_bag", "Bag", "objects", "Objects", "Photorealistic handbag or tote with natural fabric folds.", PATH.bag, { sortOrder: 43 }),
  asset("object_suitcase", "Suitcase", "objects", "Objects", "Photorealistic suitcase with ground contact.", PATH.bag, { sortOrder: 44 }),
  asset("object_phone", "Phone", "technology", "Technology", "Modern smartphone, no readable text or logos.", PATH.phone, { sortOrder: 45 }),
  asset("object_camera", "Camera", "technology", "Technology", "Photorealistic camera body and lens.", PATH.camera, { sortOrder: 46 }),
  asset("object_book", "Book", "objects", "Objects", "Closed hardcover book, no readable text.", PATH.bag, { sortOrder: 47 }),
  asset("object_umbrella", "Umbrella", "objects", "Objects", "Open or closed umbrella matching scene context.", PATH.bag, { sortOrder: 48 }),

  asset("food_cake", "Cake", "food", "Food", "Photorealistic cake on a surface with natural frosting texture.", PATH.cake, {
    factors: [
      factor("flavor", "Style", [
        { id: "chocolate", label: "Chocolate", prompt: "chocolate cake" },
        { id: "vanilla", label: "Vanilla", prompt: "vanilla frosted cake" },
        { id: "fruit", label: "Fruit", prompt: "fruit-topped cake" },
      ]),
    ],
    sortOrder: 50,
  }),
  asset("food_pizza", "Pizza", "food", "Food", "Photorealistic pizza with natural toppings, no text.", PATH.pizza, { sortOrder: 51 }),
  asset("food_fruit", "Fruit", "food", "Food", "Fresh fruit arrangement, photorealistic.", PATH.flower, { sortOrder: 52 }),
  asset("food_drink", "Drink", "food", "Food", "Beverage in a glass with realistic liquid and reflections.", PATH.vase, { sortOrder: 53 }),
  asset("food_coffee", "Coffee", "food", "Food", "Coffee cup with realistic ceramic and liquid surface.", PATH.vase, { sortOrder: 54 }),
  asset("food_burger", "Burger", "food", "Food", "Photorealistic burger with layered ingredients.", PATH.cake, { sortOrder: 55 }),

  asset("decor_vase", "Vase", "decoration", "Decoration", "Decorative vase with material reflections matching the scene.", PATH.vase, { sortOrder: 60 }),
  asset("decor_painting", "Painting", "decoration", "Decoration", "Framed artwork on a surface, abstract non-copyrighted content, no text.", PATH.table, { sortOrder: 61 }),
  asset("decor_sculpture", "Sculpture", "decoration", "Decoration", "Small decorative sculpture with realistic material.", PATH.vase, { sortOrder: 62 }),
  asset("decor_pillow", "Pillow", "furniture", "Furniture", "Soft throw pillow with fabric texture.", PATH.bag, { sortOrder: 63 }),
  asset("furniture_sofa", "Sofa", "furniture", "Furniture", "Photorealistic sofa segment or armchair with fabric folds.", PATH.chair, {
    creditCost: 10,
    sortOrder: 64,
  }),
  asset("furniture_shelf", "Shelf", "furniture", "Furniture", "Simple shelf unit with correct perspective.", PATH.table, { sortOrder: 65 }),

  asset("tech_laptop", "Laptop", "technology", "Technology", "Open laptop, blank or abstract screen, no logos or readable UI text.", PATH.phone, {
    creditCost: 8,
    sortOrder: 70,
  }),
  asset("tech_headphones", "Headphones", "technology", "Technology", "Over-ear headphones, no brand marks.", PATH.camera, { sortOrder: 71 }),
  asset("tech_watch", "Watch", "technology", "Technology", "Wristwatch with reflective glass, no brand logos.", PATH.phone, { sortOrder: 72 }),

  asset("lifestyle_glasses", "Glasses", "lifestyle", "Lifestyle", "Eyeglasses with realistic lenses and frames.", PATH.phone, { sortOrder: 80 }),
  asset("lifestyle_hat", "Hat", "lifestyle", "Lifestyle", "Casual hat with fabric texture.", PATH.bag, { sortOrder: 81 }),
  asset("lifestyle_shoes", "Shoes", "lifestyle", "Lifestyle", "Pair of shoes with ground contact and correct perspective.", PATH.bag, { sortOrder: 82 }),
];

export const CURATED_ASSET_COUNT = CURATED_ADD_ASSETS.length;
