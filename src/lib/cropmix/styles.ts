/**
 * Cropmix collage — exactly 10 style recipes.
 * One schema consumed by a single rendering/generation path.
 */
import type { CollageStyle, CollageStyleId } from "./types";

export const COLLAG_STYLES: readonly CollageStyle[] = [
  {
    id: "normal-grid",
    name: "Normal Grid",
    tier: "common",
    cellCount: { min: 1, max: 10 },
    layoutFn: "grid-balanced",
    defaults: { gutter: 8, border: 0, cornerRadius: 4, background: "#0B0B12" },
    capabilities: { gutter: true, border: true, cornerRadius: true, background: true },
    safeZones: false,
    description: "Clean everyday grid, predictable cells and spacing",
  },
  {
    id: "clean-editorial",
    name: "Clean Editorial",
    tier: "common",
    cellCount: { min: 1, max: 10 },
    layoutFn: "editorial-balanced",
    defaults: { gutter: 16, border: 0, cornerRadius: 0, background: "#F5F5F0" },
    capabilities: { gutter: true, border: false, cornerRadius: false, background: true },
    safeZones: false,
    description: "Minimal magazine-like composition, balanced spacing",
  },
  {
    id: "comic-page",
    name: "Comic Page",
    tier: "ai_plus",
    cellCount: { min: 2, max: 10 },
    layoutFn: "comic-panels",
    defaults: { gutter: 10, border: 3, cornerRadius: 2, background: "#111111" },
    capabilities: { gutter: true, border: true, cornerRadius: true, background: true },
    safeZones: true,
    description: "Varied comic panels, reading order, caption-safe zones",
  },
  {
    id: "storyboard",
    name: "Storyboard",
    tier: "ai_plus",
    cellCount: { min: 2, max: 10 },
    layoutFn: "storyboard-row",
    defaults: { gutter: 12, border: 1, cornerRadius: 0, background: "#1A1A1A" },
    capabilities: { gutter: true, border: true, cornerRadius: false, background: true },
    safeZones: true,
    description: "Sequential cinematic frames for storytelling",
  },
  {
    id: "film-strip",
    name: "Film Strip",
    tier: "ai_plus",
    cellCount: { min: 2, max: 8 },
    layoutFn: "film-strip",
    defaults: { gutter: 6, border: 0, cornerRadius: 0, background: "#0A0A0A" },
    capabilities: { gutter: true, border: false, cornerRadius: false, background: true },
    safeZones: false,
    description: "Film-frame composition, reel-inspired structure",
  },
  {
    id: "magazine",
    name: "Magazine",
    tier: "ai_plus",
    cellCount: { min: 2, max: 8 },
    layoutFn: "magazine-hero",
    defaults: { gutter: 14, border: 0, cornerRadius: 0, background: "#FAFAF7" },
    capabilities: { gutter: true, border: false, cornerRadius: false, background: true },
    safeZones: true,
    description: "Editorial hero + supporting images + typography-safe zones",
  },
  {
    id: "polaroid-memory",
    name: "Polaroid Memory",
    tier: "ai_plus",
    cellCount: { min: 1, max: 8 },
    layoutFn: "polaroid-stack",
    defaults: { gutter: 20, border: 0, cornerRadius: 2, background: "#E8E4DC" },
    capabilities: { gutter: true, border: false, cornerRadius: true, background: true },
    safeZones: false,
    description: "Layered photo cards, controlled rotation, paper-style framing",
  },
  {
    id: "dynamic-diagonal",
    name: "Dynamic Diagonal",
    tier: "ai_plus",
    cellCount: { min: 2, max: 8 },
    layoutFn: "diagonal-panels",
    defaults: { gutter: 8, border: 0, cornerRadius: 0, background: "#0D0D12" },
    capabilities: { gutter: true, border: false, cornerRadius: false, background: true },
    safeZones: false,
    description: "Diagonal motion-led panels, varied geometry",
  },
  {
    id: "mosaic",
    name: "Mosaic",
    tier: "ai_plus",
    cellCount: { min: 3, max: 10 },
    layoutFn: "mosaic-tiles",
    defaults: { gutter: 4, border: 0, cornerRadius: 0, background: "#080808" },
    capabilities: { gutter: true, border: false, cornerRadius: false, background: true },
    safeZones: false,
    description: "Mixed-size tiles, auto-balanced across the canvas",
  },
  {
    id: "hero-supporting",
    name: "Hero + Supporting",
    tier: "ai_plus",
    cellCount: { min: 2, max: 9 },
    layoutFn: "hero-support",
    defaults: { gutter: 10, border: 0, cornerRadius: 6, background: "#101018" },
    capabilities: { gutter: true, border: false, cornerRadius: true, background: true },
    safeZones: false,
    description: "One dominant hero image surrounded by supporting photos",
  },
] as const;

export function getStyleById(id: string): CollageStyle | undefined {
  return COLLAG_STYLES.find((s) => s.id === id);
}

export function isValidStyleId(id: string): id is CollageStyleId {
  return COLLAG_STYLES.some((s) => s.id === id);
}

export function recommendStyles(photoCount: number): CollageStyleId[] {
  return COLLAG_STYLES.filter(
    (s) => photoCount >= s.cellCount.min && photoCount <= s.cellCount.max,
  ).map((s) => s.id);
}
