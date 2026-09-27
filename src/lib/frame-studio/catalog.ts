/**
 * Authoritative Frame Studio catalog.
 * Premium = high visual detail (baroque, velvet scene, film, floral).
 * Former thin-border "premium" items demoted to AI+.
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
  /** Rococo / baroque carved gold geometry */
  baroque?: boolean;
  /** Scene/carousel background around the frame (Premium) */
  sceneBg?: "velvetHibiscus" | "lotusGarden" | "museumWall" | "filmDark" | "linenStudio";
  /** Vintage film strip with aged paper look */
  filmVintage?: boolean;
  /** Floral polaroid-style outer decorations */
  floralPolaroid?: boolean;
  tags?: string[];
  materialLabel?: string;
};

export const FRAME_CREDIT_COST: Record<FrameTier, number> = {
  common: 5,
  aiplus: 15,
  premium: 25,
};

/** Main rail — mix of tiers; Premium slots showcase buy-worthy designs. */
export const CURATED_FRAME_IDS: string[] = [
  "paper", "kraft", "walnut", "polaroid", "galleryDouble", "c-charcoal",
  "g-clear", "watercolor", "corners", "c-ivory",
  "linen", "oak", "film", "g-frost", "rosegold", "silver", "driftwood",
  "museumGold", "leatherSt", "marbleW", "brass",
  "baroqueGold", "galleryGoldBead", "velvetHibiscus", "lotusPolaroid",
  "filmVintage", "baroquePortrait", "velvetRoyalDeep", "rococoGold",
  "museumShadow", "mahoganyLuxury", "blackGoldInlay", "cinemaStrip",
  "instantLuxury", "emeraldVelvet", "palaceGold",
];

