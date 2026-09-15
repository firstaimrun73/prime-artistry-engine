/** Lens core helpers — high-quality canvas sampling */
import type { LensAspectId } from "./roster";
import { LENS_ASPECTS } from "./roster";

function hqCtx(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

export function captureVideoFrame(video: HTMLVideoElement, mirror = false): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = video.videoWidth || 1920;
  c.height = video.videoHeight || 1080;
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
