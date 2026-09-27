/**
 * Frame Studio helpers + catalog re-exports.
 * Textures are procedural per material — not a single hue-shifted pattern.
 */
export {
  FRAMES,
  FRAME_BY_ID,
  FRAME_CREDIT_COST,
  CATALOG_COUNT,
  getFrameById,
  framesForAspect,
  type FrameDef,
  type FrameTier,
  type FrameKind,
  type RatioFilter,
} from "./catalog";

export type Controls = {
  borderWidth: number;
  padding: number;
  round: number;
  texture: number;
  shadowOn: boolean;
  /** When true: glass reflection overlay on the photo only (real framed-under-glass look). */
  glassPanel: boolean;
};

export const DEFAULT_CONTROLS: Controls = {
  borderWidth: 16,
  padding: 12,
  round: 0,
  texture: 35,
  shadowOn: true,
  glassPanel: false,
};

export function scaleBorder(base: number, slider: number): number {
  const t = (slider - 4) / (60 - 4);
  return Math.max(0, Math.round(base * (0.35 + t * 1.4)));
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
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

/** Deterministic noise 0..1 */
function n2(x: number, y: number, seed = 1): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.758) * 43758.5453;
  return s - Math.floor(s);
}

const BASE: Record<string, [string, string, string]> = {
  paper: ["#f7f3ef", "#ebe4dc", "#d9d0c6"],
  kraft: ["#c9a66b", "#b08a52", "#8f6d3c"],
  linen: ["#f4efe6", "#e8e0d4", "#d4cabb"],
  concrete: ["#a3a3a0", "#8a8a87", "#6e6e6b"],
  cork: ["#d2ad70", "#b89050", "#95743c"],
  denim: ["#3d628c", "#2f4d70", "#1f3550"],
  watercolor: ["#ead6ea", "#d0b8d8", "#b898c0"],
  filmgrain: ["#2c2c2a", "#1e1e1c", "#121210"],
  frostgrain: ["#eef3f8", "#d8e2ec", "#c0cedc"],
  walnut: ["#6a4524", "#4a2e16", "#2e1a0c"],
  oak: ["#d0b07a", "#b8945c", "#947240"],
  ebony: ["#1c1612", "#0f0c0a", "#080604"],
  leatherB: ["#523624", "#3a2416", "#24160c"],
  leatherT: ["#9a7420", "#7a5a18", "#5a4010"],
  silver: ["#d0d0d8", "#b0b0b8", "#909098"],
  rosegold: ["#ecc0ac", "#d09c88", "#b07c68"],
  goldfoil: ["#e0bc40", "#c49a28", "#a07a18"],
  marbleW: ["#f4f0ec", "#e4dcd4", "#d0c8c0"],
  marbleB: ["#2e2e34", "#1c1c22", "#101016"],
  carbon: ["#222226", "#121216", "#08080a"],
  holo: ["#e8d8f8", "#c8b8e8", "#a898d0"],
  brass: ["#d4b474", "#b89450", "#947438"],
  copper: ["#c88040", "#a86830", "#885020"],
  rust: ["#9a5020", "#7a3c14", "#5a2c10"],
  slate: ["#556070", "#3e4854", "#2a323c"],
  driftwood: ["#b0a090", "#8e7e6e", "#6e5e50"],
  bamboo: ["#dcc898", "#c0a878", "#a08858"],
  velvet: ["#582848", "#3c1830", "#240f1c"],
  galaxy: ["#201838", "#100c24", "#080614"],
  emerald: ["#0c5844", "#083c2e", "#04241c"],
  sapphire: ["#1e3278", "#122050", "#0a1430"],
  champagne: ["#f4ecd0", "#e0d4b0", "#c8bc98"],
  terracotta: ["#c87854", "#a85838", "#884028"],
  blush: ["#f4d8d8", "#e0bcbc", "#c8a0a0"],
  mint: ["#d8f4e8", "#b8dcc8", "#98c0b0"],
  bone: ["#f4ecdc", "#e0d8c8", "#c8c0b0"],
  ancientStone: ["#948870", "#746858", "#544838"],
  museumGold: ["#d4b474", "#a88850", "#7a6438"],
  vhsTape: ["#322848", "#1e1830", "#100c1c"],
};

