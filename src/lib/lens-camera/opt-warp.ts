/** Lens geometric warps with bilinear sampling */
import { clone } from "./opt-core";

function sampleBilinear(data: Uint8ClampedArray, w: number, h: number, x: number, y: number): [number, number, number, number] {
  const xi = Math.max(0, Math.min(w - 1, Math.floor(x)));
  const yi = Math.max(0, Math.min(h - 1, Math.floor(y)));
  const xf = x - xi;
  const yf = y - yi;
  const x2 = Math.min(w - 1, xi + 1);
  const y2 = Math.min(h - 1, yi + 1);
  const i00 = (yi * w + xi) * 4;
  const i10 = (yi * w + x2) * 4;
  const i01 = (y2 * w + xi) * 4;
  const i11 = (y2 * w + x2) * 4;
  const r = data[i00] * (1 - xf) * (1 - yf) + data[i10] * xf * (1 - yf) + data[i01] * (1 - xf) * yf + data[i11] * xf * yf;
  const g = data[i00 + 1] * (1 - xf) * (1 - yf) + data[i10 + 1] * xf * (1 - yf) + data[i01 + 1] * (1 - xf) * yf + data[i11 + 1] * xf * yf;
  const b = data[i00 + 2] * (1 - xf) * (1 - yf) + data[i10 + 2] * xf * (1 - yf) + data[i01 + 2] * (1 - xf) * yf + data[i11 + 2] * xf * yf;
  const a = data[i00 + 3] * (1 - xf) * (1 - yf) + data[i10 + 3] * xf * (1 - yf) + data[i01 + 3] * (1 - xf) * yf + data[i11 + 3] * xf * yf;
  return [r, g, b, a];
}

export function radialMap(src: HTMLCanvasElement, k: number): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const ctx = src.getContext("2d")!;
  const img = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / maxR;
      const dy = (y - cy) / maxR;
      const r = Math.sqrt(dx * dx + dy * dy);
      const f = r === 0 ? 1 : Math.pow(r, k) / r;
      const sx = cx + dx * f * maxR;
      const sy = cy + dy * f * maxR;
      const [r0, g0, b0, a0] = sampleBilinear(img.data, w, h, sx, sy);
      const i = (y * w + x) * 4;
      out.data[i] = r0;
      out.data[i + 1] = g0;
      out.data[i + 2] = b0;
      out.data[i + 3] = a0;
    }
  }
  const c = clone(src);
  c.getContext("2d")!.putImageData(out, 0, 0);
  return c;
}

export function fisheye360(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const ctx = src.getContext("2d")!;
  const img = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(cx, cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > maxR) {
        const i = (y * w + x) * 4;
        out.data[i + 3] = 0;
        continue;
      }
      const theta = Math.atan2(dy, dx);
      const nr = (r / maxR) * (r / maxR);
      const sx = cx + Math.cos(theta) * nr * maxR * 1.15;
      const sy = cy + Math.sin(theta) * nr * maxR * 1.15;
      const [r0, g0, b0, a0] = sampleBilinear(img.data, w, h, sx, sy);
      const i = (y * w + x) * 4;
      out.data[i] = r0;
      out.data[i + 1] = g0;
      out.data[i + 2] = b0;
      out.data[i + 3] = a0;
    }
  }
  const c = clone(src);
  c.getContext("2d")!.putImageData(out, 0, 0);
  return c;
}

export function sharpen(src: HTMLCanvasElement, amount = 1): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const w = c.width;
  const h = c.height;
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const copy = new Uint8ClampedArray(data);
  const k = amount * 0.35;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const v =
          -copy[i - 4 + ch] -
          copy[i + 4 + ch] -
          copy[i - w * 4 + ch] -
          copy[i + w * 4 + ch] +
          5 * copy[i + ch];
        data[i + ch] = Math.max(0, Math.min(255, copy[i + ch] + k * (v - copy[i + ch])));
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