export const FRAMES: FrameDef[] = [
  // ─── Common ───
  { id: "paper", name: "Paper Soft", tier: "common", kind: "mat", texture: "paper", pad: 5.6, radius: 1.2, tags: ["paper"], materialLabel: "Paper", ratios: { all: true } },
  { id: "kraft", name: "Kraft Natural", tier: "common", kind: "mat", texture: "kraft", pad: 5.6, radius: 1.2, tags: ["kraft"], materialLabel: "Kraft", ratios: { all: true } },
  { id: "walnut", name: "Walnut Grain", tier: "common", kind: "mat", texture: "walnut", pad: 5.6, radius: 1.2, tags: ["wood"], materialLabel: "Walnut", ratios: { all: true } },
  { id: "polaroid", name: "Instant Print", tier: "common", kind: "mat", color: "#FFFEFB", pad: 6, radius: 2, polaroid: true, tags: ["instant"], materialLabel: "Instant paper", ratios: { all: true } },
  { id: "galleryDouble", name: "Gallery Mat", tier: "common", kind: "mat", color: "#fafafa", pad: 8, radius: 0, keyline: 2, tags: ["gallery"], materialLabel: "Gallery mat", ratios: { all: true } },
  { id: "c-charcoal", name: "Charcoal Clean", tier: "common", kind: "mat", color: "#23242b", pad: 6, radius: 1.4, tags: ["minimal"], materialLabel: "Charcoal", ratios: { all: true } },
  { id: "g-clear", name: "Clear Glass", tier: "common", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.28, frost: 0.12, sheen: 0.35, tags: ["glass"], materialLabel: "Clear glass", ratios: { all: true } },
  { id: "corners", name: "Corner Marks", tier: "common", kind: "mat", color: "#ffffff", pad: 0, radius: 1.6, brackets: true, tags: ["minimal"], materialLabel: "Corners", ratios: { all: true } },
  { id: "watercolor", name: "Watercolor Soft", tier: "common", kind: "mat", texture: "watercolor", pad: 5.6, radius: 1.2, tags: ["paper"], materialLabel: "Watercolor", ratios: { all: true } },
  { id: "c-ivory", name: "Ivory Gallery", tier: "common", kind: "mat", color: "#f7f1e4", pad: 5, radius: 2, tags: ["gallery"], materialLabel: "Ivory", ratios: { all: true } },
  { id: "concrete", name: "Concrete", tier: "common", kind: "mat", texture: "concrete", pad: 5.6, radius: 1.2, tags: ["stone"], materialLabel: "Concrete", ratios: { all: true } },

  // ─── AI+ (includes former thin Premium) ───
  { id: "linen", name: "Linen Texture", tier: "aiplus", kind: "mat", texture: "linen", pad: 5.6, radius: 1.2, tags: ["fabric"], materialLabel: "Linen", ratios: { all: true } },
  { id: "oak", name: "Oak Warm Grain", tier: "aiplus", kind: "mat", texture: "oak", pad: 5.6, radius: 1.2, tags: ["wood"], materialLabel: "Oak", ratios: { all: true } },
  { id: "filmgrain", name: "Film Grain Mat", tier: "aiplus", kind: "mat", texture: "filmgrain", pad: 5.6, radius: 1.2, tags: ["film"], materialLabel: "Film grain", ratios: { all: true } },
  { id: "film", name: "Film Strip Reel", tier: "aiplus", kind: "specialty", color: "#14161e", pad: 8.6, radius: 3, perf: true, filmreel: true, tags: ["film"], materialLabel: "Film strip", ratios: { min: 1.15 } },
  { id: "filmreel2", name: "Silver Film Reel", tier: "aiplus", kind: "specialty", color: "#c0c0c0", pad: 10, radius: 2, filmreel: true, tags: ["film"], materialLabel: "Silver reel", ratios: { min: 1.15 } },
  { id: "videoReel", name: "Video Reel Sharp", tier: "aiplus", kind: "specialty", color: "#111", pad: 9, radius: 2, filmreel: true, tags: ["film"], materialLabel: "Video reel", ratios: { min: 1.2 } },
  { id: "camera2", name: "Vintage Camera Kraft", tier: "aiplus", kind: "specialty", color: "#c4a574", pad: 12, radius: 8, camera: true, tags: ["camera"], materialLabel: "Camera kraft", ratios: { min: 0.9, max: 1.4 } },
  { id: "g-frost", name: "Frosted Edge Glass", tier: "aiplus", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.4, frost: 0.5, sheen: 0.3, tags: ["glass"], materialLabel: "Frosted glass", ratios: { all: true } },
  { id: "g-aurora", name: "Aurora Glass", tier: "aiplus", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.3, frost: 0.25, sheen: 0.5, aurora: true, tags: ["glass"], materialLabel: "Aurora glass", ratios: { all: true } },
  { id: "driftwood", name: "Driftwood Texture", tier: "aiplus", kind: "mat", texture: "driftwood", pad: 5.6, radius: 1.2, tags: ["wood"], materialLabel: "Driftwood", ratios: { all: true } },
  { id: "denimSt", name: "Denim Stitched", tier: "aiplus", kind: "mat", texture: "denim", pad: 6, radius: 3, stitched: true, tags: ["fabric"], materialLabel: "Denim", ratios: { all: true } },
  { id: "rosegold", name: "Rosegold Sheen", tier: "aiplus", kind: "mat", texture: "rosegold", pad: 5.6, radius: 1.2, tags: ["metal"], materialLabel: "Rose gold", ratios: { all: true } },
  { id: "antiqueWood", name: "Antique Distressed Wood", tier: "aiplus", kind: "mat", texture: "driftwood", pad: 7, radius: 2, tags: ["wood"], materialLabel: "Antique wood", ratios: { all: true } },
  { id: "slideFilm", name: "Slide Film Mount", tier: "aiplus", kind: "specialty", color: "#e8e4d8", pad: 8, radius: 1, brackets: true, tags: ["film"], materialLabel: "Slide mount", ratios: { all: true } },
  { id: "contactSheet", name: "Contact Sheet Border", tier: "aiplus", kind: "specialty", color: "#1c1c1c", pad: 7, radius: 0, perf: true, tags: ["film"], materialLabel: "Contact sheet", ratios: { all: true } },
  { id: "silver", name: "Brushed Silver", tier: "aiplus", kind: "mat", texture: "silver", pad: 5.6, radius: 1.2, tags: ["metal"], materialLabel: "Silver", ratios: { all: true } },
  { id: "goldfoil", name: "Gold Foil Mat", tier: "aiplus", kind: "mat", texture: "goldfoil", pad: 6, radius: 1.5, tags: ["gold"], materialLabel: "Gold foil", ratios: { all: true } },
  { id: "museumGold", name: "Museum Gold Mat", tier: "aiplus", kind: "mat", texture: "museumGold", pad: 8, radius: 1.5, tags: ["gold"], materialLabel: "Gilded mat", ratios: { all: true } },
  { id: "museumArt", name: "Museum Art Mat", tier: "aiplus", kind: "mat", texture: "museumGold", pad: 10, radius: 1, tags: ["museum"], materialLabel: "Museum mat", ratios: { all: true } },
  { id: "treasure1", name: "Treasure Gold Edge", tier: "aiplus", kind: "specialty", color: "#c9a86a", pad: 8, radius: 4, treasure: true, tags: ["gold"], materialLabel: "Gold edge", ratios: { all: true } },
  { id: "treasure2", name: "Treasure Chest Mat", tier: "aiplus", kind: "specialty", color: "#5c3d1e", pad: 9, radius: 3, treasure: true, tags: ["wood"], materialLabel: "Chest mat", ratios: { all: true } },
  { id: "leatherSt", name: "Leather Stitched", tier: "aiplus", kind: "mat", texture: "leatherB", pad: 6, radius: 3, stitched: true, tags: ["leather"], materialLabel: "Leather", ratios: { all: true } },
  { id: "ebony", name: "Ebony Mat", tier: "aiplus", kind: "mat", texture: "ebony", pad: 5.6, radius: 1.2, tags: ["wood"], materialLabel: "Ebony", ratios: { all: true } },
  { id: "marbleB", name: "Black Marble", tier: "aiplus", kind: "mat", texture: "marbleB", pad: 5.6, radius: 1.2, tags: ["marble"], materialLabel: "Black marble", ratios: { all: true } },
  { id: "marbleW", name: "White Marble", tier: "aiplus", kind: "mat", texture: "marbleW", pad: 5.6, radius: 1.2, tags: ["marble"], materialLabel: "White marble", ratios: { all: true } },
  { id: "camera1", name: "Instant Camera", tier: "aiplus", kind: "specialty", color: "#e8e4dc", pad: 12, radius: 8, camera: true, tags: ["camera"], materialLabel: "Camera", ratios: { min: 0.9, max: 1.4 } },
  { id: "filmreel1", name: "Cinema Film Reel", tier: "aiplus", kind: "specialty", color: "#1a1a1a", pad: 10, radius: 2, filmreel: true, tags: ["film"], materialLabel: "Cinema reel", ratios: { min: 1.15 } },
  { id: "g-sheen", name: "Sheen Glass", tier: "aiplus", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.28, frost: 0, sheen: 0.65, tags: ["glass"], materialLabel: "Sheen glass", ratios: { all: true } },
  { id: "ancientRelic", name: "Ancient Stone Mat", tier: "aiplus", kind: "mat", texture: "ancientStone", pad: 8, radius: 2, tags: ["stone"], materialLabel: "Stone", ratios: { all: true } },
  { id: "walnut-red", name: "Walnut Red Mat", tier: "aiplus", kind: "mat", texture: "walnut", color: "#6b2b1f", pad: 6.5, radius: 1.4, tags: ["wood"], materialLabel: "Red walnut", ratios: { all: true } },
  { id: "brass", name: "Brass Mat", tier: "aiplus", kind: "mat", texture: "brass", pad: 5.6, radius: 1.2, tags: ["metal"], materialLabel: "Brass", ratios: { all: true } },
  { id: "velvet", name: "Velvet Mat", tier: "aiplus", kind: "mat", texture: "velvet", pad: 6, radius: 2, tags: ["fabric"], materialLabel: "Velvet mat", ratios: { all: true } },
  { id: "bamboo", name: "Bamboo Mat", tier: "aiplus", kind: "mat", texture: "bamboo", pad: 5.6, radius: 1.2, tags: ["wood"], materialLabel: "Bamboo", ratios: { all: true } },
  { id: "royalWalnut", name: "Walnut Carved Mat", tier: "aiplus", kind: "specialty", texture: "walnut", pad: 11, radius: 2, ornamental: true, treasure: true, tags: ["wood"], materialLabel: "Walnut", ratios: { all: true } },
  { id: "royalGold", name: "Gold Victorian Mat", tier: "aiplus", kind: "specialty", texture: "museumGold", pad: 11, radius: 3, ornamental: true, treasure: true, tags: ["gold"], materialLabel: "Gold mat", ratios: { all: true } },
  { id: "royalRed", name: "Red Lacquer Mat", tier: "aiplus", kind: "specialty", texture: "walnut", color: "#6b1e18", pad: 10, radius: 2, ornamental: true, tags: ["wood"], materialLabel: "Red lacquer", ratios: { all: true } },
  { id: "mahoganyCarve", name: "Mahogany Mat", tier: "aiplus", kind: "mat", texture: "walnut", color: "#4a2010", pad: 9, radius: 2, ornamental: true, tags: ["wood"], materialLabel: "Mahogany", ratios: { all: true } },
  { id: "blackGold", name: "Black Gold Mat", tier: "aiplus", kind: "specialty", color: "#1a1a1a", pad: 10, radius: 2, ornamental: true, treasure: true, tags: ["luxury"], materialLabel: "Black gold", ratios: { all: true } },
  { id: "shadowBox", name: "Shadow Box Mat", tier: "aiplus", kind: "mat", color: "#2a2a2a", pad: 14, radius: 1, keyline: 3, tags: ["gallery"], materialLabel: "Shadow box", ratios: { all: true } },
  { id: "redWood", name: "Red Wood Mat", tier: "aiplus", kind: "mat", texture: "walnut", color: "#7a2e1e", pad: 7, radius: 1.5, tags: ["wood"], materialLabel: "Red wood", ratios: { all: true } },

  // ─── PREMIUM — reference-inspired ───
  { id: "baroqueGold", name: "Baroque Ornate Gold", tier: "premium", kind: "specialty", texture: "museumGold", pad: 14, radius: 2, baroque: true, ornamental: true, sceneBg: "museumWall", tags: ["royal","gold","baroque","ornate"], materialLabel: "Carved gold leaf", ratios: { all: true } },
  { id: "baroquePortrait", name: "Rococo Portrait Gold", tier: "premium", kind: "specialty", texture: "museumGold", pad: 16, radius: 3, baroque: true, ornamental: true, sceneBg: "museumWall", tags: ["royal","gold","rococo"], materialLabel: "Rococo gold", ratios: { all: true } },
  { id: "rococoGold", name: "Palace Rococo Gold", tier: "premium", kind: "specialty", texture: "goldfoil", pad: 15, radius: 2.5, baroque: true, ornamental: true, tags: ["palace","gold"], materialLabel: "Palace gold", ratios: { all: true } },
  { id: "galleryGoldBead", name: "Gallery Gold Beaded", tier: "premium", kind: "specialty", texture: "museumGold", pad: 12, radius: 1, ornamental: true, keyline: 2, tags: ["gallery","gold","museum"], materialLabel: "Beaded gold moulding", ratios: { all: true } },
  { id: "palaceGold", name: "Palace Gold Moulding", tier: "premium", kind: "specialty", texture: "brass", pad: 13, radius: 1.5, baroque: true, ornamental: true, tags: ["palace","gold"], materialLabel: "Palace moulding", ratios: { all: true } },
  { id: "velvetHibiscus", name: "Velvet Hibiscus Scene", tier: "premium", kind: "specialty", color: "#4a0e18", texture: "velvet", pad: 10, radius: 1.5, sceneBg: "velvetHibiscus", keyline: 1, tags: ["velvet","floral","luxury","scene"], materialLabel: "Burgundy velvet + gold", ratios: { all: true } },
  { id: "velvetRoyalDeep", name: "Deep Burgundy Velvet", tier: "premium", kind: "specialty", color: "#3d0a12", texture: "velvet", pad: 11, radius: 1.2, sceneBg: "velvetHibiscus", keyline: 1, tags: ["velvet","luxury"], materialLabel: "Deep velvet", ratios: { all: true } },
  { id: "emeraldVelvet", name: "Emerald Velvet Luxe", tier: "premium", kind: "specialty", color: "#0c3d2e", texture: "velvet", pad: 10, radius: 1.5, sceneBg: "linenStudio", keyline: 1, tags: ["velvet","emerald"], materialLabel: "Emerald velvet", ratios: { all: true } },
  { id: "lotusPolaroid", name: "Lotus Garden Polaroid", tier: "premium", kind: "specialty", color: "#f5f0e6", pad: 8, radius: 3, polaroid: true, floralPolaroid: true, sceneBg: "lotusGarden", tags: ["floral","polaroid","lotus","scene"], materialLabel: "Floral polaroid", ratios: { all: true } },
  { id: "filmVintage", name: "Vintage Film Strip", tier: "premium", kind: "specialty", color: "#1a1814", pad: 11, radius: 0, filmVintage: true, perf: true, filmreel: true, sceneBg: "filmDark", tags: ["film","vintage","cinema"], materialLabel: "Aged film strip", ratios: { all: true } },
  { id: "cinemaStrip", name: "Cinema Aged Strip", tier: "premium", kind: "specialty", color: "#12100e", pad: 12, radius: 0, filmVintage: true, perf: true, filmreel: true, sceneBg: "filmDark", tags: ["film","cinema"], materialLabel: "Cinema strip", ratios: { all: true } },
  { id: "museumShadow", name: "Museum Shadow Box", tier: "premium", kind: "mat", color: "#1c1c1e", pad: 16, radius: 0, keyline: 4, sceneBg: "museumWall", tags: ["museum","gallery","shadow"], materialLabel: "Deep museum box", ratios: { all: true } },
  { id: "mahoganyLuxury", name: "Mahogany Carved Luxury", tier: "premium", kind: "specialty", texture: "walnut", color: "#3d1a0c", pad: 13, radius: 2, ornamental: true, baroque: true, tags: ["wood","mahogany","carved"], materialLabel: "Carved mahogany", ratios: { all: true } },
  { id: "blackGoldInlay", name: "Black Gold Inlay", tier: "premium", kind: "specialty", color: "#0e0e10", pad: 12, radius: 1.5, ornamental: true, treasure: true, tags: ["luxury","black","gold"], materialLabel: "Black with gold inlay", ratios: { all: true } },
  { id: "instantLuxury", name: "Luxury Instant Card", tier: "premium", kind: "specialty", color: "#faf6f0", pad: 9, radius: 4, polaroid: true, sceneBg: "linenStudio", tags: ["instant","luxury"], materialLabel: "Luxury instant", ratios: { all: true } },
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
