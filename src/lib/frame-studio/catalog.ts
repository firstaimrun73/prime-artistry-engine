/**
 * Authoritative Frame Studio catalog (~101 frames).
 * Single source for UI, compositor, and server entitlement.
 */
export type FrameTier = "common" | "aiplus" | "premium";
export type FrameKind = "mat" | "glass" | "specialty";
export type RatioFilter = { all: true } | { min?: number; max?: number };

export type FrameDef = {
  id: string;
  name: string;
  tier: FrameTier;
  kind: FrameKind;
  ratios: RatioFilter;
  color?: string;
  texture?: string;
  pad: number;
  radius: number;
  inner?: number;
  bevel?: number;
  gloss?: number;
  tint?: number;
  tintColor?: string;
  frost?: number;
  sheen?: number;
  aurora?: boolean;
  perf?: boolean;
  browser?: boolean;
  story?: boolean;
  notch?: boolean;
  brackets?: boolean;
  polaroid?: boolean;
  filmreel?: boolean;
  camera?: boolean;
  treasure?: boolean;
  stitched?: boolean;
  keyline?: number;
  wide?: boolean;
};

export const FRAME_CREDIT_COST: Record<FrameTier, number> = {
  common: 5,
  aiplus: 15,
  premium: 25,
};

export const FRAMES: FrameDef[] = [
  { id: "paper", name: "Paper", tier: "common", kind: "mat", texture: "paper", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "paper-wide", name: "Paper Wide", tier: "aiplus", kind: "mat", texture: "paper", pad: 8.2, radius: 1.0, wide: true, ratios: { all: true } },
  { id: "kraft", name: "Kraft", tier: "premium", kind: "mat", texture: "kraft", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "kraft-wide", name: "Kraft Wide", tier: "common", kind: "mat", texture: "kraft", pad: 8.2, radius: 1.0, wide: true, ratios: { all: true } },
  { id: "linen", name: "Linen", tier: "aiplus", kind: "mat", texture: "linen", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "concrete", name: "Concrete", tier: "premium", kind: "mat", texture: "concrete", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "concrete-wide", name: "Concrete Wide", tier: "common", kind: "mat", texture: "concrete", pad: 8.2, radius: 1.0, wide: true, ratios: { all: true } },
  { id: "cork", name: "Cork", tier: "aiplus", kind: "mat", texture: "cork", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "denim", name: "Denim", tier: "premium", kind: "mat", texture: "denim", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "watercolor", name: "Watercolor", tier: "common", kind: "mat", texture: "watercolor", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "filmgrain", name: "Filmgrain", tier: "aiplus", kind: "mat", texture: "filmgrain", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "frostgrain", name: "Frostgrain", tier: "premium", kind: "mat", texture: "frostgrain", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "walnut", name: "Walnut", tier: "common", kind: "mat", texture: "walnut", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "walnut-wide", name: "Walnut Wide", tier: "aiplus", kind: "mat", texture: "walnut", pad: 8.2, radius: 1.0, wide: true, ratios: { all: true } },
  { id: "oak", name: "Oak", tier: "premium", kind: "mat", texture: "oak", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "oak-wide", name: "Oak Wide", tier: "common", kind: "mat", texture: "oak", pad: 8.2, radius: 1.0, wide: true, ratios: { all: true } },
  { id: "ebony", name: "Ebony", tier: "aiplus", kind: "mat", texture: "ebony", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "leatherB", name: "Leather B", tier: "premium", kind: "mat", texture: "leatherB", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "leatherB-wide", name: "Leather B Wide", tier: "common", kind: "mat", texture: "leatherB", pad: 8.2, radius: 1.0, wide: true, ratios: { all: true } },
  { id: "leatherT", name: "Leather T", tier: "aiplus", kind: "mat", texture: "leatherT", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "silver", name: "Silver", tier: "premium", kind: "mat", texture: "silver", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "rosegold", name: "Rosegold", tier: "common", kind: "mat", texture: "rosegold", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "goldfoil", name: "Goldfoil", tier: "aiplus", kind: "mat", texture: "goldfoil", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "marbleW", name: "Marble W", tier: "premium", kind: "mat", texture: "marbleW", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "marbleW-wide", name: "Marble W Wide", tier: "common", kind: "mat", texture: "marbleW", pad: 8.2, radius: 1.0, wide: true, ratios: { all: true } },
  { id: "marbleB", name: "Marble B", tier: "aiplus", kind: "mat", texture: "marbleB", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "marbleB-wide", name: "Marble B Wide", tier: "premium", kind: "mat", texture: "marbleB", pad: 8.2, radius: 1.0, wide: true, ratios: { all: true } },
  { id: "carbon", name: "Carbon", tier: "common", kind: "mat", texture: "carbon", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "holo", name: "Holo", tier: "aiplus", kind: "mat", texture: "holo", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "brass", name: "Brass", tier: "premium", kind: "mat", texture: "brass", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "copper", name: "Copper", tier: "common", kind: "mat", texture: "copper", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "rust", name: "Rust", tier: "aiplus", kind: "mat", texture: "rust", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "slate", name: "Slate", tier: "premium", kind: "mat", texture: "slate", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "slate-wide", name: "Slate Wide", tier: "common", kind: "mat", texture: "slate", pad: 8.2, radius: 1.0, wide: true, ratios: { all: true } },
  { id: "driftwood", name: "Driftwood", tier: "aiplus", kind: "mat", texture: "driftwood", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "bamboo", name: "Bamboo", tier: "premium", kind: "mat", texture: "bamboo", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "velvet", name: "Velvet", tier: "common", kind: "mat", texture: "velvet", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "galaxy", name: "Galaxy", tier: "aiplus", kind: "mat", texture: "galaxy", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "galaxy-wide", name: "Galaxy Wide", tier: "premium", kind: "mat", texture: "galaxy", pad: 8.2, radius: 1.0, wide: true, ratios: { all: true } },
  { id: "emerald", name: "Emerald", tier: "common", kind: "mat", texture: "emerald", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "sapphire", name: "Sapphire", tier: "aiplus", kind: "mat", texture: "sapphire", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "champagne", name: "Champagne", tier: "premium", kind: "mat", texture: "champagne", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "terracotta", name: "Terracotta", tier: "common", kind: "mat", texture: "terracotta", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "blush", name: "Blush", tier: "aiplus", kind: "mat", texture: "blush", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "mint", name: "Mint", tier: "premium", kind: "mat", texture: "mint", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "bone", name: "Bone", tier: "common", kind: "mat", texture: "bone", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "ancientStone", name: "Ancient Stone", tier: "aiplus", kind: "mat", texture: "ancientStone", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "museumGold", name: "Museum Gold", tier: "premium", kind: "mat", texture: "museumGold", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "vhsTape", name: "Vhs Tape", tier: "common", kind: "mat", texture: "vhsTape", pad: 5.6, radius: 1.2, wide: false, ratios: { all: true } },
  { id: "c-white", name: "Clean White", tier: "aiplus", kind: "mat", color: "#fdfdfe", pad: 9, radius: 1.4, wide: true, ratios: { all: true } },
  { id: "c-ivory", name: "Ivory", tier: "premium", kind: "mat", color: "#f7f1e4", pad: 3.8, radius: 2.2, wide: false, ratios: { all: true } },
  { id: "c-cream", name: "Cream", tier: "common", kind: "mat", color: "#f4e9d6", pad: 3.8, radius: 2.2, wide: false, ratios: { all: true } },
  { id: "c-charcoal", name: "Charcoal", tier: "aiplus", kind: "mat", color: "#23242b", pad: 9, radius: 1.4, wide: true, ratios: { all: true } },
  { id: "c-onyx", name: "Onyx Line", tier: "premium", kind: "mat", color: "#13151d", pad: 3.8, radius: 2.2, wide: false, ratios: { all: true } },
  { id: "c-stone", name: "Stone", tier: "common", kind: "mat", color: "#8d8a82", pad: 3.8, radius: 2.2, wide: false, ratios: { all: true } },
  { id: "c-blushc", name: "Blush", tier: "aiplus", kind: "mat", color: "#f2d3d6", pad: 9, radius: 1.4, wide: true, ratios: { all: true } },
  { id: "c-sagec", name: "Sage", tier: "premium", kind: "mat", color: "#c9d3c1", pad: 3.8, radius: 2.2, wide: false, ratios: { all: true } },
  { id: "c-mintc", name: "Mint", tier: "common", kind: "mat", color: "#d3ecdf", pad: 3.8, radius: 2.2, wide: false, ratios: { all: true } },
  { id: "c-navy", name: "Navy", tier: "aiplus", kind: "mat", color: "#1c2540", pad: 9, radius: 1.4, wide: true, ratios: { all: true } },
  { id: "c-wine", name: "Wine", tier: "premium", kind: "mat", color: "#4b1a24", pad: 3.8, radius: 2.2, wide: false, ratios: { all: true } },
  { id: "c-forest", name: "Forest", tier: "common", kind: "mat", color: "#1e3527", pad: 3.8, radius: 2.2, wide: false, ratios: { all: true } },
  { id: "c-mocha", name: "Mocha", tier: "aiplus", kind: "mat", color: "#5a4230", pad: 9, radius: 1.4, wide: true, ratios: { all: true } },
  { id: "c-lilac", name: "Lilac", tier: "premium", kind: "mat", color: "#ddd0ee", pad: 3.8, radius: 2.2, wide: false, ratios: { all: true } },
  { id: "c-butter", name: "Butter", tier: "common", kind: "mat", color: "#f7e6ab", pad: 3.8, radius: 2.2, wide: false, ratios: { all: true } },
  { id: "c-coral", name: "Coral", tier: "aiplus", kind: "mat", color: "#f0a08c", pad: 9, radius: 1.4, wide: true, ratios: { all: true } },
  { id: "c-olive", name: "Olive", tier: "premium", kind: "mat", color: "#6c6b3f", pad: 3.8, radius: 2.2, wide: false, ratios: { all: true } },
  { id: "c-slateblue", name: "Slate Blue", tier: "common", kind: "mat", color: "#3c4a63", pad: 3.8, radius: 2.2, wide: false, ratios: { all: true } },
  { id: "c-sand", name: "Sand", tier: "aiplus", kind: "mat", color: "#dcc7a0", pad: 9, radius: 1.4, wide: true, ratios: { all: true } },
  { id: "c-gallery", name: "Gallery Mat", tier: "premium", kind: "mat", color: "#fefefe", pad: 3.8, radius: 2.2, wide: false, ratios: { all: true } },
  { id: "g-clear", name: "Clear Glass", tier: "common", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.32, frost: 0.15, sheen: 0, ratios: { all: true } },
  { id: "g-frost", name: "Frosted Edge", tier: "aiplus", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.42, frost: 0.5, sheen: 0, ratios: { all: true } },
  { id: "g-sheen", name: "Sheen Glass", tier: "premium", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.3, frost: 0, sheen: 0.6, ratios: { all: true } },
  { id: "g-pill", name: "Glass Pill", tier: "common", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.3, frost: 0, sheen: 0, ratios: { all: true } },
  { id: "g-aurora", name: "Aurora Glass", tier: "aiplus", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.3, frost: 0.3, sheen: 0.5, aurora: true, ratios: { all: true } },
  { id: "g-rosegl", name: "Rose Glass", tier: "premium", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.44, frost: 0.2, sheen: 0.3, tintColor: "255,190,212", ratios: { all: true } },
  { id: "g-iceGlass", name: "Ice Glass", tier: "common", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.44, frost: 0.25, sheen: 0.3, tintColor: "190,226,255", ratios: { all: true } },
  { id: "g-smoke", name: "Smoke Glass", tier: "aiplus", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.58, frost: 0.2, sheen: 0.25, tintColor: "18,22,38", ratios: { all: true } },
  { id: "g-emeraldGl", name: "Emerald Glass", tier: "premium", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.4, frost: 0.2, sheen: 0.3, tintColor: "150,230,190", ratios: { all: true } },
  { id: "g-sapphireGl", name: "Sapphire Glass", tier: "common", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.4, frost: 0.2, sheen: 0.3, tintColor: "170,200,255", ratios: { all: true } },
  { id: "film", name: "Film Strip", tier: "aiplus", kind: "glass", tintColor: "14,16,26", tint: 0.62, pad: 8.6, radius: 3, perf: true, ratios: {min: 1.25} },
  { id: "browser", name: "Browser Glass", tier: "common", kind: "glass", tint: 0.5, pad: 7.6, radius: 3, browser: true, ratios: {min: 1.15} },
  { id: "story", name: "Story Glass", tier: "aiplus", kind: "glass", tint: 0.36, pad: 2.4, radius: 9, story: true, ratios: {max: 0.75} },
  { id: "phone", name: "Phone Glass", tier: "premium", kind: "glass", tint: 0.5, pad: 3.2, radius: 13, notch: true, ratios: {max: 0.68} },
  { id: "arch", name: "Arch Glass", tier: "common", kind: "glass", tint: 0.35, pad: 3.2, radius: 18, ratios: { all: true } },
  { id: "orb", name: "Orb Glass", tier: "aiplus", kind: "glass", tint: 0.4, pad: 4, radius: 50, ratios: {min: 0.85, max: 1.2} },
  { id: "corners", name: "Corner Marks", tier: "common", kind: "mat", color: "#ffffff", pad: 0, radius: 1.6, brackets: true, ratios: { all: true } },
  { id: "polaroid", name: "Instant Print", tier: "common", kind: "mat", color: "#FFFEFB", pad: 6, radius: 2, polaroid: true, ratios: { all: true } },
  { id: "filmreel1", name: "Film Reel", tier: "premium", kind: "specialty", color: "#1a1a1a", pad: 10, radius: 2, filmreel: true, ratios: {min: 1.2} },
  { id: "filmreel2", name: "Film Reel — Silver", tier: "aiplus", kind: "specialty", color: "#c0c0c0", pad: 10, radius: 2, filmreel: true, ratios: {min: 1.2} },
  { id: "camera1", name: "Instant Camera", tier: "premium", kind: "specialty", color: "#e8e4dc", pad: 12, radius: 8, camera: true, ratios: {min: 0.9, max: 1.4} },
  { id: "camera2", name: "Instant Camera — Kraft", tier: "aiplus", kind: "specialty", color: "#c4a574", pad: 12, radius: 8, camera: true, ratios: {min: 0.9, max: 1.4} },
  { id: "treasure1", name: "Treasure Gold", tier: "premium", kind: "specialty", color: "#c9a86a", pad: 8, radius: 4, treasure: true, ratios: { all: true } },
  { id: "treasure2", name: "Treasure Chest", tier: "premium", kind: "specialty", color: "#5c3d1e", pad: 9, radius: 3, treasure: true, ratios: { all: true } },
  { id: "denimSt", name: "Denim Stitched", tier: "aiplus", kind: "mat", texture: "denim", pad: 6, radius: 3, stitched: true, ratios: { all: true } },
  { id: "leatherSt", name: "Leather Stitched", tier: "premium", kind: "mat", texture: "leatherB", pad: 6, radius: 3, stitched: true, ratios: { all: true } },
  { id: "museumArt", name: "Museum Art", tier: "premium", kind: "mat", texture: "museumGold", pad: 10, radius: 1, ratios: { all: true } },
  { id: "ancientRelic", name: "Ancient Relic", tier: "premium", kind: "mat", texture: "ancientStone", pad: 8, radius: 2, ratios: { all: true } },
  { id: "boneBorder", name: "Bone Border", tier: "aiplus", kind: "mat", texture: "bone", pad: 7, radius: 2, ratios: { all: true } },
  { id: "skullCorners", name: "Skull Corners", tier: "premium", kind: "specialty", color: "#2a2a2a", pad: 6, radius: 2, brackets: true, ratios: { all: true } },
  { id: "videoReel", name: "Video Reel", tier: "aiplus", kind: "specialty", color: "#111", pad: 9, radius: 2, filmreel: true, ratios: {min: 1.3} },
  { id: "galleryDouble", name: "Gallery Double Mat", tier: "common", kind: "mat", color: "#fafafa", pad: 8, radius: 0, keyline: 2, ratios: { all: true } }
];

export const FRAME_BY_ID: Record<string, FrameDef> = Object.fromEntries(
  FRAMES.map((f) => [f.id, f]),
);

export function getFrameById(id: string): FrameDef | undefined {
  return FRAME_BY_ID[id];
}

export function framesForAspect(aspect: number): FrameDef[] {
  if (!Number.isFinite(aspect) || aspect <= 0) return FRAMES;
  return FRAMES.filter((f) => {
    if ("all" in f.ratios && f.ratios.all) return true;
    const r = f.ratios as { min?: number; max?: number };
    if (r.min != null && aspect < r.min) return false;
    if (r.max != null && aspect > r.max) return false;
    return true;
  });
}

export const CATALOG_COUNT = FRAMES.length;
