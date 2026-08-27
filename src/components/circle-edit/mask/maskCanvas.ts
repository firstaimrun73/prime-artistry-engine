/**
 * Authoritative mask canvas at natural (or safely capped) resolution.
 *
 * One persistent canvas — never recreated on pointermove.
 * Brush adds selection (source-over white with radial falloff).
 * Eraser removes selection (destination-out).
 * Circle fills an ellipse solidly.
 *
 * Export produces hard B/W PNG at exact naturalWidth × naturalHeight.
 */

import type { Point, Size, BrushSettings } from "./types";
import { screenRadiusToNatural, strokeStepNatural } from "./maskGeometry";

/** Safety cap for extremely large sources (memory). Export still upscales to natural. */
const MAX_WORKING_DIM = 4096;

export type WorkingMask = {
  canvas: HTMLCanvasElement;
  /** Working canvas size (may be < natural if capped) */
  width: number;
  height: number;
  /** Scale from natural → working (1 if no downscale) */
  scale: number;
  natural: Size;
};

export function createWorkingMask(natural: Size): WorkingMask {
  const maxSide = Math.max(natural.width, natural.height);
  const scale = maxSide > MAX_WORKING_DIM ? MAX_WORKING_DIM / maxSide : 1;
  const width = Math.max(1, Math.round(natural.width * scale));
  const height = Math.max(1, Math.round(natural.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, width, height);
  }
  return { canvas, width, height, scale, natural };
}

function toWorking(p: Point, scale: number): Point {
  return { x: p.x * scale, y: p.y * scale };
}

/**
 * Stamp a soft circular brush or hard eraser at natural coords.
 * brush.sizePx is in SCREEN pixels; displayScale is natural→screen.
 */
export function stampBrush(
  mask: WorkingMask,
  naturalPt: Point,
  tool: "brush" | "erase",
  settings: BrushSettings,
  displayScale: number,
): void {
  const ctx = mask.canvas.getContext("2d");
  if (!ctx) return;

  const wp = toWorking(naturalPt, mask.scale);
  const rScreen = Math.max(1, settings.sizePx / 2);
  const rNatural = screenRadiusToNatural(rScreen, displayScale);
  const r = Math.max(0.5, rNatural * mask.scale);
  const feather = Math.max(0, (settings.featherPx / Math.max(displayScale, 0.001)) * mask.scale);
  const alpha = Math.max(0.05, Math.min(1, settings.opacity / 100));
  const hardness = Math.max(0, Math.min(1, settings.hardness / 100));

  if (tool === "brush") {
    ctx.globalCompositeOperation = "source-over";
    const inner = r * hardness;
    const outer = r + feather;
    const grad = ctx.createRadialGradient(wp.x, wp.y, Math.max(0, inner), wp.x, wp.y, Math.max(outer, 0.5));
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(wp.x, wp.y, outer, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.arc(wp.x, wp.y, r + feather, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Continuous stroke between two natural points.
 */
export function strokeBetween(
  mask: WorkingMask,
  from: Point,
  to: Point,
  tool: "brush" | "erase",
  settings: BrushSettings,
  displayScale: number,
): void {
  const rScreen = Math.max(1, settings.sizePx / 2);
  const rNatural = screenRadiusToNatural(rScreen, displayScale);
  const step = strokeStepNatural(rNatural);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const n = Math.max(1, Math.ceil(dist / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    stampBrush(mask, { x: from.x + dx * t, y: from.y + dy * t }, tool, settings, displayScale);
  }
}

/**
 * Fill an ellipse defined by two opposite corners in natural space.
 */
export function fillEllipse(
  mask: WorkingMask,
  a: Point,
  b: Point,
): void {
  const ctx = mask.canvas.getContext("2d");
  if (!ctx) return;
  const s = mask.scale;
  const cx = ((a.x + b.x) / 2) * s;
  const cy = ((a.y + b.y) / 2) * s;
  const rx = (Math.abs(b.x - a.x) / 2) * s;
  const ry = (Math.abs(b.y - a.y) / 2) * s;
  if (rx < 0.5 && ry < 0.5) return;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function clearMask(mask: WorkingMask): void {
  const ctx = mask.canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, mask.width, mask.height);
}

export function invertMask(mask: WorkingMask): void {
  const ctx = mask.canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, mask.width, mask.height);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = 255;
    img.data[i + 1] = 255;
    img.data[i + 2] = 255;
    img.data[i + 3] = 255 - img.data[i + 3];
  }
  ctx.putImageData(img, 0, 0);
}

export function maskHasPaint(mask: WorkingMask, threshold = 16): boolean {
  const ctx = mask.canvas.getContext("2d");
  if (!ctx) return false;
  const data = ctx.getImageData(0, 0, mask.width, mask.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] >= threshold) return true;
  }
  return false;
}

/**
 * Export hard B/W PNG at EXACT natural resolution.
 * WHITE = selected, BLACK = unselected.
 * Uses toBlob path internally via data URL for compatibility with existing callers.
 */
export function exportMaskNatural(mask: WorkingMask): string | null {
  const ctx = mask.canvas.getContext("2d");
  if (!ctx) return null;

  const src = ctx.getImageData(0, 0, mask.width, mask.height);
  const tmp = document.createElement("canvas");
  tmp.width = mask.width;
  tmp.height = mask.height;
  const tctx = tmp.getContext("2d");
  if (!tctx) return null;

  const bw = tctx.createImageData(mask.width, mask.height);
  let painted = 0;
  for (let i = 0; i < src.data.length; i += 4) {
    const on = src.data[i + 3] >= 24 ? 255 : 0;
    if (on) painted++;
    bw.data[i] = on;
    bw.data[i + 1] = on;
    bw.data[i + 2] = on;
    bw.data[i + 3] = 255;
  }
  if (painted === 0) return null;

  tctx.putImageData(bw, 0, 0);

  const nw = mask.natural.width;
  const nh = mask.natural.height;
  if (mask.width === nw && mask.height === nh) {
    return tmp.toDataURL("image/png");
  }

  // Upscale to natural with nearest-neighbor (preserve hard edges)
  const out = document.createElement("canvas");
  out.width = nw;
  out.height = nh;
  const octx = out.getContext("2d");
  if (!octx) return null;
  octx.imageSmoothingEnabled = false;
  octx.fillStyle = "black";
  octx.fillRect(0, 0, nw, nh);
  octx.drawImage(tmp, 0, 0, nw, nh);
  return out.toDataURL("image/png");
}

export function snapshotMask(mask: WorkingMask): ImageData | null {
  const ctx = mask.canvas.getContext("2d");
  if (!ctx) return null;
  return ctx.getImageData(0, 0, mask.width, mask.height);
}

export function restoreSnapshot(mask: WorkingMask, snap: ImageData): void {
  const ctx = mask.canvas.getContext("2d");
  if (!ctx) return;
  ctx.putImageData(snap, 0, 0);
}
