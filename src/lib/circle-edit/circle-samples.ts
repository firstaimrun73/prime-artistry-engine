/**
 * Circle 2edit sample cards — metadata only.
 * Binaries live on Cloudflare R2 under circle/samples/{add|remove}/.
 * Supabase holds auth + optional metadata rows; never sample binaries.
 * POST-LOGIN homepage only — never mount on signed-out home.
 */

export type CircleSampleMode = "add" | "remove";

export type CircleSample = {
  id: string;
  title: string;
  description: string;
  mode: CircleSampleMode;
  /** Preserved on Try Now → editor */
  assetId: string | null;
  category: string;
  /** R2 object key for card visual (1:1 composition preferred) */
  r2Key: string;
  /** Optional local fallback path during migration */
  fallbackSrc?: string;
  sortOrder: number;
  active: boolean;
};

const ADD = "circle/samples/add";
const REMOVE = "circle/samples/remove";

/** 25+ polished Circle cards — supported Add/Remove only */
export const CIRCLE_SAMPLES: CircleSample[] = [
  { id: "rm-object", title: "Remove object", description: "Mark unwanted items and erase them cleanly.", mode: "remove", assetId: null, category: "remove", r2Key: `${REMOVE}/object.jpg`, fallbackSrc: "/assets/sample-removal-after.jpg", sortOrder: 1, active: true },
  { id: "rm-people", title: "Remove people", description: "Circle bystanders out of the frame.", mode: "remove", assetId: null, category: "remove", r2Key: `${REMOVE}/people.jpg`, sortOrder: 2, active: true },
  { id: "rm-text", title: "Remove text", description: "Clear signs, watermarks, and overlays.", mode: "remove", assetId: null, category: "remove", r2Key: `${REMOVE}/text.jpg`, sortOrder: 3, active: true },
  { id: "rm-clutter", title: "Clear clutter", description: "Tidy messy backgrounds in one pass.", mode: "remove", assetId: null, category: "remove", r2Key: `${REMOVE}/clutter.jpg`, sortOrder: 4, active: true },
  { id: "rm-shadow", title: "Fix shadows", description: "Soften or remove harsh cast shadows.", mode: "remove", assetId: null, category: "remove", r2Key: `${REMOVE}/shadow.jpg`, sortOrder: 5, active: true },
  { id: "add-cat", title: "Add a cat", description: "Place a photoreal cat that matches the scene.", mode: "add", assetId: "animal_cat", category: "animals", r2Key: `${ADD}/cat.jpg`, sortOrder: 10, active: true },
  { id: "add-dog", title: "Add a dog", description: "Natural breed, pose, and lighting match.", mode: "add", assetId: "animal_dog", category: "animals", r2Key: `${ADD}/dog.jpg`, sortOrder: 11, active: true },
  { id: "add-bird", title: "Add a bird", description: "Delicate scale and feather detail.", mode: "add", assetId: "animal_bird", category: "animals", r2Key: `${ADD}/bird.jpg`, sortOrder: 12, active: true },
  { id: "add-rabbit", title: "Add a rabbit", description: "Soft fur with ground contact.", mode: "add", assetId: "animal_rabbit", category: "animals", r2Key: `${ADD}/rabbit.jpg`, sortOrder: 13, active: true },
  { id: "add-fox", title: "Add a fox", description: "Wild look, scene-matched shadows.", mode: "add", assetId: "animal_fox", category: "animals", r2Key: `${ADD}/fox.jpg`, sortOrder: 14, active: true },
  { id: "add-deer", title: "Add a deer", description: "Forest-scale proportions.", mode: "add", assetId: "animal_deer", category: "animals", r2Key: `${ADD}/deer.jpg`, sortOrder: 15, active: true },
  { id: "add-horse", title: "Add a horse", description: "Correct anatomy and contact shadows.", mode: "add", assetId: "animal_horse", category: "animals", r2Key: `${ADD}/horse.jpg`, sortOrder: 16, active: true },
  { id: "add-owl", title: "Add an owl", description: "Alert eyes, folded or open wings.", mode: "add", assetId: "animal_owl", category: "animals", r2Key: `${ADD}/owl.jpg`, sortOrder: 17, active: true },
  { id: "add-swan", title: "Add a swan", description: "Elegant S-curve neck in context.", mode: "add", assetId: "animal_swan", category: "animals", r2Key: `${ADD}/swan.jpg`, sortOrder: 18, active: true },
  { id: "add-shoe", title: "Add shoes", description: "Perspective and ground contact.", mode: "add", assetId: "obj_shoe", category: "objects", r2Key: `${ADD}/shoe.jpg`, sortOrder: 20, active: true },
  { id: "add-hat", title: "Add a hat", description: "Fabric texture that fits the light.", mode: "add", assetId: "obj_hat", category: "objects", r2Key: `${ADD}/hat.jpg`, sortOrder: 21, active: true },
  { id: "add-glasses", title: "Add glasses", description: "Realistic lenses and frames.", mode: "add", assetId: "obj_glasses", category: "objects", r2Key: `${ADD}/glasses.jpg`, sortOrder: 22, active: true },
  { id: "add-vase", title: "Add a vase", description: "Material reflections matched to the photo.", mode: "add", assetId: "obj_vase", category: "objects", r2Key: `${ADD}/vase.jpg`, sortOrder: 23, active: true },
  { id: "add-cake", title: "Add a cake", description: "Frosting texture, natural scale.", mode: "add", assetId: "obj_cake", category: "objects", r2Key: `${ADD}/cake.jpg`, sortOrder: 24, active: true },
  { id: "add-car", title: "Add a car", description: "Tire contact and body reflections.", mode: "add", assetId: "vehicle_car", category: "vehicles", r2Key: `${ADD}/car.jpg`, sortOrder: 30, active: true },
  { id: "add-bike", title: "Add a bicycle", description: "Correct geometry, ground contact.", mode: "add", assetId: "vehicle_bicycle", category: "vehicles", r2Key: `${ADD}/bicycle.jpg`, sortOrder: 31, active: true },
  { id: "add-scooter", title: "Add a scooter", description: "Compact scale, side profile.", mode: "add", assetId: "vehicle_scooter", category: "vehicles", r2Key: `${ADD}/scooter.jpg`, sortOrder: 32, active: true },
  { id: "add-motorcycle", title: "Add a motorcycle", description: "Engine mass and wheel contact.", mode: "add", assetId: "vehicle_motorcycle", category: "vehicles", r2Key: `${ADD}/motorcycle.jpg`, sortOrder: 33, active: true },
  { id: "add-tree", title: "Add a tree", description: "Canopy and trunk scale to the scene.", mode: "add", assetId: "nature_tree", category: "animals", r2Key: `${ADD}/tree.jpg`, sortOrder: 40, active: true },
  { id: "add-squirrel", title: "Add a squirrel", description: "Bushy tail, small wildlife scale.", mode: "add", assetId: "animal_squirrel", category: "animals", r2Key: `${ADD}/squirrel.jpg`, sortOrder: 41, active: true },
  { id: "add-bus", title: "Add a bus", description: "Transit proportions, ground contact.", mode: "add", assetId: "vehicle_bus", category: "vehicles", r2Key: `${ADD}/bus.jpg`, sortOrder: 42, active: true },
];

