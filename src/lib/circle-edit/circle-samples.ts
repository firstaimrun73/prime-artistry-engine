/**
 * Circle 2edit sample registry — independent stage media + metadata.
 * Media: prefer local GitHub assets (1:1) so info pages never show blank stages.
 */

import sampleRemovalBefore from "@/assets/sample-removal-before.jpg";
import sampleRemovalAfter from "@/assets/sample-removal-after.jpg";
import sampleObjectBefore from "@/assets/sample-object-before.jpg";
import sampleObjectAfter from "@/assets/sample-object-after.jpg";
import sampleRestoreBefore from "@/assets/sample-restore-before.jpg";
import sampleRestoreAfter from "@/assets/sample-restore-after.jpg";

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

/** Local assets shipped in repo — reliable 1:1 product frames */
const LOCAL_REMOVAL_BEFORE = sampleRemovalBefore;
const LOCAL_REMOVAL_AFTER = sampleRemovalAfter;
const LOCAL_OBJECT_BEFORE = sampleObjectBefore;
const LOCAL_OBJECT_AFTER = sampleObjectAfter;
const LOCAL_RESTORE_BEFORE = sampleRestoreBefore;
const LOCAL_RESTORE_AFTER = sampleRestoreAfter;

export const CIRCLE_SAMPLES: CircleSample[] = [
  {
    id: "rm-object",
    title: "Remove unwanted object",
    description:
      "Before and After: mark the object you do not want and erase it. Same framing, object gone — clean fill matched to the background.",
    mode: "remove",
    assetId: null,
    category: "remove",
    objectLabel: "Object",
    beforeUrl: LOCAL_OBJECT_BEFORE,
    afterUrl: LOCAL_OBJECT_AFTER,
    fallbackSrc: LOCAL_REMOVAL_AFTER,
    beforeR2Key: `${REMOVE}/object-before.jpg`,
    afterR2Key: `${REMOVE}/object-after.jpg`,
    aspectRatio: "1:1",
    quality: "High",
    generationMode: "Circle Remove · Instant",
    buildDuration: "~8–15s",
    sortOrder: 0,
    active: true,
  },
  {
    id: "rm-butterfly",
    title: "Remove butterfly",
    description:
      "Before and After: small wildlife on a natural background. Circle the butterfly and restore the flower underneath.",
    mode: "remove",
    assetId: null,
    category: "remove",
    objectLabel: "Butterfly",
    beforeUrl: LOCAL_REMOVAL_BEFORE,
    afterUrl: LOCAL_REMOVAL_AFTER,
    beforeR2Key: `${REMOVE}/butterfly-before.jpg`,
    afterR2Key: `${REMOVE}/butterfly-after.jpg`,
    aspectRatio: "1:1",
    quality: "High",
    generationMode: "Circle Remove · Instant",
    buildDuration: "~8–15s",
    sortOrder: 1,
    active: true,
  },
  {
    id: "add-deer",
    title: "Add a deer",
    description:
      "Before and After: open scene becomes a placed deer matched to scale and light. Animal placement with natural proportions — 1:1 frames.",
    mode: "add",
    assetId: "animal_deer",
    category: "animals",
    objectLabel: "Deer",
    beforeUrl: LOCAL_RESTORE_BEFORE,
    afterUrl: LOCAL_RESTORE_AFTER,
    beforeR2Key: `${ADD}/deer-before.jpg`,
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
    description:
      "Before and After: place a photoreal cat that matches scene lighting and scale.",
    mode: "add",
    assetId: "animal_cat",
    category: "animals",
    objectLabel: "Cat",
    beforeUrl: LOCAL_OBJECT_BEFORE,
    afterUrl: LOCAL_OBJECT_AFTER,
    beforeR2Key: `${ADD}/cat-before.jpg`,
    afterR2Key: `${ADD}/cat-after.jpg`,
    aspectRatio: "1:1",
    quality: "High",
    generationMode: "Circle Add · Flux",
    buildDuration: "~12–25s",
    sortOrder: 10,
    active: true,
  },
  {
    id: "add-dog",
    title: "Add a dog",
    description:
      "Before and After: natural breed, pose, and lighting match for outdoor scenes.",
    mode: "add",
    assetId: "animal_dog",
    category: "animals",
    objectLabel: "Dog",
    beforeUrl: LOCAL_REMOVAL_BEFORE,
    afterUrl: LOCAL_REMOVAL_AFTER,
    beforeR2Key: `${ADD}/dog-before.jpg`,
    afterR2Key: `${ADD}/dog-after.jpg`,
    aspectRatio: "1:1",
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
    return sample.beforeUrl || sample.fallbackSrc || "";
  }

  if (stage === "outline") {
    if (sample.outlineUrl) return sample.outlineUrl;
    return sample.beforeUrl || "";
  }

  if (stage === "after") {
    if (sample.afterUrl) return sample.afterUrl;
    if (sample.fallbackSrc) return sample.fallbackSrc;
    const r2 = sample.afterR2Key ? joinR2(sample.afterR2Key) : null;
    if (r2) return r2;
    return sample.beforeUrl || "";
  }

  if (sample.beforeUrl) return sample.beforeUrl;
  if (opts?.preferR2 && sample.beforeR2Key) {
    const r2 = joinR2(sample.beforeR2Key);
    if (r2) return r2;
  }
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

/**
 * Back NEVER goes to Image Studio (/studio/image → redirects to /editor).
 * Missing/unknown from → homepage `/`.
 */
export function resolveCircleBackTarget(from?: string | null, sampleId?: string | null): string {
  if (from === "home") return "/";
  if (from === "studio") return "/studio";
  if (from === "sample" && sampleId) {
    return `/studio/image/circle-info?sampleId=${encodeURIComponent(sampleId)}`;
  }
  if (from === "info") {
    if (sampleId) return `/studio/image/circle-info?sampleId=${encodeURIComponent(sampleId)}`;
    return "/studio/image/circle-info";
  }
  return "/";
}

/** Safe browser navigation that never lands on Image Studio redirect. */
export function navigateCircleBack(from?: string | null, sampleId?: string | null): void {
  const target = resolveCircleBackTarget(from, sampleId);
  if (typeof window !== "undefined") {
    window.location.assign(target);
  }
}
