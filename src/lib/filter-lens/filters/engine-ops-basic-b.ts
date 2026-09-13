/**
 * engine-ops-basic-b.ts — fade, grain, vignette, sharpen, posterize, edge, pixel
 */
import type { RGBAImage } from '../shared/processing-types';
import { clamp8, mulberry32 } from './engine-ops-basic';

export function applyFade(data: Uint8ClampedArray, fade: number) {
  const t = Math.min(1, Math.max(0, fade / 100));
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp8(data[i] * (1 - t * 0.35) + 40 * t);
    data[i + 1] = clamp8(data[i + 1] * (1 - t * 0.35) + 40 * t);
    data[i + 2] = clamp8(data[i + 2] * (1 - t * 0.35) + 40 * t);
  }
}

export function applyGrain(data: Uint8ClampedArray, grain: number, seed: number) {
  if (grain <= 0) return;
  const rnd = mulberry32(seed);
  const amp = grain * 0.55;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rnd() - 0.5) * amp;
    data[i] = clamp8(data[i] + n);
    data[i + 1] = clamp8(data[i + 1] + n);
    data[i + 2] = clamp8(data[i + 2] + n);
  }
}

export function applyVignette(image: RGBAImage, amount: number, feather: number) {
  if (!amount) return;
  const w = image.width, h = image.height;
  const cx = w / 2, cy = h / 2;
  const maxD = Math.sqrt(cx * cx + cy * cy);
  const strength = amount / 100;
  const soft = Math.max(0.15, Math.min(0.95, (feather || 50) / 100));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxD;
      const v = Math.max(0, (d - (1 - soft)) / soft);
      const factor = 1 - v * v * strength;
      const i = (y * w + x) * 4;
      image.data[i] = clamp8(image.data[i] * factor);
      image.data[i + 1] = clamp8(image.data[i + 1] * factor);
      image.data[i + 2] = clamp8(image.data[i + 2] * factor);
    }
  }
}

export function applySharpen(image: RGBAImage, amount: number) {
  if (amount <= 0) return;
  const w = image.width, h = image.height;
  const src = new Uint8ClampedArray(image.data);
  const t = amount / 100;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = src[i + c];
        const blur =
          (src[i - 4 + c] + src[i + 4 + c] + src[i - w * 4 + c] + src[i + w * 4 + c] + center * 4) / 8;
        image.data[i + c] = clamp8(center + (center - blur) * t * 2);
      }
    }
  }
}

export function applyPosterize(data: Uint8ClampedArray, levels: number) {
  const n = Math.max(2, Math.min(16, Math.round(levels)));
  const step = 255 / (n - 1);
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      data[i + c] = clamp8(Math.round(data[i + c] / step) * step);
    }
  }
}

export function applyEdgeMix(image: RGBAImage, amount: number) {
  if (amount <= 0) return;
  const w = image.width, h = image.height;
  const src = new Uint8ClampedArray(image.data);
  const t = Math.min(1, amount / 100);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      let gx = 0, gy = 0;
      for (let c = 0; c < 3; c++) {
        const tl = src[((y - 1) * w + (x - 1)) * 4 + c];
        const tm = src[((y - 1) * w + x) * 4 + c];
        const tr = src[((y - 1) * w + (x + 1)) * 4 + c];
        const ml = src[(y * w + (x - 1)) * 4 + c];
        const mr = src[(y * w + (x + 1)) * 4 + c];
        const bl = src[((y + 1) * w + (x - 1)) * 4 + c];
        const bm = src[((y + 1) * w + x) * 4 + c];
        const br = src[((y + 1) * w + (x + 1)) * 4 + c];
        gx += -tl - 2 * ml - bl + tr + 2 * mr + br;
        gy += -tl - 2 * tm - tr + bl + 2 * bm + br;
      }
      const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy) / 3);
      const edge = 255 - mag;
      for (let c = 0; c < 3; c++) {
        image.data[i + c] = clamp8(src[i + c] * (1 - t) + edge * t);
      }
    }
  }
}

export function applyPixelate(image: RGBAImage, block: number) {
  const b = Math.max(2, Math.min(32, Math.round(block)));
  const w = image.width, h = image.height;
  const src = new Uint8ClampedArray(image.data);
  for (let y = 0; y < h; y += b) {
    for (let x = 0; x < w; x += b) {
      let r = 0, g = 0, bl = 0, n = 0;
      const y2 = Math.min(h, y + b), x2 = Math.min(w, x + b);
      for (let yy = y; yy < y2; yy++) {
        for (let xx = x; xx < x2; xx++) {
          const i = (yy * w + xx) * 4;
          r += src[i]; g += src[i + 1]; bl += src[i + 2]; n++;
        }
      }
      r = (r / n) | 0; g = (g / n) | 0; bl = (bl / n) | 0;
      for (let yy = y; yy < y2; yy++) {
        for (let xx = x; xx < x2; xx++) {
          const i = (yy * w + xx) * 4;
          image.data[i] = r; image.data[i + 1] = g; image.data[i + 2] = bl;
        }
      }
    }
  }
}