export function getActiveCircleSamples(): CircleSample[] {
  return CIRCLE_SAMPLES.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Public R2 delivery base from env (client-safe public URL only). */
export function resolveCircleSampleMediaUrl(sample: CircleSample): string {
  const base =
    (typeof import.meta !== "undefined" &&
      (import.meta as { env?: Record<string, string> }).env?.VITE_R2_PUBLIC_URL) ||
    (typeof process !== "undefined" && process.env?.VITE_R2_PUBLIC_URL) ||
    "";
  const cleaned = String(base).replace(/\/$/, "");
  if (cleaned) return `${cleaned}/${sample.r2Key.replace(/^\//, "")}`;
  if (sample.fallbackSrc) return sample.fallbackSrc;
  // Placeholder data URI so cards still render before R2 public domain is set
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#2a2d3a"/><stop offset="100%" stop-color="#7B6FE0" stop-opacity="0.45"/>
      </linearGradient></defs>
      <rect width="400" height="400" fill="url(#g)"/>
      <circle cx="200" cy="180" r="48" fill="none" stroke="#7B6FE0" stroke-width="4"/>
      <circle cx="200" cy="180" r="10" fill="#7B6FE0"/>
      <text x="200" y="280" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="18" font-weight="700">${sample.title.replace(/[<>&]/g, "")}</text>
      <text x="200" y="310" text-anchor="middle" fill="#c5c7d0" font-family="Arial,sans-serif" font-size="12">${sample.mode.toUpperCase()}</text>
    </svg>`,
  )}`;
}

/** Query params for Try Now → editor */
export function circleSampleTryHref(sample: CircleSample): string {
  const params = new URLSearchParams();
  params.set("mode", sample.mode);
  if (sample.assetId) params.set("assetId", sample.assetId);
  params.set("sampleId", sample.id);
  return `/studio/image/circle-remove?${params.toString()}`;
}
