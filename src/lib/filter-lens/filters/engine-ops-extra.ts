/**
 * engine-ops-extra.ts — bloom, blur, duotone, neon, denoise
 */
import type { RGBAImage } from '../shared/processing-types';
import { clamp8 } from './engine-ops-basic';

export function applyBloom(image: RGBAImage, amount: number) {
  if (amount <= 0) return;
  const t = Math.min(1, amount / 100);
  const w = image.width, h = image.height;
  const src = new Uint8ClampedArray(image.data);
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = (y * w + x) * 4;
      let br = 0, bg = 0, bb = 0, n = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const j = ((y + dy) * w + (x + dx)) * 4;
          const lum = 0.299 * src[j] + 0.587 * src[j + 1] + 0.114 * src[j + 2];
          if (lum > 155) {
            br += src[j]; bg += src[j + 1]; bb += src[j + 2]; n++;
          }
        }
      }
      if (n > 0) {
        image.data[i] = clamp8(src[i] + (br / n - src[i]) * t * 0.88);
        image.data[i + 1] = clamp8(src[i + 1] + (bg / n - src[i + 1]) * t * 0.88);
        image.data[i + 2] = clamp8(src[i + 2] + (bb / n - src[i + 2]) * t * 0.88);
      }
    }
  }
}

export function applySoftBlur(image: RGBAImage, amount: number) {
  if (amount <= 0) return;
  const passes = Math.max(1, Math.min(4, Math.round(amount / 25)));
  const w = image.width, h = image.height;
  for (let p = 0; p < passes; p++) {
    const src = new Uint8ClampedArray(image.data);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
              sum += src[((y + dy) * w + (x + dx)) * 4 + c];
          image.data[i + c] = (sum / 9) | 0;
        }
      }
    }
  }
}

export function applyDuotone(
  data: Uint8ClampedArray,
  shadow: [number, number, number],
  highlight: [number, number, number],
) {
  for (let i = 0; i < data.length; i += 4) {
    const l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    data[i] = clamp8(shadow[0] + (highlight[0] - shadow[0]) * l);
    data[i + 1] = clamp8(shadow[1] + (highlight[1] - shadow[1]) * l);
    data[i + 2] = clamp8(shadow[2] + (highlight[2] - shadow[2]) * l);
  }
}

export function applyNeonStyle(data: Uint8ClampedArray, amount: number) {
  const t = Math.min(1, amount / 100);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    data[i] = clamp8(r * (1 - t * 0.15) + Math.max(r, b) * t * 0.35);
    data[i + 1] = clamp8(g * (1 - t * 0.1) + Math.max(g, b) * t * 0.45);
    data[i + 2] = clamp8(b * (1 + t * 0.55));
  }
}

export function applyContrastish(data: Uint8ClampedArray, contrast: number) {
  const c = 1 + contrast / 100;
  for (let i = 0; i < data.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      data[i + ch] = clamp8((data[i + ch] - 128) * c + 128);
    }
  }
}

export function applyDenoise(image: RGBAImage, amount: number) {
  if (amount <= 0) return;
  applySoftBlur(image, Math.min(40, amount * 0.6));
}

export function applyDynamicRange(data: Uint8ClampedArray, amount: number) {
  if (!amount) return;
  const t = amount / 100;
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const shadowLift = (1 - Math.min(1, l / 140)) * t * 28;
    const highPull = Math.max(0, (l - 180) / 75) * t * 22;
    for (let c = 0; c < 3; c++) data[i + c] = clamp8(data[i + c] + shadowLift - highPull);
  }
}

export function applyAtmosphere(data: Uint8ClampedArray, amount: number) {
  if (!amount) return;
  const t = Math.abs(amount) / 100;
  const cool = amount < 0;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp8(data[i] * (1 - t * 0.12) + (cool ? 30 : 20) * t);
    data[i + 1] = clamp8(data[i + 1] * (1 - t * 0.1) + (cool ? 35 : 25) * t);
    data[i + 2] = clamp8(data[i + 2] * (1 - t * 0.08) + (cool ? 50 : 15) * t);
  }
}