function woodGrain(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  c0: string, c1: string, c2: string, intensity: number, seed: number,
) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, c0); g.addColorStop(0.5, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const lines = Math.max(8, Math.round(h / 6 + intensity * 0.4));
  for (let i = 0; i < lines; i++) {
    const yy = y + (i / lines) * h + (n2(i, seed) - 0.5) * 3;
    const amp = 2 + n2(i, seed + 2) * 6;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    for (let xx = 0; xx <= w; xx += 6) {
      const dy = Math.sin(xx * 0.04 + i * 0.7 + seed) * amp + (n2(xx, i + seed) - 0.5) * 2;
      ctx.lineTo(x + xx, yy + dy);
    }
    ctx.strokeStyle = `rgba(0,0,0,${0.06 + intensity * 0.0015})`;
    ctx.lineWidth = 1 + n2(i, seed + 1);
    ctx.stroke();
  }
}

function marbleVeins(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  c0: string, c1: string, c2: string, intensity: number, dark: boolean,
) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const veins = 5 + Math.round(intensity / 20);
  for (let i = 0; i < veins; i++) {
    ctx.beginPath();
    const sx = x + n2(i, 1) * w;
    const sy = y + n2(i, 2) * h;
    ctx.moveTo(sx, sy);
    for (let t = 0; t < 8; t++) {
      ctx.lineTo(
        sx + (n2(i, t + 3) - 0.4) * w * 0.5,
        sy + (n2(i, t + 9) - 0.3) * h * 0.5,
      );
    }
    ctx.strokeStyle = dark
      ? `rgba(220,220,230,${0.12 + intensity * 0.002})`
      : `rgba(80,70,60,${0.1 + intensity * 0.002})`;
    ctx.lineWidth = 1 + n2(i, 4) * 2.5;
    ctx.stroke();
  }
  ctx.fillStyle = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  for (let i = 0; i < 40; i++) {
    ctx.fillRect(x + n2(i, 11) * w, y + n2(i, 12) * h, 2, 2);
  }
}

function leatherGrain(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  c0: string, c1: string, c2: string, intensity: number,
) {
  const g = ctx.createRadialGradient(x + w * 0.3, y + h * 0.3, 0, x + w * 0.5, y + h * 0.5, Math.max(w, h));
  g.addColorStop(0, c0); g.addColorStop(0.6, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const step = Math.max(3, Math.round(6 - intensity * 0.03));
  for (let yy = 0; yy < h; yy += step) {
    for (let xx = 0; xx < w; xx += step) {
      const v = n2(xx, yy, 7);
      if (v > 0.55) {
        ctx.fillStyle = `rgba(0,0,0,${0.04 + v * 0.08})`;
        ctx.beginPath();
        ctx.ellipse(x + xx, y + yy, 1.2, 0.8, v * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function denimWeave(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  c0: string, c1: string, c2: string, intensity: number,
) {
  ctx.fillStyle = c1; ctx.fillRect(x, y, w, h);
  const step = 3;
  for (let yy = 0; yy < h; yy += step) {
    for (let xx = 0; xx < w; xx += step) {
      const on = ((xx / step) + (yy / step)) % 2 === 0;
      ctx.fillStyle = on ? c0 : c2;
      ctx.globalAlpha = 0.35 + intensity * 0.003;
      ctx.fillRect(x + xx, y + yy, step, step);
    }
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 8) {
    ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + 4, y + h); ctx.stroke();
  }
}

function metalPlate(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  c0: string, c1: string, c2: string, intensity: number,
) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, c0); g.addColorStop(0.35, c1); g.addColorStop(0.55, c0);
  g.addColorStop(0.75, c2); g.addColorStop(1, c1);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const sg = ctx.createLinearGradient(x, y, x, y + h * 0.35);
  sg.addColorStop(0, `rgba(255,255,255,${0.18 + intensity * 0.002})`);
  sg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sg; ctx.fillRect(x, y, w, h * 0.35);
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + n2(i, 3) * 0.04})`;
    ctx.fillRect(x + n2(i, 1) * w, y + n2(i, 2) * h, 1 + n2(i, 4) * 8, 1);
  }
}

function paperFiber(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  c0: string, c1: string, c2: string, intensity: number,
) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 120 + intensity; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.015 + n2(i, 5) * 0.03})`;
    ctx.fillRect(x + n2(i, 1) * w, y + n2(i, 2) * h, 1 + n2(i, 3) * 3, 1);
  }
  ctx.strokeStyle = `rgba(0,0,0,${0.04 + intensity * 0.0004})`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(x + n2(i, 6) * w, y);
    ctx.lineTo(x + n2(i, 7) * w, y + h);
    ctx.stroke();
  }
}

