/**
 * engine-npr-core.ts
 * NPR cores — oil (intensity-bin, every pixel), bilateral, adaptive edges, watercolor darken.
 * Avoids step-skipping and harsh gradient banding that destroyed faces / created rings.
 */
import type { RGBAImage } from '../shared/processing-types';
import { clamp8 } from './engine-ops-basic';

/** Fast separable box blur. */
export function boxBlur(src: Uint8ClampedArray, w: number, h: number, radius: number): Uint8ClampedArray {
  if (radius < 1) return new Uint8ClampedArray(src);
  let cur = new Uint8ClampedArray(src);
  const passes = Math.min(3, 1 + ((radius / 2) | 0));
  for (let pass = 0; pass < passes; pass++) {
    const r = Math.max(1, (radius / passes) | 0);
    const horiz = new Uint8ClampedArray(cur.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let rs = 0, gs = 0, bs = 0, n = 0;
        for (let dx = -r; dx <= r; dx++) {
          const xx = Math.min(w - 1, Math.max(0, x + dx));
          const i = (y * w + xx) * 4;
          rs += cur[i]; gs += cur[i + 1]; bs += cur[i + 2]; n++;
        }
        const o = (y * w + x) * 4;
        horiz[o] = (rs / n) | 0;
        horiz[o + 1] = (gs / n) | 0;
        horiz[o + 2] = (bs / n) | 0;
        horiz[o + 3] = cur[o + 3];
      }
    }
    const next = new Uint8ClampedArray(cur.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let rs = 0, gs = 0, bs = 0, n = 0;
        for (let dy = -r; dy <= r; dy++) {
          const yy = Math.min(h - 1, Math.max(0, y + dy));
          const i = (yy * w + x) * 4;
          rs += horiz[i]; gs += horiz[i + 1]; bs += horiz[i + 2]; n++;
        }
        const o = (y * w + x) * 4;
        next[o] = (rs / n) | 0;
        next[o + 1] = (gs / n) | 0;
        next[o + 2] = (bs / n) | 0;
        next[o + 3] = horiz[o + 3];
      }
    }
    cur = next;
  }
  return cur;
}

/**
 * Classic oil-paint: intensity bins + dominant-bin mean color.
 * Processes EVERY pixel (no step fill) to avoid face/block artifacts.
 * Radius clamped for mobile performance.
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
  const r = Math.max(1, Math.min(5, radius | 0));
  const levels = Math.max(6, Math.min(24, intensityLevels | 0));

  // Reuse bin arrays to cut GC pressure
  const intensityCount = new Int32Array(levels);
  const sumR = new Float32Array(levels);
  const sumG = new Float32Array(levels);
  const sumB = new Float32Array(levels);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      intensityCount.fill(0);
      sumR.fill(0);
      sumG.fill(0);
      sumB.fill(0);

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
    }
  }
}

/** Edge-preserving bilateral approximation (OpenCV bilateral role). */
export function bilateralApprox(
  image: RGBAImage,
  radius: number,
  lumaSigma: number,
  iterations: number,
): void {
  const w = image.width;
  const h = image.height;
  const r = Math.max(1, Math.min(4, radius | 0));
  const sigma = Math.max(10, lumaSigma);
  const inv = 1 / (2 * sigma * sigma);
  let src = new Uint8ClampedArray(image.data);
  const data = image.data;
  const iters = Math.max(1, Math.min(3, iterations | 0));

  for (let iter = 0; iter < iters; iter++) {
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
            const weight = Math.exp(-(dx * dx + dy * dy) * 0.18 - dl * dl * inv);
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

/** Adaptive threshold edge mask (0 = ink, 1 = keep). */
export function adaptiveEdgeMask(
  gray: Float32Array,
  w: number,
  h: number,
  block: number,
  C: number,
): Uint8Array {
  const mask = new Uint8Array(w * h);
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
      mask[y * w + x] = gray[y * w + x] < mean - C ? 0 : 1;
    }
  }
  return mask;
}

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

export function watercolorEdgeDarken(
  data: Uint8ClampedArray,
  edges: Float32Array,
  strength: number,
): void {
  const k = Math.max(0, Math.min(1, strength));
  for (let p = 0, i = 0; p < edges.length; p++, i += 4) {
    const e = edges[p];
    if (e < 18) continue;
    const t = Math.min(1, (e - 18) / 70) * k;
    data[i] = clamp8(data[i] * (1 - t * 0.4));
    data[i + 1] = clamp8(data[i + 1] * (1 - t * 0.4));
    data[i + 2] = clamp8(data[i + 2] * (1 - t * 0.4));
  }
}

/** Soft quantize with ordered dither to reduce concentric banding on gradients. */
export function softQuantize(data: Uint8ClampedArray, levels: number, blend: number): void {
  const step = 255 / Math.max(2, levels - 1);
  const b = Math.max(0, Math.min(1, blend));
  // 2x2 Bayer dither matrix scaled
  const bayer = [0, 2, 3, 1];
  for (let i = 0; i < data.length; i += 4) {
    const px = (i / 4) | 0;
    // approximate x,y from linear index is not needed for mild dither — use px
    const d = (bayer[px & 3] - 1.5) * (step * 0.12);
    for (let c = 0; c < 3; c++) {
      const o = data[i + c] + d;
      const q = Math.round(o / step) * step;
      data[i + c] = clamp8(data[i + c] * (1 - b) + q * b);
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

/** Simple image stats for adaptive strength (portrait vs landscape etc.). */
export function analyzeImageStats(data: Uint8ClampedArray, w: number, h: number): {
  meanLuma: number;
  edgeDensity: number;
  isLowContrast: boolean;
} {
  let sum = 0;
  let edgeSum = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const i = (y * w + x) * 4;
      const y0 = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const iR = (y * w + x + 1) * 4;
      const yR = 0.299 * data[iR] + 0.587 * data[iR + 1] + 0.114 * data[iR + 2];
      const iD = ((y + 1) * w + x) * 4;
      const yD = 0.299 * data[iD] + 0.587 * data[iD + 1] + 0.114 * data[iD + 2];
      sum += y0;
      edgeSum += Math.abs(yR - y0) + Math.abs(yD - y0);
      n++;
    }
  }
  const meanLuma = n ? sum / n : 128;
  const edgeDensity = n ? edgeSum / n : 20;
  return {
    meanLuma,
    edgeDensity,
    isLowContrast: edgeDensity < 18,
  };
}
