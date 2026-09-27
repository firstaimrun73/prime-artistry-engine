/**
 * Authoritative Frame Studio catalog (~35 frames).
 * 8–10 common (free plan). Rest AI+ / Premium only.
 * Names encode quality: texture, sharpness, ornamental, reality.
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

/**
 * ~35 frames. Common = free plan. AI+ / Premium require paid plan (server-enforced).
 */
export const FRAMES: FrameDef[] = [
  // —— Common (free) ——
  { id: "paper", name: "Paper Soft", tier: "common", kind: "mat", texture: "paper", pad: 5.6, radius: 1.2, ratios: { all: true } },
  { id: "kraft", name: "Kraft Natural", tier: "common", kind: "mat", texture: "kraft", pad: 5.6, radius: 1.2, ratios: { all: true } },
  { id: "walnut", name: "Walnut Grain", tier: "common", kind: "mat", texture: "walnut", pad: 5.6, radius: 1.2, ratios: { all: true } },
  { id: "polaroid", name: "Instant Print", tier: "common", kind: "mat", color: "#FFFEFB", pad: 6, radius: 2, polaroid: true, ratios: { all: true } },
  { id: "galleryDouble", name: "Gallery Mat", tier: "common", kind: "mat", color: "#fafafa", pad: 8, radius: 0, keyline: 2, ratios: { all: true } },
  { id: "c-charcoal", name: "Charcoal Clean", tier: "common", kind: "mat", color: "#23242b", pad: 6, radius: 1.4, ratios: { all: true } },
  { id: "g-clear", name: "Clear Glass", tier: "common", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.28, frost: 0.12, sheen: 0.35, ratios: { all: true } },
  { id: "corners", name: "Corner Marks", tier: "common", kind: "mat", color: "#ffffff", pad: 0, radius: 1.6, brackets: true, ratios: { all: true } },
  { id: "watercolor", name: "Watercolor Soft", tier: "common", kind: "mat", texture: "watercolor", pad: 5.6, radius: 1.2, ratios: { all: true } },
  { id: "c-ivory", name: "Ivory Gallery", tier: "common", kind: "mat", color: "#f7f1e4", pad: 5, radius: 2, ratios: { all: true } },

  // —— AI+ ——
  { id: "linen", name: "Linen Texture", tier: "aiplus", kind: "mat", texture: "linen", pad: 5.6, radius: 1.2, ratios: { all: true } },
  { id: "oak", name: "Oak Warm Grain", tier: "aiplus", kind: "mat", texture: "oak", pad: 5.6, radius: 1.2, ratios: { all: true } },
  { id: "filmgrain", name: "Film Grain Mat", tier: "aiplus", kind: "mat", texture: "filmgrain", pad: 5.6, radius: 1.2, ratios: { all: true } },
  { id: "film", name: "Film Strip Reel", tier: "aiplus", kind: "specialty", color: "#14161e", pad: 8.6, radius: 3, perf: true, filmreel: true, ratios: { min: 1.15 } },
  { id: "filmreel2", name: "Silver Film Reel", tier: "aiplus", kind: "specialty", color: "#c0c0c0", pad: 10, radius: 2, filmreel: true, ratios: { min: 1.15 } },
  { id: "videoReel", name: "Video Reel Sharp", tier: "aiplus", kind: "specialty", color: "#111", pad: 9, radius: 2, filmreel: true, ratios: { min: 1.2 } },
  { id: "camera2", name: "Vintage Camera Kraft", tier: "aiplus", kind: "specialty", color: "#c4a574", pad: 12, radius: 8, camera: true, ratios: { min: 0.9, max: 1.4 } },
  { id: "g-frost", name: "Frosted Edge Glass", tier: "aiplus", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.4, frost: 0.5, sheen: 0.3, ratios: { all: true } },
  { id: "g-aurora", name: "Aurora Glass", tier: "aiplus", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.3, frost: 0.25, sheen: 0.5, aurora: true, ratios: { all: true } },
  { id: "driftwood", name: "Driftwood Texture", tier: "aiplus", kind: "mat", texture: "driftwood", pad: 5.6, radius: 1.2, ratios: { all: true } },
  { id: "denimSt", name: "Denim Stitched", tier: "aiplus", kind: "mat", texture: "denim", pad: 6, radius: 3, stitched: true, ratios: { all: true } },
  { id: "rosegold", name: "Rosegold Sheen", tier: "aiplus", kind: "mat", texture: "rosegold", pad: 5.6, radius: 1.2, ratios: { all: true } },

  // —— Premium (ornamental / physical texture) ——
  { id: "museumGold", name: "Museum Gold Ornamental", tier: "premium", kind: "mat", texture: "museumGold", pad: 8, radius: 1.5, ratios: { all: true } },
  { id: "museumArt", name: "Museum Art Royal", tier: "premium", kind: "mat", texture: "museumGold", pad: 10, radius: 1, ratios: { all: true } },
  { id: "treasure1", name: "Treasure Gold Baroque", tier: "premium", kind: "specialty", color: "#c9a86a", pad: 8, radius: 4, treasure: true, ratios: { all: true } },
  { id: "treasure2", name: "Treasure Chest Deep", tier: "premium", kind: "specialty", color: "#5c3d1e", pad: 9, radius: 3, treasure: true, ratios: { all: true } },
  { id: "leatherSt", name: "Leather Stitched Reality", tier: "premium", kind: "mat", texture: "leatherB", pad: 6, radius: 3, stitched: true, ratios: { all: true } },
  { id: "ebony", name: "Ebony Sharp", tier: "premium", kind: "mat", texture: "ebony", pad: 5.6, radius: 1.2, ratios: { all: true } },
  { id: "marbleB", name: "Black Marble Texture", tier: "premium", kind: "mat", texture: "marbleB", pad: 5.6, radius: 1.2, ratios: { all: true } },
  { id: "marbleW", name: "White Marble Veins", tier: "premium", kind: "mat", texture: "marbleW", pad: 5.6, radius: 1.2, ratios: { all: true } },
  { id: "camera1", name: "Instant Camera Classic", tier: "premium", kind: "specialty", color: "#e8e4dc", pad: 12, radius: 8, camera: true, ratios: { min: 0.9, max: 1.4 } },
  { id: "filmreel1", name: "Cinema Film Reel", tier: "premium", kind: "specialty", color: "#1a1a1a", pad: 10, radius: 2, filmreel: true, ratios: { min: 1.15 } },
  { id: "g-sheen", name: "Sheen Glass Premium", tier: "premium", kind: "glass", pad: 3.4, radius: 6.2, tint: 0.28, frost: 0, sheen: 0.65, ratios: { all: true } },
  { id: "ancientRelic", name: "Ancient Relic Stone", tier: "premium", kind: "mat", texture: "ancientStone", pad: 8, radius: 2, ratios: { all: true } },
  { id: "walnut-red", name: "Walnut Red Texture", tier: "premium", kind: "mat", texture: "walnut", color: "#6b2b1f", pad: 6.5, radius: 1.4, ratios: { all: true } },
  { id: "brass", name: "Brass Ornamental", tier: "premium", kind: "mat", texture: "brass", pad: 5.6, radius: 1.2, ratios: { all: true } },
  { id: "velvet", name: "Velvet Royal", tier: "premium", kind: "mat", texture: "velvet", pad: 6, radius: 2, ratios: { all: true } },
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
