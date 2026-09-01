/**
 * Circle 2edit public sample catalog — exactly 25 cards.
 * Photographic pairs: optimized static assets under src/assets.
 * Try Now preserves assetId for ADD samples.
 */
import objectBefore from "@/assets/sample-object-before.jpg";
import objectAfter from "@/assets/sample-object-after.jpg";
import removalBefore from "@/assets/sample-removal-before.jpg";
import removalAfter from "@/assets/sample-removal-after.jpg";
import restoreBefore from "@/assets/sample-restore-before.jpg";
import restoreAfter from "@/assets/sample-restore-after.jpg";

export type CircleSampleLabel =
  | "SAMPLE"
  | "ADD"
  | "REMOVE"
  | "TREND"
  | "TRY ON"
  | "NEW"
  | "POPULAR"
  | "ANIMAL"
  | "FASHION"
  | "OBJECT"
  | "VEHICLE"
  | "NATURE";

export type CircleSampleAction = "add" | "remove";

export type CircleSample = {
  id: string;
  label: CircleSampleLabel;
  secondaryLabel?: CircleSampleLabel;
  title: string;
  action: CircleSampleAction;
  /** Registry asset id for ADD; null for pure remove demos */
  assetId: string | null;
  description: string;
  beforeImage: string;
  afterImage: string;
  category: string;
  quality: string;
  aspectRatio: string;
  dateLabel: string;
  timeLabel: string;
  tool: string;
  operation: string;
  attribution: string;
  poweredBy: string;
  tags: string[];
  downloadable: boolean;
  tryNow: boolean;
  detailsHref: "/studio/image/circle-info";
  tryHref: string;
};

const DATE = "September 1, 2026";
const ATTR = "Edited by Motio2edit";
const POWER = "Powered by Motion2AI";

function addSample(
  id: string,
  title: string,
  assetId: string,
  category: string,
  label: CircleSampleLabel,
  before: string,
  after: string,
  time: string,
  desc: string,
): CircleSample {
  return {
    id,
    label,
    secondaryLabel: "ADD",
    title,
    action: "add",
    assetId,
    description: desc,
    beforeImage: before,
    afterImage: after,
    category,
    quality: "High Quality",
    aspectRatio: "16:9",
    dateLabel: DATE,
    timeLabel: time,
    tool: "Circle 2edit",
    operation: "Add Object",
    attribution: ATTR,
    poweredBy: POWER,
    tags: ["add", category.toLowerCase()],
    downloadable: true,
    tryNow: true,
    detailsHref: "/studio/image/circle-info",
    tryHref: `/studio/image/circle-remove?mode=add&assetId=${encodeURIComponent(assetId)}`,
  };
}

function removeSample(
  id: string,
  title: string,
  category: string,
  label: CircleSampleLabel,
  before: string,
  after: string,
  time: string,
  desc: string,
): CircleSample {
  return {
    id,
    label,
    secondaryLabel: "REMOVE",
    title,
    action: "remove",
    assetId: null,
    description: desc,
    beforeImage: before,
    afterImage: after,
    category,
    quality: "High Quality",
    aspectRatio: "16:9",
    dateLabel: DATE,
    timeLabel: time,
    tool: "Circle 2edit",
    operation: "Remove Object",
    attribution: ATTR,
    poweredBy: POWER,
    tags: ["remove", category.toLowerCase()],
    downloadable: true,
    tryNow: true,
    detailsHref: "/studio/image/circle-info",
    tryHref: "/studio/image/circle-remove?mode=remove",
  };
}

