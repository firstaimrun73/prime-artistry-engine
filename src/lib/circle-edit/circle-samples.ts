/**
 * Circle 2edit sample registry — independent stage media + metadata.
 * R2 is the intended source of truth for binaries (VITE_R2_PUBLIC_URL client-only).
 * Stage fields must not collapse to a single mediaUrl.
 * POST-LOGIN homepage only for gallery cards.
 */

export type CircleSampleMode = "add" | "remove";

export type CircleSample = {
  id: string;
  title: string;
  description: string;
  mode: CircleSampleMode;
  assetId: string | null;
  category: string;
  objectLabel: string;
  subOption?: string;
  /** Primary / before stage HTTPS URL (fallback when R2 empty). */
  beforeUrl: string;
  /** Mark stage (remove): same scene + selection. Optional until R2 filled. */
  markUrl?: string;
  /** Outline stage (add): black outline of exact object. */
  outlineUrl?: string;
  /** After stage: same scene with object removed or added. */
  afterUrl?: string;
  beforeR2Key: string;
  markR2Key?: string;
  outlineR2Key?: string;
  afterR2Key?: string;
  fallbackSrc?: string;
  aspectRatio: string;
  quality: string;
  generationMode: string;
  buildDuration: string;
  sortOrder: number;
  active: boolean;
};

const ADD = "circle/samples/add";
const REMOVE = "circle/samples/remove";

const U = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Local repo assets (already in git under src/assets — served via import path fallback). */
const LOCAL_REMOVAL_BEFORE = "/src/assets/sample-removal-before.jpg";
const LOCAL_REMOVAL_AFTER = "/src/assets/sample-removal-after.jpg";
const LOCAL_OBJECT_BEFORE = "/src/assets/sample-object-before.jpg";
const LOCAL_OBJECT_AFTER = "/src/assets/sample-object-after.jpg";

