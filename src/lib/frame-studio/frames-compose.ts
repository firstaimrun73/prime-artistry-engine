/**
 * Frame Studio helpers + catalog re-exports.
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

const TEX_COLORS: Record<string, [string, string]> = {
  paper: ["#f7f3ef", "#e8e0d6"], kraft: ["#c4a574", "#a8885a"], linen: ["#f5f0e8", "#e0d8cc"],
  concrete: ["#9a9a98", "#7a7a78"], cork: ["#c9a66b", "#a8844a"], denim: ["#3b5f8a", "#2a4568"],
  watercolor: ["#e8d4e8", "#c8b0d8"], filmgrain: ["#2a2a28", "#1a1a18"], frostgrain: ["#e8eef5", "#d0dce8"],
  walnut: ["#5c3d1e", "#3d2814"], oak: ["#c4a574", "#a8885a"], ebony: ["#1a1410", "#0d0a08"],
  leatherB: ["#4a3020", "#2e1c12"], leatherT: ["#8b6914", "#6b5010"], silver: ["#c8c8d0", "#a8a8b0"],
  rosegold: ["#e8b4a0", "#c89480"], goldfoil: ["#d4af37", "#b8941f"], marbleW: ["#f0ece8", "#d8d0c8"],
  marbleB: ["#2a2a30", "#1a1a20"], carbon: ["#1c1c1e", "#0c0c0e"], holo: ["#e0d0f0", "#c0b0e0"],
  brass: ["#c9a86a", "#a8884a"], copper: ["#b87333", "#986028"], rust: ["#8b4513", "#6b3410"],
  slate: ["#4a5560", "#3a4550"], driftwood: ["#a09080", "#807060"], bamboo: ["#d4c090", "#b4a070"],
  velvet: ["#4a2040", "#301028"], galaxy: ["#1a1030", "#0a0820"], emerald: ["#0a4a3a", "#063028"],
  sapphire: ["#1a2a6a", "#0a1a4a"], champagne: ["#f0e6c8", "#d8c8a8"], terracotta: ["#c07050", "#a05030"],
  blush: ["#f0d0d0", "#d0b0b0"], mint: ["#d0f0e0", "#b0d0c0"], bone: ["#f0e8d8", "#d8d0c0"],
  ancientStone: ["#8a8070", "#6a6050"], museumGold: ["#c9a86a", "#8b7355"], vhsTape: ["#2a2040", "#1a1028"],
};

export function fillTexture(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  textureId: string, intensity: number,
) {
  const [c1, c2] = TEX_COLORS[textureId] ?? ["#ccc", "#999"];
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const a = 0.03 + intensity * 0.0005;
  ctx.strokeStyle = `rgba(0,0,0,${a})`; ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 4) {
    ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + (i % 5) - 2, y + h); ctx.stroke();
  }
}

export function drawWm(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  const fs = Math.max(12, Math.round(w * 0.022));
  const pad = Math.max(10, Math.round(w * 0.02));
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, w - Math.round(w * 0.28) - pad, h - fs * 2.4 - pad, Math.round(w * 0.28), fs * 2.4 + pad * 0.5, 8);
  ctx.fill();
  ctx.fillStyle = "#F5C542"; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.font = `600 ${fs}px system-ui,sans-serif`;
  ctx.fillText("Frame", w - pad - 6, h - fs * 1.5 - pad);
  ctx.fillStyle = "#FFE08A";
  ctx.font = `500 ${Math.round(fs * 0.85)}px system-ui,sans-serif`;
  ctx.fillText("Motio2edit", w - pad - 6, h - pad);
  ctx.restore();
}

export { composeFrame } from "./compose-frame";