function carbonFiber(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  c0: string, c1: string, c2: string,
) {
  ctx.fillStyle = c1; ctx.fillRect(x, y, w, h);
  const step = 4;
  for (let yy = 0; yy < h; yy += step) {
    for (let xx = 0; xx < w; xx += step) {
      const diag = ((xx + yy) / step) % 4;
      ctx.fillStyle = diag < 2 ? c0 : c2;
      ctx.fillRect(x + xx, y + yy, step, step);
    }
  }
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "rgba(255,255,255,0.08)"); g.addColorStop(1, "rgba(0,0,0,0.15)");
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}

function galaxyField(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  c0: string, c1: string, c2: string,
) {
  const g = ctx.createRadialGradient(x + w * 0.5, y + h * 0.4, 0, x + w * 0.5, y + h * 0.5, Math.max(w, h));
  g.addColorStop(0, c0); g.addColorStop(0.5, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 80; i++) {
    const bright = n2(i, 9);
    ctx.fillStyle = `rgba(255,255,255,${0.15 + bright * 0.7})`;
    ctx.beginPath();
    ctx.arc(x + n2(i, 1) * w, y + n2(i, 2) * h, 0.4 + bright * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function holoSheen(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  c0: string, c1: string, c2: string,
) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "#ff9ad5"); g.addColorStop(0.25, c0);
  g.addColorStop(0.5, "#9ad5ff"); g.addColorStop(0.75, c1);
  g.addColorStop(1, "#d5ff9a");
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(x, y, w, h * 0.2);
}

function genericNoise(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  c0: string, c1: string, c2: string, intensity: number,
) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, c0); g.addColorStop(0.5, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 60 + intensity; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.02 + n2(i, 8) * 0.05})`;
    ctx.fillRect(x + n2(i, 1) * w, y + n2(i, 2) * h, 1 + n2(i, 3) * 4, 1 + n2(i, 4) * 3);
  }
}

export function fillTexture(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  textureId: string, intensity: number,
) {
  const cols = BASE[textureId] ?? ["#ccc", "#aaa", "#888"];
  const [c0, c1, c2] = cols;
  const id = textureId;

  if (id === "walnut" || id === "oak" || id === "ebony" || id === "driftwood" || id === "bamboo") {
    woodGrain(ctx, x, y, w, h, c0, c1, c2, intensity, id === "oak" ? 2 : id === "ebony" ? 3 : id === "bamboo" ? 4 : 1);
  } else if (id === "marbleW" || id === "marbleB" || id === "ancientStone") {
    marbleVeins(ctx, x, y, w, h, c0, c1, c2, intensity, id === "marbleB");
  } else if (id === "leatherB" || id === "leatherT") {
    leatherGrain(ctx, x, y, w, h, c0, c1, c2, intensity);
  } else if (id === "denim") {
    denimWeave(ctx, x, y, w, h, c0, c1, c2, intensity);
  } else if (id === "silver" || id === "rosegold" || id === "goldfoil" || id === "brass" || id === "copper" || id === "rust" || id === "museumGold") {
    metalPlate(ctx, x, y, w, h, c0, c1, c2, intensity);
  } else if (id === "paper" || id === "kraft" || id === "linen" || id === "bone") {
    paperFiber(ctx, x, y, w, h, c0, c1, c2, intensity);
  } else if (id === "carbon") {
    carbonFiber(ctx, x, y, w, h, c0, c1, c2);
  } else if (id === "galaxy") {
    galaxyField(ctx, x, y, w, h, c0, c1, c2);
  } else if (id === "holo") {
    holoSheen(ctx, x, y, w, h, c0, c1, c2);
  } else if (id === "concrete" || id === "cork" || id === "slate") {
    genericNoise(ctx, x, y, w, h, c0, c1, c2, intensity + 20);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.04 + n2(i, 15) * 0.08})`;
      ctx.beginPath();
      ctx.arc(x + n2(i, 1) * w, y + n2(i, 2) * h, 0.8 + n2(i, 3) * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === "velvet" || id === "emerald" || id === "sapphire") {
    const g = ctx.createRadialGradient(x + w * 0.4, y + h * 0.3, 0, x + w * 0.5, y + h * 0.5, Math.max(w, h));
    g.addColorStop(0, c0); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const sg = ctx.createLinearGradient(x, y, x + w * 0.4, y + h * 0.3);
    sg.addColorStop(0, "rgba(255,255,255,0.12)"); sg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sg; ctx.fillRect(x, y, w * 0.5, h * 0.4);
  } else {
    genericNoise(ctx, x, y, w, h, c0, c1, c2, intensity);
  }
}

