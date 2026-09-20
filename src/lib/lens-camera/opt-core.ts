/** Shared canvas helpers for Motio2edit Lenses optical pipeline */
import type { LensAspectId } from "./roster";
import { LENS_ASPECTS } from "./roster";

export function hqCtx(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

export function captureVideoFrame(video: HTMLVideoElement, mirror = false): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = video.videoWidth || 1280;
  c.height = video.videoHeight || 720;
  const ctx = hqCtx(c);
  if (mirror) {
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, c.width, c.height);
  return c;
}

export function clone(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  hqCtx(c).drawImage(src, 0, 0);
  return c;
}

export function cropToAspect(src: HTMLCanvasElement, aspectId: LensAspectId): HTMLCanvasElement {
  const def = LENS_ASPECTS.find((a) => a.id === aspectId);
  if (!def || !def.ratio) return clone(src);
  const target = def.ratio;
  const sw = src.width;
  const sh = src.height;
  const sr = sw / sh;
  let cw = sw;
  let ch = sh;
  if (sr > target) cw = Math.round(sh * target);
  else ch = Math.round(sw / target);
  const sx = Math.floor((sw - cw) / 2);
  const sy = Math.floor((sh - ch) / 2);
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  hqCtx(out).drawImage(src, sx, sy, cw, ch, 0, 0, cw, ch);
  return out;
}

export function grade(src: HTMLCanvasElement, filter: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = hqCtx(c);
  ctx.filter = filter;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  return c;
}

export function teleCrop(src: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  const f = Math.max(1.05, factor);
  const cw = Math.round(src.width / f);
  const ch = Math.round(src.height / f);
  const sx = Math.floor((src.width - cw) / 2);
  const sy = Math.floor((src.height - ch) / 2);
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  hqCtx(out).drawImage(src, sx, sy, cw, ch, 0, 0, out.width, out.height);
  return out;
}

/** Cap ultra-large frames so mobile GPUs stay stable (keeps up to 2560 long edge). */
export function normalizeCaptureSize(src: HTMLCanvasElement, maxEdge = 2560): HTMLCanvasElement {
  const edge = Math.max(src.width, src.height);
  if (edge <= maxEdge) return src;
  const scale = maxEdge / edge;
  const out = document.createElement("canvas");
  out.width = Math.round(src.width * scale);
  out.height = Math.round(src.height * scale);
  hqCtx(out).drawImage(src, 0, 0, out.width, out.height);
  return out;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.95,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type, quality);
  });
}

/** Normalized content focus point (0..1). */
export type FocusPoint = { x: number; y: number; strength: number };

/**
 * Lightweight content-aware focus: high-contrast + bright regions on a small analysis canvas.
 * Multi-blob support: averages the strongest clusters so group portraits stay in focus.
 * Falls back to upper-center (portrait-friendly) when no signal.
 */
export function analyzeFocus(src: HTMLCanvasElement): FocusPoint {
  const maxSide = 96;
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  const w = Math.max(8, Math.round(src.width * scale));
  const h = Math.max(8, Math.round(src.height * scale));
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d", { willReadFrequently: true })!;
  tctx.drawImage(src, 0, 0, w, h);
  const { data } = tctx.getImageData(0, 0, w, h);

  let sumW = 0;
  let sumX = 0;
  let sumY = 0;
  let maxL = 0;
  let brightX = w * 0.5;
  let brightY = h * 0.35;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (l > maxL) {
        maxL = l;
        brightX = x;
        brightY = y;
      }
      const iL = (y * w + (x - 1)) * 4;
      const iR = (y * w + (x + 1)) * 4;
      const iU = ((y - 1) * w + x) * 4;
      const iD = ((y + 1) * w + x) * 4;
      const lL = 0.299 * data[iL] + 0.587 * data[iL + 1] + 0.114 * data[iL + 2];
      const lR = 0.299 * data[iR] + 0.587 * data[iR + 1] + 0.114 * data[iR + 2];
      const lU = 0.299 * data[iU] + 0.587 * data[iU + 1] + 0.114 * data[iU + 2];
      const lD = 0.299 * data[iD] + 0.587 * data[iD + 1] + 0.114 * data[iD + 2];
      const contrast = Math.abs(l - lL) + Math.abs(l - lR) + Math.abs(l - lU) + Math.abs(l - lD);
      const regionBias = 1 + 0.35 * (1 - Math.abs(y / h - 0.38) * 2);
      const weight = contrast * regionBias * (0.4 + l / 255);
      if (weight > 12) {
        sumW += weight;
        sumX += x * weight;
        sumY += y * weight;
      }
    }
  }

  if (sumW < 1) {
    return { x: 0.5, y: 0.4, strength: 0 };
  }
  return {
    x: sumX / sumW / w,
    y: sumY / sumW / h,
    strength: Math.min(1, sumW / (w * h * 8)),
  };
}

/** Mean scene luminance 0..1 from a downscaled sample. */
export function estimateBrightness(src: HTMLCanvasElement | HTMLVideoElement): number {
  const maxSide = 48;
  let sw: number;
  let sh: number;
  if (src instanceof HTMLVideoElement) {
    sw = src.videoWidth || 1;
    sh = src.videoHeight || 1;
  } else {
    sw = src.width;
    sh = src.height;
  }
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(4, Math.round(sw * scale));
  const h = Math.max(4, Math.round(sh * scale));
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d", { willReadFrequently: true })!;
  tctx.drawImage(src, 0, 0, w, h);
  const { data } = tctx.getImageData(0, 0, w, h);
  let sum = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return sum / n / 255;
}

/** Find brightest highlight cluster for flare placement. Returns normalized coords + strength. */
export function findHighlight(src: HTMLCanvasElement): { x: number; y: number; strength: number } {
  const maxSide = 80;
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  const w = Math.max(8, Math.round(src.width * scale));
  const h = Math.max(8, Math.round(src.height * scale));
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d", { willReadFrequently: true })!;
  tctx.drawImage(src, 0, 0, w, h);
  const { data } = tctx.getImageData(0, 0, w, h);

  let best = 0;
  let bx = w * 0.5;
  let by = h * 0.25;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let acc = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const i = ((y + dy) * w + (x + dx)) * 4;
          acc += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
      }
      const v = acc / 9;
      if (v > best) {
        best = v;
        bx = x;
        by = y;
      }
    }
  }
  const strength = Math.max(0, Math.min(1, (best - 160) / 95));
  return { x: bx / w, y: by / h, strength };
}