/** Exactly 25 samples: 13 ADD + 12 REMOVE */
export const CIRCLE_SAMPLES: CircleSample[] = [
  removeSample(
    "circle-remove-butterfly-zinnia-2026-09-01",
    "Remove a butterfly from a flower",
    "Nature",
    "SAMPLE",
    restoreBefore,
    restoreAfter,
    "10:15 AM",
    "Remove an unwanted butterfly from a detailed flower photograph while preserving the flower, background depth, lighting, and natural composition.",
  ),
  addSample(
    "circle-add-bird-2026-09-01",
    "Add a bird",
    "animal_bird",
    "Animals",
    "ANIMAL",
    objectBefore,
    objectAfter,
    "10:22 AM",
    "Add a photorealistic bird into a marked region with scene-matched lighting and scale.",
  ),
  removeSample(
    "circle-remove-dog-2026-09-01",
    "Remove a dog",
    "Animals",
    "ANIMAL",
    removalBefore,
    removalAfter,
    "10:30 AM",
    "Remove a dog from the scene while restoring background continuity.",
  ),
  addSample(
    "circle-add-dog-2026-09-01",
    "Add a dog",
    "animal_dog",
    "Animals",
    "ANIMAL",
    objectBefore,
    objectAfter,
    "10:38 AM",
    "Place a realistic dog into the selected area with correct perspective.",
  ),
  removeSample(
    "circle-remove-cat-2026-09-01",
    "Remove a cat",
    "Animals",
    "ANIMAL",
    removalBefore,
    removalAfter,
    "10:45 AM",
    "Remove a cat while preserving surrounding detail and lighting.",
  ),
  addSample(
    "circle-add-cat-2026-09-01",
    "Add a cat",
    "animal_cat",
    "Animals",
    "ANIMAL",
    objectBefore,
    objectAfter,
    "10:52 AM",
    "Add a photorealistic cat matching scene scale and shadows.",
  ),
  addSample(
    "circle-add-flower-2026-09-01",
    "Add a flower",
    "obj_flower",
    "Nature",
    "NATURE",
    objectBefore,
    objectAfter,
    "11:00 AM",
    "Insert a single flower with natural petals and stem into the mask.",
  ),
  removeSample(
    "circle-remove-flower-2026-09-01",
    "Remove a flower",
    "Nature",
    "NATURE",
    restoreBefore,
    restoreAfter,
    "11:08 AM",
    "Remove a flower element while keeping the rest of the botanical scene intact.",
  ),
  addSample(
    "circle-add-hat-2026-09-01",
    "Add a hat",
    "obj_hat",
    "Objects",
    "OBJECT",
    objectBefore,
    objectAfter,
    "11:15 AM",
    "Add a hat with realistic material and contact shading.",
  ),
  removeSample(
    "circle-remove-hat-2026-09-01",
    "Remove a hat",
    "Objects",
    "OBJECT",
    removalBefore,
    removalAfter,
    "11:22 AM",
    "Remove a hat from the frame and restore the underlying area.",
  ),
  addSample(
    "circle-add-shoes-2026-09-01",
    "Add shoes",
    "obj_shoe",
    "Objects",
    "OBJECT",
    objectBefore,
    objectAfter,
    "11:30 AM",
    "Place a pair of shoes with ground contact and correct perspective.",
  ),
  addSample(
    "circle-add-jacket-2026-09-01",
    "Add a jacket",
    "cloth_jacket",
    "Clothing",
    "FASHION",
    objectBefore,
    objectAfter,
    "11:38 AM",
    "Add a jacket with natural fabric folds and scene lighting.",
  ),
  addSample(
    "circle-add-hoodie-2026-09-01",
    "Add a hoodie",
    "cloth_hoodie",
    "Clothing",
    "FASHION",
    objectBefore,
    objectAfter,
    "11:45 AM",
    "Insert a hoodie with soft fabric texture matched to the photo.",
  ),
  addSample(
    "circle-add-handbag-2026-09-01",
    "Add a handbag",
    "cloth_handbag",
    "Clothing",
    "FASHION",
    objectBefore,
    objectAfter,
    "11:52 AM",
    "Add a handbag with realistic material and handles.",
  ),
  addSample(
    "circle-add-backpack-2026-09-01",
    "Add a backpack",
    "obj_backpack",
    "Objects",
    "OBJECT",
    objectBefore,
    objectAfter,
    "12:00 PM",
    "Place a backpack with straps and ground contact.",
  ),
  addSample(
    "circle-add-camera-2026-09-01",
    "Add a camera",
    "obj_camera",
    "Objects",
    "OBJECT",
    objectBefore,
    objectAfter,
    "12:08 PM",
    "Add a camera body with lens reflections matched to the scene.",
  ),
  addSample(
    "circle-add-guitar-2026-09-01",
    "Add a guitar",
    "obj_guitar",
    "Objects",
    "OBJECT",
    objectBefore,
    objectAfter,
    "12:15 PM",
    "Insert a guitar with correct proportions and material response.",
  ),
  addSample(
    "circle-add-football-2026-09-01",
    "Add a football",
    "obj_football",
    "Objects",
    "OBJECT",
    objectBefore,
    objectAfter,
    "12:22 PM",
    "Add a football (soccer ball) with panel texture and contact shadow.",
  ),
  addSample(
    "circle-add-car-2026-09-01",
    "Add a car",
    "vehicle_car",
    "Vehicles",
    "VEHICLE",
    objectBefore,
    objectAfter,
    "12:30 PM",
    "Place a passenger vehicle with tire shadows and body reflections.",
  ),
  removeSample(
    "circle-remove-car-2026-09-01",
    "Remove a car",
    "Vehicles",
    "VEHICLE",
    removalBefore,
    removalAfter,
    "12:38 PM",
    "Remove a vehicle and restore the road or background behind it.",
  ),
  addSample(
    "circle-add-tree-2026-09-01",
    "Add a tree",
    "nature_tree",
    "Nature",
    "NATURE",
    objectBefore,
    objectAfter,
    "12:45 PM",
    "Add a tree with natural canopy and trunk at scene-correct scale.",
  ),
  removeSample(
    "circle-remove-branch-2026-09-01",
    "Remove a tree branch",
    "Nature",
    "NATURE",
    restoreBefore,
    restoreAfter,
    "12:52 PM",
    "Remove an unwanted branch while preserving foliage continuity.",
  ),
  addSample(
    "circle-add-glasses-2026-09-01",
    "Add sunglasses",
    "obj_glasses",
    "Objects",
    "OBJECT",
    objectBefore,
    objectAfter,
    "1:00 PM",
    "Add eyeglasses or sunglasses with realistic lenses and frames.",
  ),
  addSample(
    "circle-add-suit-2026-09-01",
    "Add a suit",
    "cloth_suit",
    "Clothing",
    "FASHION",
    objectBefore,
    objectAfter,
    "1:08 PM",
    "Add a formal suit silhouette with photorealistic fabric.",
  ),
  removeSample(
    "circle-remove-unwanted-2026-09-01",
    "Remove unwanted object",
    "Objects",
    "REMOVE",
    removalBefore,
    removalAfter,
    "1:15 PM",
    "Circle and remove any unwanted object while matching the original scene.",
  ),
];

export const CIRCLE_SAMPLE_COUNT = CIRCLE_SAMPLES.length;

export const CIRCLE_SAMPLE_BUTTERFLY = CIRCLE_SAMPLES[0];

export function getPrimaryCircleSample(): CircleSample {
  return CIRCLE_SAMPLES[0]!;
}

export function getCircleSampleById(id: string): CircleSample | undefined {
  return CIRCLE_SAMPLES.find((s) => s.id === id);
}

export function getCircleAddSampleCount(): number {
  return CIRCLE_SAMPLES.filter((s) => s.action === "add").length;
}

export function getCircleRemoveSampleCount(): number {
  return CIRCLE_SAMPLES.filter((s) => s.action === "remove").length;
}
