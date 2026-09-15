/**
 * engine-npr-core.ts
 * Non-photorealistic rendering cores based on established algorithms:
 * - Oil: intensity-bin dominant color (classic oil-paint filter)
 * - Watercolor: edge-preserving wash + edge darkening (pigment at boundaries)
 * - Cartoon: bilateral-style smooth + adaptive edge mask (OpenCV-style)
 *
 * Not photo grades (contrast/sat/vignette).
 */
import type { RGBAImage } from '../shared/processing-types';
import { clamp8 } from './engine-ops-basic';

/** Fast box blur (separable-ish multi-pass) for NPR prep. */
function boxBlur(src: Uint8ClampedArray, w: number, h: number, radius: number): Uint8ClampedArray {
  if (radius < 1) return new Uint8ClampedArray(src);
  let cur = new Uint8ClampedArray(src);
  const passes = Math.min(3, 1 + (radius / 2) | 0);
  for (let pass = 0; pass < passes; pass++) {
    const next = new Uint8ClampedArray(cur.length);
    const r = Math.max(1, (radius / passes) | 0);
    // horizontal
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let rs = 0, gs = 0, bs = 0, n = 0;
        for (let dx = -r; dx <= r; dx++) {
          const xx = Math.min(w - 1, Math.max(0, x + dx));
          const i = (y * w + xx) * 4;
          rs += cur[i]; gs += cur[i + 1]; bs += cur[i + 2]; n++;
        }
        const o = (y * w + x) * 4;
        next[o] = (rs / n) | 0;
        next[o + 1] = (gs / n) | 0;
        next[o + 2] = (bs / n) | 0;
        next[o + 3] = cur[o + 3];
      }
    }
    cur = next;
    const next2 = new Uint8ClampedArray(cur.length);
    // vertical
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let rs = 0, gs = 0, bs = 0, n = 0;
        for (let dy = -r; dy <= r; dy++) {
          const yy = Math.min(h - 1, Math.max(0, y + dy));
          const i = (yy * w + x) * 4;
          rs += cur[i]; gs += cur[i + 1]; bs += cur[i + 2]; n++;
        }
        const o = (y * w + x) * 4;
        next2[o] = (rs / n) | 0;
        next2[o + 1] = (gs / n) | 0;
        next2[o + 2] = (bs / n) | 0;
        next2[o + 3] = cur[o + 3];
      }
    }
    cur = next2;
  }
  return cur;
}

/**
 * Classic oil-paint filter (intensity bins + dominant bin mean color).
 * Ref: common NPR oil algorithm (radius + intensity levels).
 */
export function oilPaintFilter(
  image: RGBAImage,
  radius: number,
  intensityLevels: number,
): void {
  const w = image.width;
  const h = image.height;
  const src = new Uint8ClampedArray(image.data);
  const data = image.data;
  const r = Math.max(1, Math.min(8, radius | 0));
  const levels = Math.max(4, Math.min(40, intensityLevels | 0));

  // Process on a mild grid for speed at large sizes; fill neighbors
  const step = w * h > 400_000 ? 2 : 1;

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const intensityCount = new Int32Array(levels);
      const sumR = new Float32Array(levels);
      const sumG = new Float32Array(levels);
      const sumB = new Float32Array(levels);

      const y0 = Math.max(0, y - r);
      const y1 = Math.min(h - 1, y + r);
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);

      for (let yy = y0; yy <= y1; yy++) {
        for (let xx = x0; xx <= x1; xx++) {
          const i = (yy * w + xx) * 4;
          const intensity = ((src[i] + src[i + 1] + src[i + 2]) / 3) | 0;
          const bin = Math.min(levels - 1, ((intensity * levels) / 256) | 0);
          intensityCount[bin]++;
          sumR[bin] += src[i];
          sumG[bin] += src[i + 1];
          sumB[bin] += src[i + 2];
        }
      }

      let maxCount = 0;
      let maxBin = 0;
      for (let b = 0; b < levels; b++) {
        if (intensityCount[b] > maxCount) {
          maxCount = intensityCount[b];
          maxBin = b;
        }
      }
      if (maxCount < 1) continue;
      const o = (y * w + x) * 4;
      data[o] = clamp8(sumR[maxBin] / maxCount);
      data[o + 1] = clamp8(sumG[maxBin] / maxCount);
      data[o + 2] = clamp8(sumB[maxBin] / maxCount);

      // Fill step block
      if (step > 1) {
        for (let dy = 0; dy < step && y + dy < h; dy++) {
          for (let dx = 0; dx < step && x + dx < w; dx++) {
            if (dx === 0 && dy === 0) continue;
            const j = ((y + dy) * w + (x + dx)) * 4;
            data[j] = data[o];
            data[j + 1] = data[o + 1];
            data[j + 2] = data[o + 2];
          }
        }
      }
    }
  }
}

