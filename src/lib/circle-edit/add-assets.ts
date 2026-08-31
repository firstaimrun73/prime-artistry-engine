/**
 * Circle 2edit Add — production registry.
 * Initial release: curated ~50 assets with factors (server-authoritative).
 * Large seed catalog kept available for future expansion via USE_FULL_SEED.
 */
import { parseSeedAssets } from "./add-assets-seed";
import { CURATED_ADD_ASSETS } from "./curated-assets";
import type { CircleAddAsset, AssetVariationProfile } from "./add-assets-types";

export type { CircleAddAsset, AssetVariationProfile, AssetFactor, AssetFactorOption, Motion2AIMode } from "./add-assets-types";
export type { AddAsset } from "./add-assets-types";

/** When true, merges legacy 400+ seed (not recommended for initial UX). */
const USE_FULL_SEED = false;

const INTEGRATE =
  "Match camera angle, perspective, depth of field, and sharpness of the source photograph. " +
  "Match lighting direction, intensity, color temperature, exposure, and shadow softness. " +
  "Infer realistic scale from surrounding objects and the editable region; do not stretch the object to fill the mask. " +
  "Establish natural ground or surface contact with realistic contact shadows; no floating. " +
  "Match material response, reflections, and occlusion. Preserve unmasked pixels. " +
  "Edit only the white mask; leave every black pixel unchanged. " +
  "Do not regenerate the scene or add extra copies. The object must look photographed in the original scene, not like a sticker or cutout.";

function mergeAddRegistry(): CircleAddAsset[] {
  const byId = new Map<string, CircleAddAsset>();
  if (USE_FULL_SEED) {
    for (const a of parseSeedAssets()) byId.set(a.id, a);
  }
  for (const a of CURATED_ADD_ASSETS) byId.set(a.id, a);
  return Array.from(byId.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

export const ADD_ASSETS: CircleAddAsset[] = mergeAddRegistry();

export function getAddAssetCount(): number {
  return ADD_ASSETS.filter((a) => a.isActive).length;
}

export const ADD_ASSET_CATEGORIES = Array.from(
  new Map(ADD_ASSETS.map((a) => [a.category, a.categoryLabel])).entries(),
).map(([id, label]) => ({ id, label }));

const LEGACY_ID_MAP: Record<string, string> = {
  giraffe: "animal_giraffe",
  sunflower: "nature_sunflower",
  dog: "animal_dog",
  car: "vehicle_car",
  butterfly: "insect_butterfly",
  cat: "animal_cat",
};

export function findAddAsset(id: string | null | undefined): CircleAddAsset | null {
  if (!id) return null;
  const key = LEGACY_ID_MAP[id] ?? id;
  return ADD_ASSETS.find((a) => a.id === key || a.slug === key) ?? null;
}

export function searchAddAssets(query: string, categoryId?: string | null): CircleAddAsset[] {
  let list = ADD_ASSETS.filter((a) => a.isActive);
  if (categoryId) list = list.filter((a) => a.category === categoryId);
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.id.includes(q) ||
      a.keywords.some((k) => k.includes(q)) ||
      a.tags.some((t) => t.includes(q)) ||
      a.categoryLabel.toLowerCase().includes(q),
  );
}

export function hashSeed(input: string | number): number {
  const s = String(input);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type ResolvedVariation = {
  seed: number;
  style: string | null;
  color: string | null;
  variationLine: string;
};

export function resolveAssetVariation(asset: CircleAddAsset, seed?: number | null): ResolvedVariation {
  const s =
    seed != null && Number.isFinite(seed)
      ? seed >>> 0
      : hashSeed(`${asset.id}:${Date.now()}:${Math.random()}`) >>> 0;
  const profile = asset.variationProfile;
  if (!profile?.enabled) return { seed: s, style: null, color: null, variationLine: "" };
  const style = profile.styles.length > 0 ? profile.styles[s % profile.styles.length] : null;
  const color =
    profile.colors.length > 0
      ? profile.colors[Math.floor(s / Math.max(1, profile.styles.length || 1)) % profile.colors.length]
      : null;
  const parts: string[] = [];
  if (style) parts.push(`Style: ${style}`);
  if (color) parts.push(`Color: ${color}`);
  const variationLine = parts.length
    ? `Controlled variation — ${parts.join("; ")}. Prefer when scene-compatible; adapt toward realism over breaking perspective.`
    : "";
  return { seed: s, style, color, variationLine };
}

/** Resolve factor option prompts server-side from selection map. */
export function resolveFactorPromptLines(
  asset: CircleAddAsset,
  factorSelection?: Record<string, string> | null,
): string[] {
  const lines: string[] = [];
  if (!factorSelection) return lines;
  const factors = asset.factors ?? [];
  for (const factor of factors) {
    const optionId = factorSelection[factor.id];
    if (!optionId) continue;
    const opt = factor.options.find((o) => o.id === optionId);
    if (opt?.prompt) lines.push(opt.prompt);
  }
  const motion = factorSelection["motion2ai"];
  if (motion && asset.motionModes?.includes(motion as never)) {
    const motionPrompts: Record<string, string> = {
      static: "neutral static pose appropriate for a still photograph",
      walking: "natural walking pose mid-stride",
      running: "natural running pose",
      sitting: "natural sitting posture",
      moving: "subtle sense of forward motion appropriate for a still frame",
      wind: "foliage or form gently affected by wind",
      flying: "natural in-flight posture for a still photograph",
    };
    const mp = motionPrompts[motion];
    if (mp) lines.push(`Motion2AI characterization: ${mp}`);
  }
  return lines;
}

export function buildAddPrompt(opts: {
  asset: CircleAddAsset | null;
  userDetail: string;
  variation?: ResolvedVariation | null;
  factorSelection?: Record<string, string> | null;
}): string {
  const detail = opts.userDetail.trim();
  if (opts.asset) {
    const chunks = [opts.asset.backendPrompt];
    const factorLines = resolveFactorPromptLines(opts.asset, opts.factorSelection);
    if (factorLines.length) chunks.push(`Object characterization: ${factorLines.join("; ")}.`);
    if (opts.variation?.variationLine) chunks.push(opts.variation.variationLine);
    // Intentionally do not append free-form client object identity as authoritative
    if (detail && detail !== "circle-add") chunks.push(`Additional scene hint (non-authoritative): ${detail.slice(0, 200)}`);
    return chunks.join(" ");
  }
  if (detail && detail !== "circle-add") {
    return `Add exactly one realistic ${detail} inside the user-selected masked region. ${INTEGRATE}`;
  }
  return `Add exactly one requested object inside the user-selected masked region. ${INTEGRATE}`;
}
