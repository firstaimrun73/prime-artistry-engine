/**
 * Authoritative Frame Studio catalog.
 * Premium sceneBg only on selected showcase frames — not every Premium.
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
  baroque?: boolean;
  sceneBg?: "velvetHibiscus" | "lotusGarden" | "museumWall" | "filmDark" | "linenStudio";
  filmVintage?: boolean;
  floralPolaroid?: boolean;
  tags?: string[];
  materialLabel?: string;
};

export const FRAME_CREDIT_COST: Record<FrameTier, number> = {
  common: 5,
  aiplus: 15,
  premium: 25,
};

export const CURATED_FRAME_IDS: string[] = [
  "paper", "kraft", "walnut", "polaroid", "galleryDouble", "c-charcoal",
  "g-clear", "watercolor", "corners", "c-ivory",
  "linen", "oak", "film", "g-frost", "rosegold", "silver", "driftwood",
  "museumGold", "leatherSt", "marbleW", "brass",
  "baroqueGold", "galleryGoldBead", "velvetHibiscus", "lotusPolaroid",
  "filmVintage", "baroquePortrait", "rococoGold",
  "museumShadow", "mahoganyLuxury", "blackGoldInlay",
  "instantLuxury", "palaceGold", "polaroid70s",
];

export const FRAMES: FrameDef[] = [
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
  { id: "sketchSoft", name: "Soft Sketch Border", tier: "common", kind: "mat", texture: "sketchGray", pad: 4, radius: 0, brackets: true, tags: ["sketch","outline"], materialLabel: "Sketch", ratios: { all: true } },
  { id: "cutiePink", name: "Cutie Pastel Pink", tier: "common", kind: "mat", texture: "pastelPink", pad: 6, radius: 4, tags: ["cutie","sticker","pastel"], materialLabel: "Pastel pink", ratios: { all: true } },

  { id: "linen", name: "Linen Texture", tier: "aiplus", kind: "mat", texture: "linen", pad: 5.6, radius: 1.2, tags: ["fabric"], materialLabel: "Linen", ratios: { all: true } },
  { id: "oak", name: "Oak Warm Grain", tier: "aiplus", kind: "mat", texture: "oak", pad: 5.6, radius: 1.2, tags: ["wood"], materialLabel: "Oak", ratios: { all: true } },
  { id: "film", name: "Film Strip Reel", tier: "aiplus", kind: "specialty", color: "#14161e", pad: 8.6, radius: 3, perf: true, filmreel: true, tags: ["film"], materialLabel: "Film strip", ratios: { min: 1.15 } },
  { id: "g-frost", name: "Frosted Edge Glass", tier: "aiplus", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.4, frost: 0.5, sheen: 0.3, tags: ["glass"], materialLabel: "Frosted glass", ratios: { all: true } },
  { id: "g-aurora", name: "Aurora Glass", tier: "aiplus", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.3, frost: 0.25, sheen: 0.5, aurora: true, tags: ["glass"], materialLabel: "Aurora glass", ratios: { all: true } },
  { id: "driftwood", name: "Driftwood Texture", tier: "aiplus", kind: "mat", texture: "driftwood", pad: 5.6, radius: 1.2, tags: ["wood"], materialLabel: "Driftwood", ratios: { all: true } },
  { id: "rosegold", name: "Rosegold Sheen", tier: "aiplus", kind: "mat", texture: "rosegold", pad: 5.6, radius: 1.2, tags: ["metal"], materialLabel: "Rose gold", ratios: { all: true } },
  { id: "silver", name: "Brushed Silver", tier: "aiplus", kind: "mat", texture: "silver", pad: 5.6, radius: 1.2, tags: ["metal"], materialLabel: "Silver", ratios: { all: true } },
  { id: "museumGold", name: "Museum Gold Mat", tier: "aiplus", kind: "mat", texture: "museumGold", pad: 8, radius: 1.5, tags: ["gold"], materialLabel: "Gilded mat", ratios: { all: true } },
  { id: "leatherSt", name: "Leather Stitched", tier: "aiplus", kind: "mat", texture: "leatherB", pad: 6, radius: 3, stitched: true, tags: ["leather"], materialLabel: "Leather", ratios: { all: true } },
  { id: "marbleW", name: "White Marble", tier: "aiplus", kind: "mat", texture: "marbleW", pad: 5.6, radius: 1.2, tags: ["marble"], materialLabel: "White marble", ratios: { all: true } },
  { id: "marbleB", name: "Black Marble", tier: "aiplus", kind: "mat", texture: "marbleB", pad: 5.6, radius: 1.2, tags: ["marble"], materialLabel: "Black marble", ratios: { all: true } },
  { id: "brass", name: "Brass Mat", tier: "aiplus", kind: "mat", texture: "brass", pad: 5.6, radius: 1.2, tags: ["metal"], materialLabel: "Brass", ratios: { all: true } },
  { id: "velvet", name: "Velvet Mat", tier: "aiplus", kind: "mat", texture: "velvet", pad: 6, radius: 2, tags: ["fabric"], materialLabel: "Velvet mat", ratios: { all: true } },
  { id: "ebony", name: "Ebony Mat", tier: "aiplus", kind: "mat", texture: "ebony", pad: 5.6, radius: 1.2, tags: ["wood"], materialLabel: "Ebony", ratios: { all: true } },
  { id: "goldfoil", name: "Gold Foil Mat", tier: "aiplus", kind: "mat", texture: "goldfoil", pad: 6, radius: 1.5, tags: ["gold"], materialLabel: "Gold foil", ratios: { all: true } },
  { id: "camera1", name: "Instant Camera", tier: "aiplus", kind: "specialty", color: "#e8e4dc", pad: 12, radius: 8, camera: true, tags: ["camera"], materialLabel: "Camera", ratios: { min: 0.9, max: 1.4 } },
  { id: "filmreel1", name: "Cinema Film Reel", tier: "aiplus", kind: "specialty", color: "#1a1a1a", pad: 10, radius: 2, filmreel: true, tags: ["film"], materialLabel: "Cinema reel", ratios: { min: 1.15 } },
  { id: "g-sheen", name: "Sheen Glass", tier: "aiplus", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.28, frost: 0, sheen: 0.65, tags: ["glass"], materialLabel: "Sheen glass", ratios: { all: true } },
  { id: "fairyGlow", name: "Fairy Tale Glow", tier: "aiplus", kind: "mat", texture: "holo", pad: 7, radius: 6, tags: ["fairy","cartoon","magic"], materialLabel: "Fairy glow", ratios: { all: true } },
  { id: "cartoonOutline", name: "Cartoon Outline", tier: "aiplus", kind: "mat", texture: "cartoonYellow", pad: 5, radius: 8, tags: ["cartoon","outline"], materialLabel: "Cartoon", ratios: { all: true } },
  { id: "cutieSky", name: "Cutie Sky Sticker", tier: "aiplus", kind: "mat", texture: "pastelSky", pad: 6, radius: 5, tags: ["cutie","sticker"], materialLabel: "Pastel sky", ratios: { all: true } },
  { id: "cutieMint", name: "Cutie Mint Sticker", tier: "aiplus", kind: "mat", texture: "pastelMint", pad: 6, radius: 5, tags: ["cutie","sticker"], materialLabel: "Pastel mint", ratios: { all: true } },
  { id: "sketchInk", name: "Ink Sketch Frame", tier: "aiplus", kind: "mat", texture: "sketchGray", pad: 4, radius: 0, brackets: true, tags: ["sketch","outline"], materialLabel: "Ink sketch", ratios: { all: true } },
  { id: "gullyNeon", name: "Gully Neon Edge", tier: "aiplus", kind: "mat", color: "#1a1a2e", pad: 5, radius: 2, tags: ["gully","neon","street"], materialLabel: "Neon edge", ratios: { all: true } },

  // Premium — sceneBg only on a few showcase pieces
  { id: "baroqueGold", name: "Baroque Ornate Gold", tier: "premium", kind: "specialty", texture: "museumGold", pad: 14, radius: 2, baroque: true, ornamental: true, tags: ["royal","gold","baroque"], materialLabel: "Carved gold leaf", ratios: { all: true } },
  { id: "baroquePortrait", name: "Rococo Portrait Gold", tier: "premium", kind: "specialty", texture: "museumGold", pad: 16, radius: 3, baroque: true, ornamental: true, tags: ["royal","gold","rococo"], materialLabel: "Rococo gold", ratios: { all: true } },
  { id: "rococoGold", name: "Palace Rococo Gold", tier: "premium", kind: "specialty", texture: "goldfoil", pad: 15, radius: 2.5, baroque: true, ornamental: true, tags: ["palace","gold"], materialLabel: "Palace gold", ratios: { all: true } },
  { id: "galleryGoldBead", name: "Gallery Gold Beaded", tier: "premium", kind: "specialty", texture: "museumGold", pad: 12, radius: 1, ornamental: true, keyline: 2, tags: ["gallery","gold"], materialLabel: "Beaded gold", ratios: { all: true } },
  { id: "palaceGold", name: "Palace Gold Moulding", tier: "premium", kind: "specialty", texture: "brass", pad: 13, radius: 1.5, baroque: true, ornamental: true, tags: ["palace","gold"], materialLabel: "Palace moulding", ratios: { all: true } },
  { id: "velvetHibiscus", name: "Velvet Hibiscus Scene", tier: "premium", kind: "specialty", color: "#4a0e18", texture: "velvet", pad: 10, radius: 1.5, sceneBg: "velvetHibiscus", keyline: 1, tags: ["velvet","floral","scene"], materialLabel: "Burgundy velvet + scene", ratios: { all: true } },
  { id: "lotusPolaroid", name: "Lotus Garden Polaroid", tier: "premium", kind: "specialty", color: "#f5f0e6", pad: 8, radius: 3, polaroid: true, floralPolaroid: true, sceneBg: "lotusGarden", tags: ["floral","polaroid","scene"], materialLabel: "Floral polaroid", ratios: { all: true } },
  { id: "filmVintage", name: "Vintage Film Strip", tier: "premium", kind: "specialty", color: "#1a1814", pad: 11, radius: 0, filmVintage: true, perf: true, filmreel: true, tags: ["film","vintage"], materialLabel: "Aged film strip", ratios: { all: true } },
  { id: "cinemaStrip", name: "Cinema Aged Strip", tier: "premium", kind: "specialty", color: "#12100e", pad: 12, radius: 0, filmVintage: true, perf: true, filmreel: true, tags: ["film","cinema"], materialLabel: "Cinema strip", ratios: { all: true } },
  { id: "museumShadow", name: "Museum Shadow Box", tier: "premium", kind: "mat", color: "#1c1c1e", pad: 16, radius: 0, keyline: 4, tags: ["museum","gallery"], materialLabel: "Deep museum box", ratios: { all: true } },
  { id: "mahoganyLuxury", name: "Mahogany Carved Luxury", tier: "premium", kind: "specialty", texture: "walnut", color: "#3d1a0c", pad: 13, radius: 2, ornamental: true, baroque: true, tags: ["wood","mahogany"], materialLabel: "Carved mahogany", ratios: { all: true } },
  { id: "blackGoldInlay", name: "Black Gold Inlay", tier: "premium", kind: "specialty", color: "#0e0e10", pad: 12, radius: 1.5, ornamental: true, treasure: true, tags: ["luxury","gold"], materialLabel: "Black gold inlay", ratios: { all: true } },
  { id: "instantLuxury", name: "Luxury Instant Card", tier: "premium", kind: "specialty", color: "#faf6f0", pad: 9, radius: 4, polaroid: true, tags: ["instant","luxury"], materialLabel: "Luxury instant", ratios: { all: true } },
  { id: "polaroid70s", name: "1970s Instant Print", tier: "premium", kind: "specialty", color: "#f5f0e8", pad: 10, radius: 3, polaroid: true, tags: ["instant","1970s","retro","camera"], materialLabel: "70s instant print", ratios: { all: true } },
  { id: "velvetDeep", name: "Deep Burgundy Velvet", tier: "premium", kind: "specialty", color: "#3d0a12", texture: "velvet", pad: 11, radius: 1.2, keyline: 1, tags: ["velvet","luxury"], materialLabel: "Deep velvet", ratios: { all: true } },
  { id: "emeraldVelvet", name: "Emerald Velvet Luxe", tier: "premium", kind: "specialty", color: "#0c3d2e", texture: "velvet", pad: 10, radius: 1.5, keyline: 1, tags: ["velvet","emerald"], materialLabel: "Emerald velvet", ratios: { all: true } },
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
