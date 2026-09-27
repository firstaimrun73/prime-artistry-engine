/**
 * Authoritative Frame Studio catalog.
 * Full list available via More Frames; CURATED_FRAME_IDS drives the main ~35 rail.
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
  ornamental?: boolean;
  tags?: string[];
  materialLabel?: string;
};

export const FRAME_CREDIT_COST: Record<FrameTier, number> = {
  common: 5,
  aiplus: 15,
  premium: 25,
};

/** ~35 curated IDs for the main rail. Full FRAMES stays available in More Frames. */
export const CURATED_FRAME_IDS: string[] = [
  "paper", "kraft", "walnut", "oak", "polaroid", "galleryDouble",
  "c-charcoal", "g-clear", "watercolor", "corners",
  "linen", "film", "filmreel2", "videoReel", "camera2", "g-frost",
  "g-aurora", "driftwood", "denimSt", "rosegold", "marbleW",
  "museumGold", "treasure1", "leatherSt", "ebony", "marbleB",
  "camera1", "filmreel1", "g-sheen", "ancientRelic", "brass",
  "velvet", "goldfoil", "silver", "bamboo",
];

export const FRAMES: FrameDef[] = [
  // Common
  { id: "paper", name: "Paper Soft", tier: "common", kind: "mat", texture: "paper", pad: 5.6, radius: 1.2, tags: ["paper"], materialLabel: "Paper", ratios: { all: true } },
  { id: "kraft", name: "Kraft Natural", tier: "common", kind: "mat", texture: "kraft", pad: 5.6, radius: 1.2, tags: ["kraft","paper"], materialLabel: "Kraft", ratios: { all: true } },
  { id: "walnut", name: "Walnut Grain", tier: "common", kind: "mat", texture: "walnut", pad: 5.6, radius: 1.2, tags: ["wood","walnut"], materialLabel: "Walnut wood", ratios: { all: true } },
  { id: "polaroid", name: "Instant Print", tier: "common", kind: "mat", color: "#FFFEFB", pad: 6, radius: 2, polaroid: true, tags: ["instant","photo"], materialLabel: "Instant paper", ratios: { all: true } },
  { id: "galleryDouble", name: "Gallery Mat", tier: "common", kind: "mat", color: "#fafafa", pad: 8, radius: 0, keyline: 2, tags: ["gallery","mat"], materialLabel: "Gallery mat", ratios: { all: true } },
  { id: "c-charcoal", name: "Charcoal Clean", tier: "common", kind: "mat", color: "#23242b", pad: 6, radius: 1.4, tags: ["minimal","black"], materialLabel: "Charcoal", ratios: { all: true } },
  { id: "g-clear", name: "Clear Glass", tier: "common", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.28, frost: 0.12, sheen: 0.35, tags: ["glass"], materialLabel: "Clear glass", ratios: { all: true } },
  { id: "corners", name: "Corner Marks", tier: "common", kind: "mat", color: "#ffffff", pad: 0, radius: 1.6, brackets: true, tags: ["minimal"], materialLabel: "Corner marks", ratios: { all: true } },
  { id: "watercolor", name: "Watercolor Soft", tier: "common", kind: "mat", texture: "watercolor", pad: 5.6, radius: 1.2, tags: ["paper","soft"], materialLabel: "Watercolor", ratios: { all: true } },
  { id: "c-ivory", name: "Ivory Gallery", tier: "common", kind: "mat", color: "#f7f1e4", pad: 5, radius: 2, tags: ["gallery"], materialLabel: "Ivory", ratios: { all: true } },
  { id: "concrete", name: "Concrete", tier: "common", kind: "mat", texture: "concrete", pad: 5.6, radius: 1.2, tags: ["stone"], materialLabel: "Concrete", ratios: { all: true } },
  { id: "linen", name: "Linen Texture", tier: "aiplus", kind: "mat", texture: "linen", pad: 5.6, radius: 1.2, tags: ["fabric","linen"], materialLabel: "Linen", ratios: { all: true } },
  { id: "oak", name: "Oak Warm Grain", tier: "aiplus", kind: "mat", texture: "oak", pad: 5.6, radius: 1.2, tags: ["wood","oak"], materialLabel: "Oak wood", ratios: { all: true } },
  { id: "filmgrain", name: "Film Grain Mat", tier: "aiplus", kind: "mat", texture: "filmgrain", pad: 5.6, radius: 1.2, tags: ["film"], materialLabel: "Film grain", ratios: { all: true } },
  { id: "film", name: "Film Strip Reel", tier: "aiplus", kind: "specialty", color: "#14161e", pad: 8.6, radius: 3, perf: true, filmreel: true, tags: ["film","reel"], materialLabel: "Film strip", ratios: { min: 1.15 } },
  { id: "filmreel2", name: "Silver Film Reel", tier: "aiplus", kind: "specialty", color: "#c0c0c0", pad: 10, radius: 2, filmreel: true, tags: ["film","reel"], materialLabel: "Silver reel", ratios: { min: 1.15 } },
  { id: "videoReel", name: "Video Reel Sharp", tier: "aiplus", kind: "specialty", color: "#111", pad: 9, radius: 2, filmreel: true, tags: ["film","video"], materialLabel: "Video reel", ratios: { min: 1.2 } },
  { id: "camera2", name: "Vintage Camera Kraft", tier: "aiplus", kind: "specialty", color: "#c4a574", pad: 12, radius: 8, camera: true, tags: ["camera","vintage"], materialLabel: "Camera kraft", ratios: { min: 0.9, max: 1.4 } },
  { id: "g-frost", name: "Frosted Edge Glass", tier: "aiplus", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.4, frost: 0.5, sheen: 0.3, tags: ["glass","frost"], materialLabel: "Frosted glass", ratios: { all: true } },
  { id: "g-aurora", name: "Aurora Glass", tier: "aiplus", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.3, frost: 0.25, sheen: 0.5, aurora: true, tags: ["glass"], materialLabel: "Aurora glass", ratios: { all: true } },
  { id: "driftwood", name: "Driftwood Texture", tier: "aiplus", kind: "mat", texture: "driftwood", pad: 5.6, radius: 1.2, tags: ["wood","antique"], materialLabel: "Driftwood", ratios: { all: true } },
  { id: "denimSt", name: "Denim Stitched", tier: "aiplus", kind: "mat", texture: "denim", pad: 6, radius: 3, stitched: true, tags: ["fabric","denim"], materialLabel: "Denim", ratios: { all: true } },
  { id: "rosegold", name: "Rosegold Sheen", tier: "aiplus", kind: "mat", texture: "rosegold", pad: 5.6, radius: 1.2, tags: ["metal","gold"], materialLabel: "Rose gold", ratios: { all: true } },
  { id: "antiqueWood", name: "Antique Distressed Wood", tier: "aiplus", kind: "mat", texture: "driftwood", pad: 7, radius: 2, tags: ["wood","antique"], materialLabel: "Antique wood", ratios: { all: true } },
  { id: "slideFilm", name: "Slide Film Mount", tier: "aiplus", kind: "specialty", color: "#e8e4d8", pad: 8, radius: 1, brackets: true, tags: ["film","slide"], materialLabel: "Slide mount", ratios: { all: true } },
  { id: "contactSheet", name: "Contact Sheet Border", tier: "aiplus", kind: "specialty", color: "#1c1c1c", pad: 7, radius: 0, perf: true, tags: ["film","contact"], materialLabel: "Contact sheet", ratios: { all: true } },
  { id: "silver", name: "Brushed Silver", tier: "aiplus", kind: "mat", texture: "silver", pad: 5.6, radius: 1.2, tags: ["metal","silver"], materialLabel: "Brushed silver", ratios: { all: true } },
  { id: "goldfoil", name: "Gold Foil Royal", tier: "premium", kind: "mat", texture: "goldfoil", pad: 6, radius: 1.5, ornamental: true, tags: ["gold","luxury"], materialLabel: "Gold foil", ratios: { all: true } },
  { id: "museumGold", name: "Museum Gold Ornamental", tier: "premium", kind: "mat", texture: "museumGold", pad: 8, radius: 1.5, ornamental: true, tags: ["royal","gold","museum"], materialLabel: "Gilded wood", ratios: { all: true } },
  { id: "museumArt", name: "Museum Art Royal", tier: "premium", kind: "mat", texture: "museumGold", pad: 10, radius: 1, ornamental: true, tags: ["museum","gallery"], materialLabel: "Museum gold", ratios: { all: true } },
  { id: "treasure1", name: "Treasure Gold Baroque", tier: "premium", kind: "specialty", color: "#c9a86a", pad: 8, radius: 4, treasure: true, ornamental: true, tags: ["royal","gold","baroque"], materialLabel: "Ornate gold", ratios: { all: true } },
  { id: "treasure2", name: "Treasure Chest Deep", tier: "premium", kind: "specialty", color: "#5c3d1e", pad: 9, radius: 3, treasure: true, ornamental: true, tags: ["royal","wood"], materialLabel: "Carved wood", ratios: { all: true } },
  { id: "leatherSt", name: "Leather Stitched Reality", tier: "premium", kind: "mat", texture: "leatherB", pad: 6, radius: 3, stitched: true, tags: ["leather"], materialLabel: "Leather", ratios: { all: true } },
  { id: "ebony", name: "Ebony Carved", tier: "premium", kind: "mat", texture: "ebony", pad: 5.6, radius: 1.2, ornamental: true, tags: ["wood","ebony"], materialLabel: "Ebony wood", ratios: { all: true } },
  { id: "marbleB", name: "Black Marble Texture", tier: "premium", kind: "mat", texture: "marbleB", pad: 5.6, radius: 1.2, tags: ["marble","stone"], materialLabel: "Black marble", ratios: { all: true } },
  { id: "marbleW", name: "White Marble Veins", tier: "premium", kind: "mat", texture: "marbleW", pad: 5.6, radius: 1.2, tags: ["marble","stone"], materialLabel: "White marble", ratios: { all: true } },
  { id: "camera1", name: "Instant Camera Classic", tier: "premium", kind: "specialty", color: "#e8e4dc", pad: 12, radius: 8, camera: true, tags: ["camera","instant"], materialLabel: "Camera body", ratios: { min: 0.9, max: 1.4 } },
  { id: "filmreel1", name: "Cinema Film Reel", tier: "premium", kind: "specialty", color: "#1a1a1a", pad: 10, radius: 2, filmreel: true, tags: ["film","cinema"], materialLabel: "Cinema reel", ratios: { min: 1.15 } },
  { id: "g-sheen", name: "Sheen Glass Premium", tier: "premium", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.28, frost: 0, sheen: 0.65, tags: ["glass"], materialLabel: "Sheen glass", ratios: { all: true } },
  { id: "ancientRelic", name: "Ancient Relic Stone", tier: "premium", kind: "mat", texture: "ancientStone", pad: 8, radius: 2, tags: ["stone","antique"], materialLabel: "Ancient stone", ratios: { all: true } },
  { id: "walnut-red", name: "Walnut Red Texture", tier: "premium", kind: "mat", texture: "walnut", color: "#6b2b1f", pad: 6.5, radius: 1.4, tags: ["wood","red"], materialLabel: "Red walnut", ratios: { all: true } },
  { id: "brass", name: "Brass Ornamental", tier: "premium", kind: "mat", texture: "brass", pad: 5.6, radius: 1.2, ornamental: true, tags: ["metal","brass"], materialLabel: "Brushed brass", ratios: { all: true } },
  { id: "velvet", name: "Velvet Royal", tier: "premium", kind: "mat", texture: "velvet", pad: 6, radius: 2, tags: ["fabric","luxury"], materialLabel: "Velvet", ratios: { all: true } },
  { id: "bamboo", name: "Bamboo Natural", tier: "premium", kind: "mat", texture: "bamboo", pad: 5.6, radius: 1.2, tags: ["wood","bamboo"], materialLabel: "Bamboo", ratios: { all: true } },
  { id: "royalWalnut", name: "Royal Walnut Carved", tier: "premium", kind: "specialty", texture: "walnut", pad: 11, radius: 2, ornamental: true, treasure: true, tags: ["royal","wood","carved"], materialLabel: "Carved walnut", ratios: { all: true } },
  { id: "royalGold", name: "Royal Gold Victorian", tier: "premium", kind: "specialty", texture: "museumGold", pad: 11, radius: 3, ornamental: true, treasure: true, tags: ["royal","gold"], materialLabel: "Victorian gold", ratios: { all: true } },
  { id: "royalRed", name: "Royal Red Lacquer", tier: "premium", kind: "specialty", texture: "walnut", color: "#6b1e18", pad: 10, radius: 2, ornamental: true, tags: ["royal","red","wood"], materialLabel: "Red lacquer", ratios: { all: true } },
  { id: "mahoganyCarve", name: "Mahogany Carved", tier: "premium", kind: "mat", texture: "walnut", color: "#4a2010", pad: 9, radius: 2, ornamental: true, tags: ["wood","mahogany"], materialLabel: "Mahogany", ratios: { all: true } },
  { id: "blackGold", name: "Black & Gold Luxury", tier: "premium", kind: "specialty", color: "#1a1a1a", pad: 10, radius: 2, ornamental: true, treasure: true, tags: ["luxury","gold"], materialLabel: "Black gold", ratios: { all: true } },
  { id: "shadowBox", name: "Deep Shadow Box", tier: "premium", kind: "mat", color: "#2a2a2a", pad: 14, radius: 1, keyline: 3, tags: ["gallery","shadow"], materialLabel: "Shadow box", ratios: { all: true } },
  { id: "redWood", name: "Red Wood Grain", tier: "premium", kind: "mat", texture: "walnut", color: "#7a2e1e", pad: 7, radius: 1.5, tags: ["wood","red"], materialLabel: "Red wood", ratios: { all: true } },
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
