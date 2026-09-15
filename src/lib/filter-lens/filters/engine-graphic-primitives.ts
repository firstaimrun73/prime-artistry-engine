/**
 * engine-graphic-primitives.ts
 * Reusable GRAPHIC rendering stages (not photo grades).
 * Used by AI+ / Premium style recipes — each filter composes its own pipeline.
 */
import type { RGBAImage } from '../shared/processing-types';
import { clamp8 } from './engine-ops-basic';
import { applySoftBlur } from './engine-ops-extra';

export function grayLuma(src: Uint8ClampedArray, w: number, h: number): Float32Array {
  const g = new Float32Array(w * h);
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    g[p] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
  }
  return g;
}

/** Structural edge magnitude (Sobel). */
export function extractEdges(gray: Float32Array, w: number, h: number): Float32Array {
  const mag = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const gx =
        -gray[p - w - 1] - 2 * gray[p - 1] - gray[p + w - 1] +
         gray[p - w + 1] + 2 * gray[p + 1] + gray[p + w + 1];
      const gy =
        -gray[p - w - 1] - 2 * gray[p - w] - gray[p - w + 1] +
         gray[p + w - 1] + 2 * gray[p + w] + gray[p + w + 1];
      mag[p] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return mag;
}

/** Ink / contour lines on meaningful structure only. */
export function applyInkContours(
  data: Uint8ClampedArray,
  edges: Float32Array,
  w: number,
  h: number,
  opts: { threshold: number; strength: number; ink: number; secondary?: number },
) {
  const { threshold, strength, ink } = opts;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const m = edges[p];
      if (m <= threshold) continue;
      const i = p * 4;
      const k = Math.min(1, (m - threshold) / 50) * strength;
      data[i] = clamp8(data[i] * (1 - k) + ink * k);
      data[i + 1] = clamp8(data[i + 1] * (1 - k) + ink * k);
      data[i + 2] = clamp8(data[i + 2] * (1 - k) + ink * k);
    }
  }
  if (opts.secondary != null) {
    applyInkContours(data, edges, w, h, {
      threshold: opts.secondary,
      strength: strength * 0.35,
      ink: Math.min(255, ink + 40),
    });
  }
}

/** Quantize color cells; stronger on low-edge (smooth) regions. */
export function applyColorCells(
  data: Uint8ClampedArray,
  edges: Float32Array,
  levels: number,
  blendSmooth: number,
  blendEdge: number,
) {
  const step = 255 / Math.max(2, levels - 1);
  for (let p = 0, i = 0; p < edges.length; p++, i += 4) {
    const t = Math.min(1, edges[p] / 90);
    const blend = blendSmooth * (1 - t) + blendEdge * t;
    const keep = 1 - blend;
    for (let c = 0; c < 3; c++) {
      const o = data[i + c];
      const q = Math.round(o / step) * step;
      data[i + c] = clamp8(o * keep + q * blend);
    }
  }
}

/** Cel shading: discrete luminance bands. */
export function applyCelBands(
  data: Uint8ClampedArray,
  bands: number,
  hardness: number,
) {
  const n = Math.max(2, Math.min(8, bands | 0));
  const step = 255 / (n - 1);
  const h = Math.max(0.2, Math.min(1, hardness));
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const q = Math.round(y / step) * step;
    const scale = (q + 1e-3) / (y + 1e-3);
    const k = h;
    for (let c = 0; c < 3; c++) {
      data[i + c] = clamp8(data[i + c] * (1 - k) + data[i + c] * scale * k);
    }
  }
}

/** True luminance-responsive halftone dots (not grain). */
export function applyHalftone(
  data: Uint8ClampedArray,
  gray: Float32Array,
  edges: Float32Array,
  w: number,
  h: number,
  opts: { period: number; maxLum: number; density: number; inkBoost?: number },
) {
  const period = Math.max(2, opts.period | 0);
  const maxLum = opts.maxLum;
  const dens = opts.density;
  const boost = opts.inkBoost ?? 0.65;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const g = gray[p];
      if (g >= maxLum || edges[p] > 55) continue;
      const cx = x % period;
      const cy = y % period;
      const dist = Math.sqrt((cx - period / 2) ** 2 + (cy - period / 2) ** 2);
      const rad = ((maxLum - g) / maxLum) * (period * 0.45) * dens;
      if (dist < rad) {
        const i = p * 4;
        data[i] = clamp8(data[i] * boost);
        data[i + 1] = clamp8(data[i + 1] * boost);
        data[i + 2] = clamp8(data[i + 2] * boost);
      }
    }
  }
}

