/**
 * Circle 2edit sample registry — independent stage media + metadata.
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
  beforeUrl: string;
  markUrl?: string;
  outlineUrl?: string;
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

const LOCAL_REMOVAL_BEFORE = "/src/assets/sample-removal-before.jpg";
const LOCAL_REMOVAL_AFTER = "/src/assets/sample-removal-after.jpg";
const LOCAL_OBJECT_BEFORE = "/src/assets/sample-object-before.jpg";
const LOCAL_OBJECT_AFTER = "/src/assets/sample-object-after.jpg";

export const CIRCLE_SAMPLES: CircleSample[] = [
  {
    id: "rm-butterfly",
    title: "Remove butterfly",
    description:
      "Before: butterfly on the flower. After: bloom restored cleanly. Best for small wildlife and insects on natural backgrounds.",
    mode: "remove",
    assetId: null,
    category: "remove",
    objectLabel: "Butterfly",
    beforeUrl: U("photo-1444464666168-49d633b86797"),
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
    description:
      "Before: crowd or bystander in frame. After: open scene without the person. Ideal for travel and architecture shots.",
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
    description:
      "Before & After: mark any object and erase it. Uses Motio2edit local demo assets for verified before/after comparison. Aspect ~1:1–4:5 product shots.",
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
    aspectRatio: "1:1",
    quality: "High",
    generationMode: "Circle Remove · Instant",
    buildDuration: "~8–15s",
    sortOrder: 2,
    active: true,
  },
  {
    id: "add-deer",
    title: "Add a deer",
    description:
      "Before: empty forest path. After: a deer that matches scale and light. Animal placement with natural proportions.",
    mode: "add",
    assetId: "animal_deer",
    category: "animals",
    objectLabel: "Deer",
    beforeUrl: U("photo-1441974231531-c6227db76b6e"),
    afterUrl: U("photo-1546182990-dffeafbe841d"),
    beforeR2Key: `${ADD}/deer-before.jpg`,
    outlineR2Key: `${ADD}/deer-outline.jpg`,
    afterR2Key: `${ADD}/deer-after.jpg`,
    aspectRatio: "1:1",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 15,
    active: true,
  },
  {
    id: "add-cat",
    title: "Add a cat",
    description: "Place a photoreal cat that matches the scene lighting and scale.",
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
    description: "Natural breed, pose, and lighting match for outdoor scenes.",
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

export function resolveCircleSampleMediaUrl(
  sample: CircleSample,
  opts?: { preferR2?: boolean; stage?: CircleMediaStage },
): string {
  const stage = opts?.stage ?? "before";

  if (stage === "mark") {
    if (sample.markUrl) return sample.markUrl;
    const r2 = sample.markR2Key ? joinR2(sample.markR2Key) : null;
    if (r2) return r2;
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
    if (sample.fallbackSrc) return sample.fallbackSrc;
    return sample.beforeUrl || "";
  }

  if (opts?.preferR2 && sample.beforeR2Key) {
    const r2 = joinR2(sample.beforeR2Key);
    if (r2) return r2;
  }
  if (sample.beforeUrl) return sample.beforeUrl;
  const r2b = joinR2(sample.beforeR2Key);
  if (r2b) return r2b;
  if (sample.fallbackSrc) return sample.fallbackSrc;
  return "";
}

export type CircleFromContext = "home" | "info" | "sample" | "studio";

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

/** Back never goes to Image Studio editor. */
export function resolveCircleBackTarget(from?: string | null, sampleId?: string | null): string {
  if (from === "home") return "/";
  if (from === "studio") return "/studio";
  if (from === "sample" && sampleId) {
    return `/studio/image/circle-info?sampleId=${encodeURIComponent(sampleId)}`;
  }
  if (from === "info") return "/studio/image/circle-info";
  // Safe default: homepage (not /studio/image → editor)
  return "/";
}
