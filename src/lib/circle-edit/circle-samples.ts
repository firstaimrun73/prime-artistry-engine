/**
 * Circle 2edit sample cards — metadata + reliable media.
 * Priority: mediaUrl (HTTPS) > R2 public when verified > fallbackSrc.
 * POST-LOGIN homepage only.
 * Unsplash License: https://unsplash.com/license
 */

export type CircleSampleMode = "add" | "remove";

export type CircleSample = {
  id: string;
  title: string;
  description: string;
  mode: CircleSampleMode;
  assetId: string | null;
  category: string;
  r2Key: string;
  mediaUrl: string;
  /** Optional marked / selection stage image (same scene + purple circle). */
  markUrl?: string;
  /** Optional after / result image (same scene, object removed or added). */
  afterUrl?: string;
  fallbackSrc?: string;
  aspectRatio?: string;
  quality?: string;
  generationMode?: string;
  buildDuration?: string;
  objectLabel?: string;
  sortOrder: number;
  active: boolean;
};

const ADD = "circle/samples/add";
const REMOVE = "circle/samples/remove";

const U = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const CIRCLE_SAMPLES: CircleSample[] = [
  {
    id: "rm-butterfly",
    title: "Remove butterfly",
    description: "Circle the butterfly on the flower — AI reconstructs the bloom cleanly.",
    mode: "remove",
    assetId: null,
    category: "remove",
    r2Key: `${REMOVE}/object.jpg`,
    mediaUrl: U("photo-1506905925346-21bda4d32df4"),
    fallbackSrc: "/assets/sample-removal-after.jpg",
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Remove · Instant",
    buildDuration: "~8–15s",
    objectLabel: "Butterfly",
    sortOrder: 0,
    active: true,
  },
  {
    id: "rm-object",
    title: "Remove object",
    description: "Mark unwanted items and erase them cleanly.",
    mode: "remove",
    assetId: null,
    category: "remove",
    r2Key: `${REMOVE}/object.jpg`,
    mediaUrl: U("photo-1506905925346-21bda4d32df4"),
    fallbackSrc: "/assets/sample-removal-after.jpg",
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Remove · Instant",
    buildDuration: "~8–15s",
    objectLabel: "Object",
    sortOrder: 1,
    active: true,
  },
  {
    id: "rm-people",
    title: "Remove people",
    description: "Circle bystanders out of the frame.",
    mode: "remove",
    assetId: null,
    category: "remove",
    r2Key: `${REMOVE}/people.jpg`,
    mediaUrl: U("photo-1529156069898-49953e39b3ac"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Remove · Instant",
    buildDuration: "~8–15s",
    objectLabel: "Person",
    sortOrder: 2,
    active: true,
  },
  {
    id: "rm-text",
    title: "Remove text",
    description: "Clear signs, watermarks, and overlays.",
    mode: "remove",
    assetId: null,
    category: "remove",
    r2Key: `${REMOVE}/text.jpg`,
    mediaUrl: U("photo-1561070791-2526d30994b5"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Remove · Instant",
    buildDuration: "~8–15s",
    objectLabel: "Text",
    sortOrder: 3,
    active: false,
  },
  {
    id: "rm-clutter",
    title: "Clear clutter",
    description: "Tidy messy backgrounds in one pass.",
    mode: "remove",
    assetId: null,
    category: "remove",
    r2Key: `${REMOVE}/clutter.jpg`,
    mediaUrl: U("photo-1484480974693-6ca0a78fb36b"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Remove · Instant",
    buildDuration: "~8–15s",
    objectLabel: "Clutter",
    sortOrder: 4,
    active: false,
  },
  {
    id: "rm-shadow",
    title: "Fix shadows",
    description: "Soften or remove harsh cast shadows.",
    mode: "remove",
    assetId: null,
    category: "remove",
    r2Key: `${REMOVE}/shadow.jpg`,
    mediaUrl: U("photo-1497366216548-37526070297c"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Remove · Instant",
    buildDuration: "~8–15s",
    objectLabel: "Shadow",
    sortOrder: 5,
    active: false,
  },
  {
    id: "add-cat",
    title: "Add a cat",
    description: "Place a photoreal cat that matches the scene.",
    mode: "add",
    assetId: "animal_cat",
    category: "animals",
    r2Key: `${ADD}/cat.jpg`,
    mediaUrl: U("photo-1514888286974-6c03e2ca1dba"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Cat",
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
    r2Key: `${ADD}/dog.jpg`,
    mediaUrl: U("photo-1552053831-71594a27632d"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Dog",
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
    r2Key: `${ADD}/bird.jpg`,
    mediaUrl: U("photo-1444464666168-49d633b86797"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Bird",
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
    r2Key: `${ADD}/rabbit.jpg`,
    mediaUrl: U("photo-1583511655857-d19b40a7a54e"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Rabbit",
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
    r2Key: `${ADD}/fox.jpg`,
    mediaUrl: U("photo-1474511320723-9a56873867b5"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Fox",
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
    r2Key: `${ADD}/deer.jpg`,
    mediaUrl: U("photo-1546182990-dffeafbe841d"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Deer",
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
    r2Key: `${ADD}/horse.jpg`,
    mediaUrl: U("photo-1553284965-83fd3e82fa5a"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Horse",
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
    r2Key: `${ADD}/owl.jpg`,
    mediaUrl: U("photo-1546182990-dffeafbe841d"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Owl",
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
    r2Key: `${ADD}/swan.jpg`,
    mediaUrl: U("photo-1552728089-57bdde30beb3"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Swan",
    sortOrder: 18,
    active: true,
  },
  {
    id: "add-shoe",
    title: "Add shoes",
    description: "Correct perspective and ground contact.",
    mode: "add",
    assetId: "obj_shoe",
    category: "objects",
    r2Key: `${ADD}/shoe.jpg`,
    mediaUrl: U("photo-1542291026-7eec264c27ff"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Shoe",
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
    r2Key: `${ADD}/hat.jpg`,
    mediaUrl: U("photo-1521369909029-2afed882baee"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Hat",
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
    r2Key: `${ADD}/glasses.jpg`,
    mediaUrl: U("photo-1511499767150-a48a237f0083"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Glasses",
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
    r2Key: `${ADD}/vase.jpg`,
    mediaUrl: U("photo-1565193566173-7a0ee3dbe261"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Vase",
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
    r2Key: `${ADD}/cake.jpg`,
    mediaUrl: U("photo-1578985545062-69928b1d9587"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Cake",
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
    r2Key: `${ADD}/car.jpg`,
    mediaUrl: U("photo-1494976388531-d1058494cdd8"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Car",
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
    r2Key: `${ADD}/bicycle.jpg`,
    mediaUrl: U("photo-1485965120184-e220f721d03e"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Bicycle",
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
    r2Key: `${ADD}/scooter.jpg`,
    mediaUrl: U("photo-1485965120184-e220f721d03e"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Scooter",
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
    r2Key: `${ADD}/motorcycle.jpg`,
    mediaUrl: U("photo-1494976388531-d1058494cdd8"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Motorcycle",
    sortOrder: 33,
    active: true,
  },
  {
    id: "add-tree",
    title: "Add a tree",
    description: "Canopy and trunk scale to the scene.",
    mode: "add",
    assetId: "nature_tree",
    category: "nature",
    r2Key: `${ADD}/tree.jpg`,
    mediaUrl: U("photo-1441974231531-c6227db76b6e"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Tree",
    sortOrder: 40,
    active: true,
  },
  {
    id: "add-squirrel",
    title: "Add a squirrel",
    description: "Bushy tail, small wildlife scale.",
    mode: "add",
    assetId: "animal_squirrel",
    category: "animals",
    r2Key: `${ADD}/squirrel.jpg`,
    mediaUrl: U("photo-1514888286974-6c03e2ca1dba"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Squirrel",
    sortOrder: 41,
    active: true,
  },
  {
    id: "add-bus",
    title: "Add a bus",
    description: "Transit proportions, ground contact.",
    mode: "add",
    assetId: "vehicle_bus",
    category: "vehicles",
    r2Key: `${ADD}/bus.jpg`,
    mediaUrl: U("photo-1570125909232-eb263c188f7e"),
    aspectRatio: "4:5",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    objectLabel: "Bus",
    sortOrder: 42,
    active: true,
  },
];

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

export function resolveCircleSampleMediaUrl(
  sample: CircleSample,
  opts?: { preferR2?: boolean; stage?: "before" | "mark" | "after" },
): string {
  const base =
    (typeof import.meta !== "undefined" &&
      (import.meta as { env?: Record<string, string> }).env?.VITE_R2_PUBLIC_URL) ||
    (typeof process !== "undefined" && process.env?.VITE_R2_PUBLIC_URL) ||
    "";
  const cleaned = String(base || "").replace(/\/$/, "");

  if (opts?.stage === "mark" && sample.markUrl) return sample.markUrl;
  if (opts?.stage === "after" && sample.afterUrl) return sample.afterUrl;

  if (opts?.preferR2 && cleaned) {
    return `${cleaned}/${sample.r2Key.replace(/^\//, "")}`;
  }
  if (sample.mediaUrl) return sample.mediaUrl;
  if (cleaned) return `${cleaned}/${sample.r2Key.replace(/^\//, "")}`;
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
  // Default: product info (safer than generic Image Studio)
  return "/studio/image/circle-info";
}
