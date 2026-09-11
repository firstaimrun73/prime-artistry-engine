/** Lens core helpers */
import type { LensAspectId } from "./roster";
import { LENS_ASPECTS } from "./roster";

export function captureVideoFrame(video: HTMLVideoElement, mirror = false): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = video.videoWidth || 1280; c.height = video.videoHeight || 720;
  const ctx = c.getContext("2d")!;
  if (mirror) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, 0, 0, c.width, c.height);
  return c;
}
export function clone(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width; c.height = src.height;
  c.getContext("2d")!.drawImage(src, 0, 0);
  return c;
}
export function cropToAspect(src: HTMLCanvasElement, aspectId: LensAspectId): HTMLCanvasElement {
  const def = LENS_ASPECTS.find((a) => a.id === aspectId);
  if (!def || !def.ratio) return clone(src);
  const t = def.ratio, sw = src.width, sh = src.height, sr = sw / sh;
  let cw = sw, ch = sh;
  if (sr > t) cw = Math.round(sh * t); else ch = Math.round(sw / t);
  const out = document.createElement("canvas");
  out.width = cw; out.height = ch;
  out.getContext("2d")!.drawImage(src, Math.floor((sw-cw)/2), Math.floor((sh-ch)/2), cw, ch, 0, 0, cw, ch);
  return out;
}
export function grade(src: HTMLCanvasElement, filter: string): HTMLCanvasElement {
  const c = clone(src); const ctx = c.getContext("2d")!;
  ctx.filter = filter; ctx.drawImage(src, 0, 0); ctx.filter = "none";
  return c;
}
export function teleCrop(src: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const cw = Math.round(w / factor), ch = Math.round(h / factor);
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  out.getContext("2d")!.drawImage(src, Math.floor((w-cw)/2), Math.floor((h-ch)/2), cw, ch, 0, 0, w, h);
  return out;
}
export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type, quality);
  });
}
