/**
 * Motio2edit Lens — on-device image processing.
 * Each lens produces a clearly distinguishable result.
 * Native aspect is preserved when aspectId === "native".
 * Watermark only when opts.watermark === true (final download).
 */
import type { CameraLensDef, LensAspectId } from "./roster";
import { LENS_ASPECTS } from "./roster";

export function captureVideoFrame(video: HTMLVideoElement, mirror = false): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = video.videoWidth || 1280;
  c.height = video.videoHeight || 720;
  const ctx = c.getContext("2d")!;
  if (mirror) {
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, c.width, c.height);
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
  out.getContext("2d")!.drawImage(src, sx, sy, cw, ch, 0, 0, cw, ch);
  return out;
}

function clone(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  c.getContext("2d")!.drawImage(src, 0, 0);
  return c;
}

function data(c: HTMLCanvasElement): ImageData {
  return c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
}

function put(c: HTMLCanvasElement, img: ImageData): HTMLCanvasElement {
  c.getContext("2d")!.putImageData(img, 0, 0);
  return c;
}

function sampleBilinear(data: Uint8ClampedArray, w: number, h: number, x: number, y: number): [number, number, number, number] {
  const xi = Math.max(0, Math.min(w - 1, Math.floor(x)));
  const yi = Math.max(0, Math.min(h - 1, Math.floor(y)));
  const x1 = Math.min(w - 1, xi + 1);
  const y1 = Math.min(h - 1, yi + 1);
  const fx = Math.max(0, Math.min(1, x - xi));
  const fy = Math.max(0, Math.min(1, y - yi));
  const i00 = (yi * w + xi) * 4, i10 = (yi * w + x1) * 4, i01 = (y1 * w + xi) * 4, i11 = (y1 * w + x1) * 4;
  return [
    data[i00]*(1-fx)*(1-fy)+data[i10]*fx*(1-fy)+data[i01]*(1-fx)*fy+data[i11]*fx*fy,
    data[i00+1]*(1-fx)*(1-fy)+data[i10+1]*fx*(1-fy)+data[i01+1]*(1-fx)*fy+data[i11+1]*fx*fy,
    data[i00+2]*(1-fx)*(1-fy)+data[i10+2]*fx*(1-fy)+data[i01+2]*(1-fx)*fy+data[i11+2]*fx*fy,
    data[i00+3]*(1-fx)*(1-fy)+data[i10+3]*fx*(1-fy)+data[i01+3]*(1-fx)*fy+data[i11+3]*fx*fy,
  ];
}

function radialMap(src: HTMLCanvasElement, k: number): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const octx = out.getContext("2d")!;
  const sd = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const dst = octx.createImageData(w, h);
  const dd = dst.data;
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy) || 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / maxR, dy = (y - cy) / maxR;
      const f = 1 + k * (dx * dx + dy * dy);
      const [r, g, b, a] = sampleBilinear(sd, w, h, cx + (dx * maxR) / f, cy + (dy * maxR) / f);
      const di = (y * w + x) * 4;
      dd[di] = r; dd[di + 1] = g; dd[di + 2] = b; dd[di + 3] = a;
    }
  }
  octx.putImageData(dst, 0, 0);
  return out;
}