/**
 * Approximate bilateral filter: spatial blur that skips large luminance jumps.
 * Used for cartoon / watercolor base (OpenCV bilateral role).
 */
export function bilateralApprox(
  image: RGBAImage,
  radius: number,
  lumaSigma: number,
  iterations: number,
): void {
  const w = image.width;
  const h = image.height;
  const r = Math.max(1, Math.min(6, radius | 0));
  const sigma = Math.max(8, lumaSigma);
  const inv = 1 / (2 * sigma * sigma);
  let src = new Uint8ClampedArray(image.data);
  const data = image.data;

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Uint8ClampedArray(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const lc = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        let wr = 0, wg = 0, wb = 0, wt = 0;
        for (let dy = -r; dy <= r; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const j = (yy * w + xx) * 4;
            const ln = 0.299 * src[j] + 0.587 * src[j + 1] + 0.114 * src[j + 2];
            const dl = ln - lc;
            const weight = Math.exp(-(dx * dx + dy * dy) * 0.15 - dl * dl * inv);
            wr += src[j] * weight;
            wg += src[j + 1] * weight;
            wb += src[j + 2] * weight;
            wt += weight;
          }
        }
        next[i] = clamp8(wr / wt);
        next[i + 1] = clamp8(wg / wt);
        next[i + 2] = clamp8(wb / wt);
        next[i + 3] = src[i + 3];
      }
    }
    src = next;
  }
  data.set(src);
}

/** Adaptive-threshold style edge mask (0 = edge ink, 1 = keep color). */
export function adaptiveEdgeMask(
  gray: Float32Array,
  w: number,
  h: number,
  block: number,
  C: number,
): Uint8Array {
  const mask = new Uint8Array(w * h); // 1 = not edge
  const b = Math.max(3, block | 0);
  const half = (b / 2) | 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -half; dy <= half; dy++) {
        const yy = Math.min(h - 1, Math.max(0, y + dy));
        for (let dx = -half; dx <= half; dx++) {
          const xx = Math.min(w - 1, Math.max(0, x + dx));
          sum += gray[yy * w + xx];
          n++;
        }
      }
      const mean = sum / n;
      const g = gray[y * w + x];
      // edge if darker than local mean - C (OpenCV adaptive THRESH_BINARY logic)
      mask[y * w + x] = g < mean - C ? 0 : 1;
    }
  }
  return mask;
}

/** Apply black ink where mask is 0. */
export function applyEdgeMaskInk(
  data: Uint8ClampedArray,
  mask: Uint8Array,
  strength: number,
): void {
  const k = Math.max(0, Math.min(1, strength));
  for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
    if (mask[p] === 0) {
      data[i] = clamp8(data[i] * (1 - k));
      data[i + 1] = clamp8(data[i + 1] * (1 - k));
      data[i + 2] = clamp8(data[i + 2] * (1 - k));
    }
  }
}

/**
 * Watercolor edge darkening: pigment accumulates at structure boundaries.
 * Ref: watercolor NPR literature (edge darkening from surface tension).
 */
export function watercolorEdgeDarken(
  data: Uint8ClampedArray,
  edges: Float32Array,
  strength: number,
): void {
  const k = Math.max(0, Math.min(1, strength));
  for (let p = 0, i = 0; p < edges.length; p++, i += 4) {
    const e = edges[p];
    if (e < 20) continue;
    const t = Math.min(1, (e - 20) / 60) * k;
    data[i] = clamp8(data[i] * (1 - t * 0.45));
    data[i + 1] = clamp8(data[i + 1] * (1 - t * 0.45));
    data[i + 2] = clamp8(data[i + 2] * (1 - t * 0.45));
  }
}

/** Soft quantize for wash / cel regions. */
export function softQuantize(data: Uint8ClampedArray, levels: number, blend: number): void {
  const step = 255 / Math.max(2, levels - 1);
  const b = Math.max(0, Math.min(1, blend));
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const o = data[i + c];
      const q = Math.round(o / step) * step;
      data[i + c] = clamp8(o * (1 - b) + q * b);
    }
  }
}

export function grayFromImage(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const g = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    g[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return g;
}

export { boxBlur };
