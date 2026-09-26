/** Frame catalog + canvas compose (no React). */
export type FrameId =
  | "minimal-line"
  | "polaroid-classic"
  | "ornate-premium"
  | "deep-matte"
  | "gallery-white"
  | "soft-round"
  | "film-strip"
  | "linen-cream"
  | "float-shadow"
  | "double-line"
  | "light-oak"
  | "dark-walnut"
  | "brass-inlay"
  | "modern-thin"
  | "bold-editorial"
  | "cream-gallery"
  | "vignette-fade"
  | "soft-edge-blur"
  | "tape-top"
  | "magazine-triple"
  | "rounded-black"
  | "polaroid-soft"
  | "gold-foil-inner"
  | "deckled-paper"
  | "studio-stack";

export type FrameTier = "common" | "aiplus" | "premium";
export const FRAME_CREDIT_COST: Record<FrameTier, number> = { common: 5, aiplus: 15, premium: 25 };

export type FrameDef = {
  id: FrameId;
  name: string;
  baseBorder: number;
  bottomExtra?: number;
  outer: string;
  mat: string;
  accent?: string;
  radius: number;
  tier: FrameTier;
  kind:
    | "solid"
    | "double"
    | "triple"
    | "film"
    | "wood"
    | "linen"
    | "float"
    | "vignette"
    | "blur"
    | "tape"
    | "deckled"
    | "stack"
    | "brass"
    | "ornate"
    | "polaroid";
};

export const FRAMES: FrameDef[] = [
  { id: "minimal-line", name: "Minimal Line", baseBorder: 2, outer: "#111111", mat: "#FFFFFF", radius: 0, tier: "common", kind: "solid" },
  { id: "polaroid-classic", name: "Polaroid", baseBorder: 18, bottomExtra: 0.12, outer: "#FFFEFB", mat: "#FFFEFB", radius: 2, tier: "common", kind: "polaroid" },
  { id: "ornate-premium", name: "Ornate Premium", baseBorder: 22, outer: "#1E1A16", mat: "#FFF8E7", accent: "#C9A86A", radius: 0, tier: "premium", kind: "ornate" },
  { id: "deep-matte", name: "Deep Matte", baseBorder: 28, outer: "#0F0F0F", mat: "#1A1A1A", accent: "#2A2A2A", radius: 0, tier: "common", kind: "solid" },
  { id: "gallery-white", name: "Gallery White", baseBorder: 24, outer: "#FFFFFF", mat: "#F7F7F7", accent: "#E5E5E5", radius: 0, tier: "common", kind: "solid" },
  { id: "soft-round", name: "Soft Round", baseBorder: 18, outer: "#F0EDE8", mat: "#FAF8F5", radius: 16, tier: "common", kind: "solid" },
  { id: "film-strip", name: "Film Strip", baseBorder: 28, outer: "#0A0A0A", mat: "#141414", accent: "#333333", radius: 0, tier: "aiplus", kind: "film" },
  { id: "linen-cream", name: "Linen Cream", baseBorder: 20, outer: "#F7F3EF", mat: "#FBF9F6", radius: 4, tier: "common", kind: "linen" },
  { id: "float-shadow", name: "Float Shadow", baseBorder: 0, outer: "transparent", mat: "transparent", radius: 4, tier: "aiplus", kind: "float" },
  { id: "double-line", name: "Double Line", baseBorder: 2, outer: "#111111", mat: "#FFFFFF", radius: 0, tier: "common", kind: "double" },
  { id: "light-oak", name: "Light Oak", baseBorder: 22, outer: "#D8CAB8", mat: "#F5EFE6", radius: 2, tier: "common", kind: "wood" },
  { id: "dark-walnut", name: "Dark Walnut", baseBorder: 22, outer: "#3D2B1F", mat: "#2A1E16", radius: 2, tier: "premium", kind: "wood" },
  { id: "brass-inlay", name: "Brass Inlay", baseBorder: 14, outer: "#1E1E1E", mat: "#FFFFFF", accent: "#C9A86A", radius: 0, tier: "premium", kind: "brass" },
  { id: "modern-thin", name: "Modern Thin", baseBorder: 1, outer: "#111111", mat: "#FFFFFF", accent: "#EEEEEE", radius: 0, tier: "common", kind: "solid" },
  { id: "bold-editorial", name: "Bold Editorial", baseBorder: 36, outer: "#000000", mat: "#0A0A0A", radius: 0, tier: "premium", kind: "solid" },
  { id: "cream-gallery", name: "Cream Gallery", baseBorder: 22, outer: "#FFF8E7", mat: "#FFFBF0", accent: "#E8D5B7", radius: 0, tier: "common", kind: "solid" },
  { id: "vignette-fade", name: "Vignette Fade", baseBorder: 0, outer: "transparent", mat: "transparent", radius: 0, tier: "aiplus", kind: "vignette" },
  { id: "soft-edge-blur", name: "Soft Edge", baseBorder: 0, outer: "transparent", mat: "transparent", radius: 0, tier: "aiplus", kind: "blur" },
  { id: "tape-top", name: "Tape Top", baseBorder: 20, outer: "#FFFFFF", mat: "#FAFAFA", accent: "#F5E6C8", radius: 2, tier: "common", kind: "tape" },
  { id: "magazine-triple", name: "Magazine Triple", baseBorder: 8, outer: "#000000", mat: "#FFFFFF", radius: 0, tier: "aiplus", kind: "triple" },
  { id: "rounded-black", name: "Rounded Black", baseBorder: 12, outer: "#111111", mat: "#1A1A1A", radius: 14, tier: "common", kind: "solid" },
  { id: "polaroid-soft", name: "Polaroid Soft", baseBorder: 16, bottomExtra: 0.1, outer: "#FFFEF7", mat: "#FFFEF7", radius: 3, tier: "common", kind: "polaroid" },
  { id: "gold-foil-inner", name: "Gold Foil", baseBorder: 20, outer: "#FFFFFF", mat: "#FFFEFB", accent: "#C9A86A", radius: 0, tier: "premium", kind: "ornate" },
  { id: "deckled-paper", name: "Deckled Paper", baseBorder: 18, outer: "#FFFEF9", mat: "#FFFEF9", radius: 0, tier: "aiplus", kind: "deckled" },
  { id: "studio-stack", name: "Studio Stack", baseBorder: 22, outer: "#1E1E1E", mat: "#FFFFFF", radius: 0, tier: "premium", kind: "stack" },
];