/**
 * Watermark ON THE PHOTO area only (not on the outer frame).
 * Soft glass chip + emoji icon + Motio2edit.
 */
export function drawWm(
  ctx: CanvasRenderingContext2D,
  photoX: number,
  photoY: number,
  photoW: number,
  photoH: number,
) {
  ctx.save();
  const fs = Math.max(10, Math.round(Math.min(photoW, photoH) * 0.035));
  const pad = Math.max(8, Math.round(Math.min(photoW, photoH) * 0.03));
  const boxW = Math.min(photoW * 0.42, Math.max(90, fs * 9));
  const boxH = fs * 2.5;
  const bx = photoX + photoW - boxW - pad;
  const by = photoY + photoH - boxH - pad;

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  roundRect(ctx, bx, by, boxW, boxH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, boxW, boxH, 8);
  ctx.stroke();

  const sheen = ctx.createLinearGradient(bx, by, bx, by + boxH * 0.5);
  sheen.addColorStop(0, "rgba(255,255,255,0.2)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  roundRect(ctx, bx, by, boxW, boxH * 0.5, 8);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `600 ${fs}px system-ui, -apple-system, "Segoe UI Emoji", sans-serif`;
  ctx.fillText("🖼️  Frames", bx + boxW / 2, by + boxH * 0.36);
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = `500 ${Math.round(fs * 0.78)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText("Motio2edit", bx + boxW / 2, by + boxH * 0.72);
  ctx.restore();
}

/** Glass panel overlay — only on the photo rectangle. */
export function drawGlassPanel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
) {
  ctx.save();
  // subtle cool tint
  ctx.fillStyle = "rgba(220,230,245,0.12)";
  ctx.fillRect(x, y, w, h);
  // primary reflection streak
  const sg = ctx.createLinearGradient(x, y, x + w * 0.55, y + h * 0.4);
  sg.addColorStop(0, "rgba(255,255,255,0.38)");
  sg.addColorStop(0.45, "rgba(255,255,255,0.08)");
  sg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(x, y, w * 0.65, h * 0.45);
  // secondary edge catch
  const eg = ctx.createLinearGradient(x + w * 0.7, y, x + w, y + h * 0.25);
  eg.addColorStop(0, "rgba(255,255,255,0)");
  eg.addColorStop(1, "rgba(255,255,255,0.18)");
  ctx.fillStyle = eg;
  ctx.fillRect(x + w * 0.65, y, w * 0.35, h * 0.3);
  // thin edge highlight
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.restore();
}

export { composeFrame } from "./compose-frame";