/** Structure-preserving smooth (blur flats, keep edges). */
export function structureSmooth(image: RGBAImage, edges: Float32Array, blurAmount: number) {
  const data = image.data;
  const snap = new Uint8ClampedArray(data);
  applySoftBlur(image, blurAmount);
  for (let p = 0, i = 0; p < edges.length; p++, i += 4) {
    if (edges[p] > 32) {
      const k = Math.min(1, (edges[p] - 32) / 65);
      data[i] = clamp8(data[i] * (1 - k) + snap[i] * k);
      data[i + 1] = clamp8(data[i + 1] * (1 - k) + snap[i + 1] * k);
      data[i + 2] = clamp8(data[i + 2] * (1 - k) + snap[i + 2] * k);
    }
  }
}

/** Directional cross-hatch in shadow tones. */
export function applyCrossHatch(
  data: Uint8ClampedArray,
  gray: Float32Array,
  w: number,
  h: number,
  opts: { maxLum: number; density: number; strength: number },
) {
  const { maxLum, density, strength } = opts;
  const step = density > 0.6 ? 3 : density > 0.35 ? 4 : 5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (gray[p] >= maxLum) continue;
      const dens = (maxLum - gray[p]) / maxLum;
      if ((x + y) % step === 0 || (x - y + 4096) % (step + 1) === 0) {
        const i = p * 4;
        const k = dens * strength;
        data[i] = clamp8(data[i] * (1 - k));
        data[i + 1] = clamp8(data[i + 1] * (1 - k));
        data[i + 2] = clamp8(data[i + 2] * (1 - k));
      }
    }
  }
}

/** Localized neon rim on strong edges only. */
export function applyNeonRim(
  data: Uint8ClampedArray,
  edges: Float32Array,
  w: number,
  h: number,
  opts: { threshold: number; strength: number; rgb: [number, number, number] },
) {
  const [nr, ng, nb] = opts.rgb;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (edges[p] <= opts.threshold) continue;
      const i = p * 4;
      const k = Math.min(1, (edges[p] - opts.threshold) / 70) * opts.strength;
      data[i] = clamp8(data[i] * (1 - k) + nr * k);
      data[i + 1] = clamp8(data[i + 1] * (1 - k) + ng * k);
      data[i + 2] = clamp8(data[i + 2] * (1 - k) + nb * k);
    }
  }
}

/** Directional paint smear on low-edge regions (painterly). */
export function applyPaintSmear(
  data: Uint8ClampedArray,
  edges: Float32Array,
  w: number,
  h: number,
  strength: number,
) {
  const snap = new Uint8ClampedArray(data);
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const p = y * w + x;
      if (edges[p] >= 42) continue;
      const i = p * 4;
      const j = ((y - 1) * w + (x + 1)) * 4;
      const k = strength;
      data[i] = clamp8(snap[i] * (1 - k) + snap[j] * k);
      data[i + 1] = clamp8(snap[i + 1] * (1 - k) + snap[j + 1] * k);
      data[i + 2] = clamp8(snap[i + 2] * (1 - k) + snap[j + 2] * k);
    }
  }
}

/** Palette remap by luminance to fixed RGB anchors (graphic identity). */
export function applyLumaPalette(
  data: Uint8ClampedArray,
  stops: { at: number; rgb: [number, number, number] }[],
  blend: number,
) {
  const sorted = [...stops].sort((a, b) => a.at - b.at);
  for (let i = 0; i < data.length; i += 4) {
    const y = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    let r = sorted[0].rgb[0], g = sorted[0].rgb[1], b = sorted[0].rgb[2];
    for (let s = 0; s < sorted.length - 1; s++) {
      const a = sorted[s], c = sorted[s + 1];
      if (y >= a.at && y <= c.at) {
        const u = (y - a.at) / Math.max(1e-6, c.at - a.at);
        r = a.rgb[0] + (c.rgb[0] - a.rgb[0]) * u;
        g = a.rgb[1] + (c.rgb[1] - a.rgb[1]) * u;
        b = a.rgb[2] + (c.rgb[2] - a.rgb[2]) * u;
        break;
      }
      if (y > c.at) {
        r = c.rgb[0]; g = c.rgb[1]; b = c.rgb[2];
      }
    }
    data[i] = clamp8(data[i] * (1 - blend) + r * blend);
    data[i + 1] = clamp8(data[i + 1] * (1 - blend) + g * blend);
    data[i + 2] = clamp8(data[i + 2] * (1 - blend) + b * blend);
  }
}