export const CIRCLE_SAMPLES: CircleSample[] = [
  {
    id: "rm-butterfly",
    title: "Remove butterfly",
    description: "Circle the butterfly on the flower — AI reconstructs the bloom cleanly.",
    mode: "remove",
    assetId: null,
    category: "remove",
    objectLabel: "Butterfly",
    beforeUrl: U("photo-1444464666168-49d633b86797"),
    // markUrl intentionally omitted until true same-scene mark asset is on R2
    afterUrl: undefined,
    beforeR2Key: `${REMOVE}/butterfly-before.jpg`,
    markR2Key: `${REMOVE}/butterfly-mark.jpg`,
    afterR2Key: `${REMOVE}/butterfly-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Remove · Instant",
    buildDuration: "~8–15s",
    sortOrder: 0,
    active: true,
  },
  {
    id: "rm-people",
    title: "Remove distracting person",
    description: "Circle bystanders out of the frame.",
    mode: "remove",
    assetId: null,
    category: "remove",
    objectLabel: "Person",
    beforeUrl: U("photo-1529156069898-49953e39b3ac"),
    beforeR2Key: `${REMOVE}/people-before.jpg`,
    markR2Key: `${REMOVE}/people-mark.jpg`,
    afterR2Key: `${REMOVE}/people-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Remove · Instant",
    buildDuration: "~8–15s",
    sortOrder: 1,
    active: true,
  },
  {
    id: "rm-object",
    title: "Remove unwanted object",
    description: "Mark unwanted items and erase them cleanly.",
    mode: "remove",
    assetId: null,
    category: "remove",
    objectLabel: "Object",
    beforeUrl: LOCAL_OBJECT_BEFORE,
    afterUrl: LOCAL_OBJECT_AFTER,
    fallbackSrc: LOCAL_REMOVAL_AFTER,
    beforeR2Key: `${REMOVE}/object-before.jpg`,
    markR2Key: `${REMOVE}/object-mark.jpg`,
    afterR2Key: `${REMOVE}/object-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Remove · Instant",
    buildDuration: "~8–15s",
    sortOrder: 2,
    active: true,
  },
  {
    id: "add-cat",
    title: "Add a cat",
    description: "Place a photoreal cat that matches the scene.",
    mode: "add",
    assetId: "animal_cat",
    category: "animals",
    objectLabel: "Cat",
    beforeUrl: U("photo-1441974231531-c6227db76b6e"),
    afterUrl: U("photo-1514888286974-6c03e2ca1dba"),
    beforeR2Key: `${ADD}/cat-before.jpg`,
    outlineR2Key: `${ADD}/cat-outline.jpg`,
    afterR2Key: `${ADD}/cat-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 10,
    active: true,
  },
  {
    id: "add-dog",
    title: "Add a dog",
    description: "Natural breed, pose, and lighting match.",
    mode: "add",
    assetId: "animal_dog",
    category: "animals",
    objectLabel: "Dog",
    beforeUrl: U("photo-1441974231531-c6227db76b6e"),
    afterUrl: U("photo-1552053831-71594a27632d"),
    beforeR2Key: `${ADD}/dog-before.jpg`,
    outlineR2Key: `${ADD}/dog-outline.jpg`,
    afterR2Key: `${ADD}/dog-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 11,
    active: true,
  },
  {
    id: "add-bird",
    title: "Add a bird",
    description: "Delicate scale and feather detail.",
    mode: "add",
    assetId: "animal_bird",
    category: "animals",
    objectLabel: "Bird",
    beforeUrl: U("photo-1441974231531-c6227db76b6e"),
    afterUrl: U("photo-1444464666168-49d633b86797"),
    beforeR2Key: `${ADD}/bird-before.jpg`,
    outlineR2Key: `${ADD}/bird-outline.jpg`,
    afterR2Key: `${ADD}/bird-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 12,
    active: true,
  },
  {
    id: "add-rabbit",
    title: "Add a rabbit",
    description: "Soft fur with ground contact.",
    mode: "add",
    assetId: "animal_rabbit",
    category: "animals",
    objectLabel: "Rabbit",
    beforeUrl: U("photo-1441974231531-c6227db76b6e"),
    afterUrl: U("photo-1583511655857-d19b40a7a54e"),
    beforeR2Key: `${ADD}/rabbit-before.jpg`,
    outlineR2Key: `${ADD}/rabbit-outline.jpg`,
    afterR2Key: `${ADD}/rabbit-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 13,
    active: true,
  },
  {
    id: "add-fox",
    title: "Add a fox",
    description: "Wild look, scene-matched shadows.",
    mode: "add",
    assetId: "animal_fox",
    category: "animals",
    objectLabel: "Fox",
    beforeUrl: U("photo-1441974231531-c6227db76b6e"),
    afterUrl: U("photo-1474511320723-9a56873867b5"),
    beforeR2Key: `${ADD}/fox-before.jpg`,
    outlineR2Key: `${ADD}/fox-outline.jpg`,
    afterR2Key: `${ADD}/fox-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 14,
    active: true,
  },
  {
    id: "add-deer",
    title: "Add a deer",
    description: "Forest-scale proportions.",
    mode: "add",
    assetId: "animal_deer",
    category: "animals",
    objectLabel: "Deer",
    beforeUrl: U("photo-1441974231531-c6227db76b6e"),
    afterUrl: U("photo-1546182990-dffeafbe841d"),
    beforeR2Key: `${ADD}/deer-before.jpg`,
    outlineR2Key: `${ADD}/deer-outline.jpg`,
    afterR2Key: `${ADD}/deer-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 15,
    active: true,
  },
  {
    id: "add-horse",
    title: "Add a horse",
    description: "Strong anatomy and ground contact.",
    mode: "add",
    assetId: "animal_horse",
    category: "animals",
    objectLabel: "Horse",
    beforeUrl: U("photo-1441974231531-c6227db76b6e"),
    afterUrl: U("photo-1553284965-83fd3e82fa5a"),
    beforeR2Key: `${ADD}/horse-before.jpg`,
    outlineR2Key: `${ADD}/horse-outline.jpg`,
    afterR2Key: `${ADD}/horse-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 16,
    active: true,
  },
  {
    id: "add-owl",
    title: "Add an owl",
    description: "Expressive eyes, natural perch.",
    mode: "add",
    assetId: "animal_owl",
    category: "animals",
    objectLabel: "Owl",
    beforeUrl: U("photo-1441974231531-c6227db76b6e"),
    afterUrl: U("photo-1546182990-dffeafbe841d"),
    beforeR2Key: `${ADD}/owl-before.jpg`,
    outlineR2Key: `${ADD}/owl-outline.jpg`,
    afterR2Key: `${ADD}/owl-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 17,
    active: true,
  },
  {
    id: "add-swan",
    title: "Add a swan",
    description: "Graceful neck, water-ready scale.",
    mode: "add",
    assetId: "animal_swan",
    category: "animals",
    objectLabel: "Swan",
    beforeUrl: U("photo-1506905925346-21bda4d32df4"),
    afterUrl: U("photo-1552728089-57bdde30beb3"),
    beforeR2Key: `${ADD}/swan-before.jpg`,
    outlineR2Key: `${ADD}/swan-outline.jpg`,
    afterR2Key: `${ADD}/swan-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 18,
    active: true,
  },
  {
    id: "add-squirrel",
    title: "Add a squirrel",
    description: "Bushy tail, small wildlife scale.",
    mode: "add",
    assetId: "animal_squirrel",
    category: "animals",
    objectLabel: "Squirrel",
    beforeUrl: U("photo-1441974231531-c6227db76b6e"),
    afterUrl: U("photo-1514888286974-6c03e2ca1dba"),
    beforeR2Key: `${ADD}/squirrel-before.jpg`,
    outlineR2Key: `${ADD}/squirrel-outline.jpg`,
    afterR2Key: `${ADD}/squirrel-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 19,
    active: true,
  },
  {
    id: "add-shoe",
    title: "Add shoes",
    description: "Correct perspective and ground contact.",
    mode: "add",
    assetId: "obj_shoe",
    category: "objects",
    objectLabel: "Shoe",
    beforeUrl: U("photo-1497366216548-37526070297c"),
    afterUrl: U("photo-1542291026-7eec264c27ff"),
    beforeR2Key: `${ADD}/shoe-before.jpg`,
    outlineR2Key: `${ADD}/shoe-outline.jpg`,
    afterR2Key: `${ADD}/shoe-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 20,
    active: true,
  },
  {
    id: "add-hat",
    title: "Add a hat",
    description: "Natural fit to scene lighting.",
    mode: "add",
    assetId: "obj_hat",
    category: "objects",
    objectLabel: "Hat",
    beforeUrl: U("photo-1497366216548-37526070297c"),
    afterUrl: U("photo-1521369909029-2afed882baee"),
    beforeR2Key: `${ADD}/hat-before.jpg`,
    outlineR2Key: `${ADD}/hat-outline.jpg`,
    afterR2Key: `${ADD}/hat-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 21,
    active: true,
  },
  {
    id: "add-glasses",
    title: "Add glasses",
    description: "Frame and lens reflections match the scene.",
    mode: "add",
    assetId: "obj_glasses",
    category: "objects",
    objectLabel: "Glasses",
    beforeUrl: U("photo-1497366216548-37526070297c"),
    afterUrl: U("photo-1511499767150-a48a237f0083"),
    beforeR2Key: `${ADD}/glasses-before.jpg`,
    outlineR2Key: `${ADD}/glasses-outline.jpg`,
    afterR2Key: `${ADD}/glasses-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 22,
    active: true,
  },
  {
    id: "add-vase",
    title: "Add a vase",
    description: "Material and contact shadow on surfaces.",
    mode: "add",
    assetId: "obj_vase",
    category: "objects",
    objectLabel: "Vase",
    beforeUrl: U("photo-1497366216548-37526070297c"),
    afterUrl: U("photo-1565193566173-7a0ee3dbe261"),
    beforeR2Key: `${ADD}/vase-before.jpg`,
    outlineR2Key: `${ADD}/vase-outline.jpg`,
    afterR2Key: `${ADD}/vase-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 23,
    active: true,
  },
  {
    id: "add-cake",
    title: "Add a cake",
    description: "Dessert scale and soft lighting.",
    mode: "add",
    assetId: "obj_cake",
    category: "objects",
    objectLabel: "Cake",
    beforeUrl: U("photo-1497366216548-37526070297c"),
    afterUrl: U("photo-1578985545062-69928b1d9587"),
    beforeR2Key: `${ADD}/cake-before.jpg`,
    outlineR2Key: `${ADD}/cake-outline.jpg`,
    afterR2Key: `${ADD}/cake-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 24,
    active: true,
  },
  {
    id: "add-car",
    title: "Add a car",
    description: "Vehicle scale and road contact.",
    mode: "add",
    assetId: "vehicle_car",
    category: "vehicles",
    objectLabel: "Car",
    beforeUrl: U("photo-1449824913935-59a10b8d2000"),
    afterUrl: U("photo-1494976388531-d1058494cdd8"),
    beforeR2Key: `${ADD}/car-before.jpg`,
    outlineR2Key: `${ADD}/car-outline.jpg`,
    afterR2Key: `${ADD}/car-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 30,
    active: true,
  },
  {
    id: "add-bicycle",
    title: "Add a bicycle",
    description: "Correct frame geometry and ground contact.",
    mode: "add",
    assetId: "vehicle_bicycle",
    category: "vehicles",
    objectLabel: "Bicycle",
    beforeUrl: U("photo-1449824913935-59a10b8d2000"),
    afterUrl: U("photo-1485965120184-e220f721d03e"),
    beforeR2Key: `${ADD}/bicycle-before.jpg`,
    outlineR2Key: `${ADD}/bicycle-outline.jpg`,
    afterR2Key: `${ADD}/bicycle-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 31,
    active: true,
  },
  {
    id: "add-scooter",
    title: "Add a scooter",
    description: "Compact vehicle, natural placement.",
    mode: "add",
    assetId: "vehicle_scooter",
    category: "vehicles",
    objectLabel: "Scooter",
    beforeUrl: U("photo-1449824913935-59a10b8d2000"),
    afterUrl: U("photo-1485965120184-e220f721d03e"),
    beforeR2Key: `${ADD}/scooter-before.jpg`,
    outlineR2Key: `${ADD}/scooter-outline.jpg`,
    afterR2Key: `${ADD}/scooter-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 32,
    active: true,
  },
  {
    id: "add-motorcycle",
    title: "Add a motorcycle",
    description: "Strong silhouette, road contact.",
    mode: "add",
    assetId: "vehicle_motorcycle",
    category: "vehicles",
    objectLabel: "Motorcycle",
    beforeUrl: U("photo-1449824913935-59a10b8d2000"),
    afterUrl: U("photo-1494976388531-d1058494cdd8"),
    beforeR2Key: `${ADD}/motorcycle-before.jpg`,
    outlineR2Key: `${ADD}/motorcycle-outline.jpg`,
    afterR2Key: `${ADD}/motorcycle-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 33,
    active: true,
  },
  {
    id: "add-bus",
    title: "Add a bus",
    description: "Transit proportions, ground contact.",
    mode: "add",
    assetId: "vehicle_bus",
    category: "vehicles",
    objectLabel: "Bus",
    beforeUrl: U("photo-1449824913935-59a10b8d2000"),
    afterUrl: U("photo-1570125909232-eb263c188f7e"),
    beforeR2Key: `${ADD}/bus-before.jpg`,
    outlineR2Key: `${ADD}/bus-outline.jpg`,
    afterR2Key: `${ADD}/bus-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 34,
    active: true,
  },
  {
    id: "add-tree",
    title: "Add a tree",
    description: "Canopy and trunk scale to the scene.",
    mode: "add",
    assetId: "nature_tree",
    category: "nature",
    objectLabel: "Tree",
    beforeUrl: U("photo-1506905925346-21bda4d32df4"),
    afterUrl: U("photo-1441974231531-c6227db76b6e"),
    beforeR2Key: `${ADD}/tree-before.jpg`,
    outlineR2Key: `${ADD}/tree-outline.jpg`,
    afterR2Key: `${ADD}/tree-after.jpg`,
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 40,
    active: true,
  },
];

function r2PublicBase(): string {
  const base =
    (typeof import.meta !== "undefined" &&
      (import.meta as { env?: Record<string, string> }).env?.VITE_R2_PUBLIC_URL) ||
    (typeof process !== "undefined" && process.env?.VITE_R2_PUBLIC_URL) ||
    "";
  return String(base || "").replace(/\/$/, "");
}

function joinR2(key: string): string | null {
  const base = r2PublicBase();
  if (!base || !key) return null;
  return `${base}/${key.replace(/^\//, "")}`;
}

export function getActiveCircleSamples(): CircleSample[] {
  return CIRCLE_SAMPLES.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getCircleSampleById(id: string | null | undefined): CircleSample | null {
  if (!id) return null;
  return CIRCLE_SAMPLES.find((s) => s.id === id) ?? null;
}

export function getRemoveDemoSamples(): CircleSample[] {
  return getActiveCircleSamples().filter((s) => s.mode === "remove").slice(0, 3);
}

export type CircleMediaStage = "before" | "mark" | "outline" | "after";

/**
 * Resolve stage-specific media.
 * Priority: explicit stage URL > R2 key for stage > beforeUrl > fallback.
 * Mark without markUrl falls back to before (UI may overlay CSS selection).
 */
export function resolveCircleSampleMediaUrl(
  sample: CircleSample,
  opts?: { preferR2?: boolean; stage?: CircleMediaStage },
): string {
  const stage = opts?.stage ?? "before";

  if (stage === "mark") {
    if (sample.markUrl) return sample.markUrl;
    const r2 = sample.markR2Key ? joinR2(sample.markR2Key) : null;
    if (r2 && opts?.preferR2) return r2;
    if (r2) return r2;
    // Same scene as before — UI draws purple mark overlay
    return sample.beforeUrl || sample.fallbackSrc || "";
  }

  if (stage === "outline") {
    if (sample.outlineUrl) return sample.outlineUrl;
    const r2 = sample.outlineR2Key ? joinR2(sample.outlineR2Key) : null;
    if (r2) return r2;
    return sample.beforeUrl || "";
  }

  if (stage === "after") {
    if (sample.afterUrl) return sample.afterUrl;
    const r2 = sample.afterR2Key ? joinR2(sample.afterR2Key) : null;
    if (r2) return r2;
    // Honest fallback: do not silently reuse before as "after" result when possible
    if (sample.fallbackSrc) return sample.fallbackSrc;
    return sample.beforeUrl || "";
  }

  // before
  if (opts?.preferR2 && sample.beforeR2Key) {
    const r2 = joinR2(sample.beforeR2Key);
    if (r2) return r2;
  }
  if (sample.beforeUrl) return sample.beforeUrl;
  const r2b = joinR2(sample.beforeR2Key);
  if (r2b) return r2b;
  if (sample.fallbackSrc) return sample.fallbackSrc;
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect fill="#1a1c24" width="400" height="500"/><text x="200" y="250" text-anchor="middle" fill="#9aa0b0" font-family="system-ui" font-size="14">${sample.title}</text></svg>`,
  )}`;
}

export type CircleFromContext = "home" | "info" | "sample";

export function circleSampleTryHref(
  sample: CircleSample,
  from: CircleFromContext = "home",
): string {
  const params = new URLSearchParams();
  params.set("mode", sample.mode);
  if (sample.assetId) params.set("assetId", sample.assetId);
  params.set("sampleId", sample.id);
  params.set("from", from);
  return `/studio/image/circle-remove?${params.toString()}`;
}

export function circleInfoHref(sampleId?: string | null): string {
  if (sampleId) return `/studio/image/circle-info?sampleId=${encodeURIComponent(sampleId)}`;
  return "/studio/image/circle-info";
}

export function resolveCircleBackTarget(from?: string | null, sampleId?: string | null): string {
  if (from === "home") return "/";
  if (from === "sample" && sampleId) {
    return `/studio/image/circle-info?sampleId=${encodeURIComponent(sampleId)}`;
  }
  if (from === "info") return "/studio/image/circle-info";
  return "/studio/image/circle-info";
}