export type Controls = {
  borderWidth: number;
  padding: number;
  round: number;
  texture: number;
  shadowOn: boolean;
};

export const DEFAULT_CONTROLS: Controls = {
  borderWidth: 16,
  padding: 12,
  round: 0,
  texture: 35,
  shadowOn: true,
};

export function scaleBorder(base: number, slider: number): number {
  const t = (slider - 4) / (60 - 4);
  return Math.max(0, Math.round(base * (0.35 + t * 1.4)));
}

export function fillWood(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  dark: boolean,
) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 18; i++) {
    const gy = y + (h * i) / 18 + Math.sin(i * 1.7) * 2;
    ctx.strokeStyle = dark ? `rgba(0,0,0,${0.04 + (i % 3) * 0.02})` : `rgba(90,60,30,${0.05 + (i % 3) * 0.02})`;
    ctx.lineWidth = 1 + (i % 2);
    ctx.beginPath();
    ctx.moveTo(x, gy);
    for (let px = 0; px <= w; px += 8) {
      ctx.lineTo(x + px, gy + Math.sin(px * 0.04 + i) * 1.5);
    }
    ctx.stroke();
  }
}

export function fillLinen(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  intensity: number,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  const a = 0.02 + intensity * 0.0004;
  ctx.strokeStyle = `rgba(120,100,80,${a})`;
  ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 3) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i, y + h);
    ctx.stroke();
  }
  for (let j = 0; j < h; j += 3) {
    ctx.beginPath();
    ctx.moveTo(x, y + j);
    ctx.lineTo(x + w, y + j);
    ctx.stroke();
  }
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawWm(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  const fs = Math.max(12, Math.round(w * 0.022));
  const pad = Math.max(10, Math.round(w * 0.02));
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, w - Math.round(w * 0.28) - pad, h - fs * 2.4 - pad, Math.round(w * 0.28), fs * 2.4 + pad * 0.5, 8);
  ctx.fill();
  ctx.fillStyle = "#F5C542";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.font = `600 ${fs}px system-ui,sans-serif`;
  ctx.fillText("Frame", w - pad - 6, h - fs * 1.5 - pad);
  ctx.fillStyle = "#FFE08A";
  ctx.font = `500 ${Math.round(fs * 0.85)}px system-ui,sans-serif`;
  ctx.fillText("Motio2edit", w - pad - 6, h - pad);
  ctx.restore();
}
