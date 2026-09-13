/**
 * engine-ops-basic.ts — core grading ops
 */
import type { RGBAImage } from '../shared/processing-types';

export function cloneImage(image: RGBAImage): RGBAImage {
  return { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
}

export function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bilinear downscale for preview only — never used as Apply/Download source. */
export function downscale(image: RGBAImage, maxDimension: number): RGBAImage {
  const long = Math.max(image.width, image.height);
  if (long <= maxDimension) return cloneImage(image);
  const scale = maxDimension / long;
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));
  const out = new Uint8ClampedArray(w * h * 4);
  const xRatio = (image.width - 1) / Math.max(1, w - 1);
  const yRatio = (image.height - 1) / Math.max(1, h - 1);
  for (let y = 0; y < h; y++) {
    const sy = y * yRatio;
    const y0 = Math.floor(sy);
    const y1 = Math.min(image.height - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < w; x++) {
      const sx = x * xRatio;
      const x0 = Math.floor(sx);
      const x1 = Math.min(image.width - 1, x0 + 1);
      const fx = sx - x0;
      const i00 = (y0 * image.width + x0) * 4;
      const i10 = (y0 * image.width + x1) * 4;
      const i01 = (y1 * image.width + x0) * 4;
      const i11 = (y1 * image.width + x1) * 4;
      const di = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        const v0 = image.data[i00 + c] * (1 - fx) + image.data[i10 + c] * fx;
        const v1 = image.data[i01 + c] * (1 - fx) + image.data[i11 + c] * fx;
        out[di + c] = (v0 * (1 - fy) + v1 * fy + 0.5) | 0;
      }
    }
  }
  return { width: w, height: h, data: out };
}

export function applyExposureContrast(data: Uint8ClampedArray, exposure: number, contrast: number, brightness: number) {
  const exp = Math.pow(2, exposure / 50);
  const c = 1 + contrast / 100;
  const b = brightness * 2.55;
  for (let i = 0; i < data.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      let v = data[i + ch] * exp + b;
      v = (v - 128) * c + 128;
      data[i + ch] = clamp8(v);
    }
  }
}

export function applyHighlightsShadows(data: Uint8ClampedArray, highlights: number, shadows: number) {
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const shadowW = 1 - Math.min(1, l / 128);
    const highW = Math.min(1, Math.max(0, (l - 128) / 127));
    const adj = shadows * 0.4 * shadowW + highlights * 0.4 * highW;
    for (let ch = 0; ch < 3; ch++) data[i + ch] = clamp8(data[i + ch] + adj);
  }
}

export function applyTemperatureTint(data: Uint8ClampedArray, temperature: number, tint: number) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp8(data[i] + temperature * 0.72);
    data[i + 1] = clamp8(data[i + 1] + tint * 0.48);
    data[i + 2] = clamp8(data[i + 2] - temperature * 0.72);
  }
}

export function applySaturationVibrance(data: Uint8ClampedArray, saturation: number, vibrance: number) {
  const s = 1 + saturation / 100;
  const v = vibrance / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
    const sat = maxc === minc ? 0 : 1 - minc / (maxc + 1e-6);
    const boost = s + v * (1 - sat);
    data[i] = clamp8(l + (r - l) * boost);
    data[i + 1] = clamp8(l + (g - l) * boost);
    data[i + 2] = clamp8(l + (b - l) * boost);
  }
}

export function applyMonochromeSepia(data: Uint8ClampedArray, mono: boolean, sepia: number) {
  const t = Math.min(1, Math.max(0, sepia / 100));
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (mono) {
      data[i] = clamp8(g);
      data[i + 1] = clamp8(g);
      data[i + 2] = clamp8(g);
    } else if (t > 0) {
      const sr = g * 1.07 + 20 * t;
      const sg = g * 0.96 + 10 * t;
      const sb = g * 0.78;
      data[i] = clamp8(data[i] * (1 - t) + sr * t);
      data[i + 1] = clamp8(data[i + 1] * (1 - t) + sg * t);
      data[i + 2] = clamp8(data[i + 2] * (1 - t) + sb * t);
    }
  }
}

export function applySplitToning(
  data: Uint8ClampedArray,
  settings: { shadowsHue: number; shadowsSaturation: number; highlightsHue: number; highlightsSaturation: number; balance: number },
) {
  const sh = ((settings.shadowsHue % 360) * Math.PI) / 180;
  const hh = ((settings.highlightsHue % 360) * Math.PI) / 180;
  const ss = settings.shadowsSaturation / 100;
  const hs = settings.highlightsSaturation / 100;
  const bal = settings.balance / 100;
  for (let i = 0; i < data.length; i += 4) {
    const l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    const shadowW = Math.max(0, 1 - l * 2 + bal);
    const highW = Math.max(0, l * 2 - 1 - bal);
    const sr = Math.cos(sh) * ss * shadowW * 78;
    const sg = Math.cos(sh + 2.094) * ss * shadowW * 78;
    const sb = Math.cos(sh + 4.188) * ss * shadowW * 78;
    const hr = Math.cos(hh) * hs * highW * 78;
    const hg = Math.cos(hh + 2.094) * hs * highW * 78;
    const hb = Math.cos(hh + 4.188) * hs * highW * 78;
    data[i] = clamp8(data[i] + sr + hr);
    data[i + 1] = clamp8(data[i + 1] + sg + hg);
    data[i + 2] = clamp8(data[i + 2] + sb + hb);
  }
}
