/**
 * engine-ops-style.ts — full-frame structure-aware artistic styles.
 * Entire image participates; not photo+edges or global color-only grades.
 */
import type { RGBAImage, ProcessingProfile } from '../shared/processing-types';
import { clamp8, applySaturationVibrance } from './engine-ops-basic';
import { applyPosterize, applyFade } from './engine-ops-basic-b';
import { applySoftBlur, applyContrastish, applyNeonStyle } from './engine-ops-extra';

function luminanceGray(src: Uint8ClampedArray, w: number, h: number): Float32Array {
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    gray[p] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
  }
  return gray;
}

function edgeMagnitude(gray: Float32Array, w: number, h: number): Float32Array {
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

function inkOutlines(
  data: Uint8ClampedArray,
  edgeMag: Float32Array,
  w: number,
  h: number,
  edgeThresh: number,
  inkFloor: number,
  strength: number,
) {
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const mag = edgeMag[p];
      if (mag > edgeThresh) {
        const i = p * 4;
        const ink = Math.max(0, inkFloor - (mag - edgeThresh) * 0.03);
        const k = Math.min(1, (mag - edgeThresh) / 48) * strength;
        data[i] = clamp8(data[i] * (1 - k) + ink * k);
        data[i + 1] = clamp8(data[i + 1] * (1 - k) + ink * k);
        data[i + 2] = clamp8(data[i + 2] * (1 - k) + ink * k);
      }
    }
  }
}

function adaptiveRegionQuantize(
  data: Uint8ClampedArray,
  edgeMag: Float32Array,
  levels: number,
  blendSmooth: number,
  blendEdge: number,
) {
  const step = 255 / Math.max(2, levels - 1);
  for (let p = 0, i = 0; p < edgeMag.length; p++, i += 4) {
    const e = edgeMag[p];
    const t = Math.min(1, e / 90);
    const blend = blendSmooth * (1 - t) + blendEdge * t;
    const keep = 1 - blend;
    for (let c = 0; c < 3; c++) {
      const orig = data[i + c];
      const q = Math.round(orig / step) * step;
      data[i + c] = clamp8(orig * keep + q * blend);
    }
  }
}

function structurePreserveSmooth(image: RGBAImage, edgeMag: Float32Array, baseBlur: number) {
  const data = image.data;
  const snap = new Uint8ClampedArray(data);
  applySoftBlur(image, baseBlur);
  for (let p = 0, i = 0; p < edgeMag.length; p++, i += 4) {
    const e = edgeMag[p];
    if (e > 32) {
      const k = Math.min(1, (e - 32) / 65);
      data[i] = clamp8(data[i] * (1 - k) + snap[i] * k);
      data[i + 1] = clamp8(data[i + 1] * (1 - k) + snap[i + 1] * k);
      data[i + 2] = clamp8(data[i + 2] * (1 - k) + snap[i + 2] * k);
    }
  }
}

function paperGrain(data: Uint8ClampedArray, amount: number, seed: number) {
  let s = (seed * 1103515245 + 12345) >>> 0;
  const a = amount * 0.01;
  for (let i = 0; i < data.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const n = ((s >>> 16) % 1000) / 1000 - 0.5;
    const g = n * a * 40;
    data[i] = clamp8(data[i] + g);
    data[i + 1] = clamp8(data[i + 1] + g);
    data[i + 2] = clamp8(data[i + 2] + g);
  }
}

export function applySketchStyle(image: RGBAImage, intensity: number) {
  const w = image.width;
  const h = image.height;
  const data = image.data;
  const t = Math.max(0.55, Math.min(1, intensity / 100));
  const gray = luminanceGray(data, w, h);
  const edges = edgeMagnitude(gray, w, h);
  const inv = new Float32Array(w * h);
  for (let p = 0; p < gray.length; p++) inv[p] = 255 - gray[p];
  let cur = inv;
  const passes = 4 + Math.round(t * 3);
  for (let pass = 0; pass < passes; pass++) {
    const next = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) s += cur[(y + dy) * w + (x + dx)];
        next[y * w + x] = s / 9;
      }
    }
    for (let x = 0; x < w; x++) {
      next[x] = cur[x];
      next[(h - 1) * w + x] = cur[(h - 1) * w + x];
    }
    for (let y = 0; y < h; y++) {
      next[y * w] = cur[y * w];
      next[y * w + w - 1] = cur[y * w + w - 1];
    }
    cur = next;
  }
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const denom = 255 - cur[p] + 1e-3;
    let v = (gray[p] * 255) / denom;
    if (v > 255) v = 255;
    const e = edges[p];
    const paper = 235 + (e < 12 ? 12 : 0);
    const g = Math.min(paper, v * (0.72 + 0.1 * (1 - t)) + (e < 15 ? 18 : 0));
    const out = clamp8(g);
    data[i] = out; data[i + 1] = out; data[i + 2] = out;
  }
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const mag = edges[p];
      const i = p * 4;
      if (mag > 48) {
        const k = Math.min(1, (mag - 48) / 38) * (0.82 + t * 0.18);
        data[i] = clamp8(data[i] * (1 - k));
        data[i + 1] = clamp8(data[i + 1] * (1 - k));
        data[i + 2] = clamp8(data[i + 2] * (1 - k));
      } else if (mag > 22) {
        const k = Math.min(1, (mag - 22) / 40) * (0.4 + t * 0.15);
        data[i] = clamp8(data[i] * (1 - k) + 35 * k);
        data[i + 1] = clamp8(data[i + 1] * (1 - k) + 35 * k);
        data[i + 2] = clamp8(data[i + 2] * (1 - k) + 35 * k);
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (gray[p] < 95) {
        const dens = (95 - gray[p]) / 95;
        const step = dens > 0.55 ? 3 : 4;
        if ((x + y) % step === 0 || (x - y + 2048) % (step + 1) === 0) {
          const i = p * 4;
          const k = (0.1 + dens * 0.22) * t;
          data[i] = clamp8(data[i] * (1 - k));
          data[i + 1] = clamp8(data[i + 1] * (1 - k));
          data[i + 2] = clamp8(data[i + 2] * (1 - k));
        }
      }
    }
  }
  paperGrain(data, 8 + t * 10, 42);
}

export function applyCartoonStyle(image: RGBAImage, intensity: number) {
  const w = image.width; const h = image.height; const data = image.data;
  const t = Math.max(0.5, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = luminanceGray(src, w, h);
  const edges = edgeMagnitude(gray, w, h);
  structurePreserveSmooth(image, edges, 14 + t * 18);
  adaptiveRegionQuantize(data, edges, 4 + Math.round(t), 0.72 + t * 0.12, 0.28 + t * 0.1);
  applySaturationVibrance(data, 18 + t * 16, 16 + t * 14);
  applyContrastish(data, 12 + t * 12);
  inkOutlines(data, edges, w, h, 32 - t * 6, 22, 0.62 + t * 0.22);
}

export function applyAnimeStyle(image: RGBAImage, intensity: number) {
  const w = image.width; const h = image.height; const data = image.data;
  const t = Math.max(0.45, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = luminanceGray(src, w, h);
  const edges = edgeMagnitude(gray, w, h);
  structurePreserveSmooth(image, edges, 12 + t * 16);
  adaptiveRegionQuantize(data, edges, 6, 0.58 + t * 0.14, 0.2 + t * 0.1);
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (y > 40 && y < 210) {
      const lift = (1 - Math.abs(y - 140) / 140) * (10 + t * 12);
      data[i] = clamp8(data[i] + lift * 1.06);
      data[i + 1] = clamp8(data[i + 1] + lift);
      data[i + 2] = clamp8(data[i + 2] + lift * 0.9);
    }
  }
  applySaturationVibrance(data, 16 + t * 18, 14 + t * 14);
  applyContrastish(data, 8 + t * 10);
  inkOutlines(data, edges, w, h, 40 - t * 5, 36, 0.42 + t * 0.18);
}

export function applyComicStyle(image: RGBAImage, intensity: number) {
  const w = image.width; const h = image.height; const data = image.data;
  const t = Math.max(0.5, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = luminanceGray(src, w, h);
  const edges = edgeMagnitude(gray, w, h);
  structurePreserveSmooth(image, edges, 7 + t * 8);
  adaptiveRegionQuantize(data, edges, 5, 0.58 + t * 0.12, 0.24 + t * 0.1);
  applySaturationVibrance(data, 16 + t * 16, 12 + t * 12);
  applyContrastish(data, 16 + t * 14);
  const dotPeriod = 5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const g = gray[p];
      if (g < 90 && edges[p] < 50) {
        const cx = x % dotPeriod; const cy = y % dotPeriod;
        const dist = Math.sqrt((cx - 2.5) ** 2 + (cy - 2.5) ** 2);
        if (dist < ((90 - g) / 90) * 1.8 * (0.55 + t * 0.4)) {
          const i = p * 4;
          data[i] = clamp8(data[i] * 0.68);
          data[i + 1] = clamp8(data[i + 1] * 0.68);
          data[i + 2] = clamp8(data[i + 2] * 0.68);
        }
      }
    }
  }
  inkOutlines(data, edges, w, h, 24 - t * 4, 2, 0.85 + t * 0.12);
  inkOutlines(data, edges, w, h, 46 - t * 4, 48, 0.32 + t * 0.12);
}

function applyOilPaintingStyle(image: RGBAImage, intensity: number) {
  const w = image.width; const h = image.height; const data = image.data;
  const t = Math.max(0.5, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = luminanceGray(src, w, h);
  const edges = edgeMagnitude(gray, w, h);
  structurePreserveSmooth(image, edges, 28 + t * 36);
  adaptiveRegionQuantize(data, edges, 7, 0.52 + t * 0.14, 0.16 + t * 0.08);
  const snap = new Uint8ClampedArray(data);
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const p = y * w + x;
      if (edges[p] < 40) {
        const i = p * 4;
        const j = ((y - 1) * w + (x + 1)) * 4;
        const k = 0.18 + t * 0.12;
        data[i] = clamp8(snap[i] * (1 - k) + snap[j] * k);
        data[i + 1] = clamp8(snap[i + 1] * (1 - k) + snap[j + 1] * k);
        data[i + 2] = clamp8(snap[i + 2] * (1 - k) + snap[j + 2] * k);
      }
    }
  }
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (y > 45 && y < 220) {
      data[i] = clamp8(data[i] + (8 + t * 10));
      data[i + 1] = clamp8(data[i + 1] + (5 + t * 6));
      data[i + 2] = clamp8(data[i + 2] - (1 + t * 2));
    }
  }
  applySaturationVibrance(data, 12 + t * 12, 12 + t * 10);
  applyContrastish(data, 8 + t * 8);
  inkOutlines(data, edges, w, h, 48 - t * 4, 55, 0.22 + t * 0.12);
}

export function applyRetro3dStyle(image: RGBAImage, intensity: number) {
  const w = image.width; const h = image.height; const data = image.data;
  const t = Math.max(0.5, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = luminanceGray(src, w, h);
  const edges = edgeMagnitude(gray, w, h);
  structurePreserveSmooth(image, edges, 8 + t * 10);
  adaptiveRegionQuantize(data, edges, 5, 0.55 + t * 0.12, 0.22 + t * 0.1);
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (y < 45) {
      data[i] = clamp8(data[i] * 0.75);
      data[i + 1] = clamp8(data[i + 1] * 0.78);
      data[i + 2] = clamp8(data[i + 2] * 0.85);
    }
    if (y > 50 && y < 190) {
      data[i] = clamp8(data[i] + (4 + t * 6));
      data[i + 1] = clamp8(data[i + 1] + (3 + t * 4));
      data[i + 2] = clamp8(data[i + 2] + (2 + t * 3));
    }
  }
  applyContrastish(data, 14 + t * 12);
  applySaturationVibrance(data, 10 + t * 12, 8 + t * 10);
  inkOutlines(data, edges, w, h, 38 - t * 4, 30, 0.35 + t * 0.15);
  const block = 2;
  if (t > 0.4) {
    for (let y = 0; y < h; y += block) {
      for (let x = 0; x < w; x += block) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = 0; dy < block && y + dy < h; dy++) {
          for (let dx = 0; dx < block && x + dx < w; dx++) {
            const i = ((y + dy) * w + (x + dx)) * 4;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
          }
        }
        if (!n) continue;
        r = (r / n) | 0; g = (g / n) | 0; b = (b / n) | 0;
        for (let dy = 0; dy < block && y + dy < h; dy++) {
          for (let dx = 0; dx < block && x + dx < w; dx++) {
            const i = ((y + dy) * w + (x + dx)) * 4;
            const k = 0.35 + t * 0.2;
            data[i] = clamp8(data[i] * (1 - k) + r * k);
            data[i + 1] = clamp8(data[i + 1] * (1 - k) + g * k);
            data[i + 2] = clamp8(data[i + 2] * (1 - k) + b * k);
          }
        }
      }
    }
  }
}

/** Full-frame illustrated cyberpunk — comic cells + cyan/magenta + halftone (not photo+vignette). */
export function applyCyberpunkStyle(image: RGBAImage, intensity: number) {
  const w = image.width; const h = image.height; const data = image.data;
  const t = Math.max(0.55, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = luminanceGray(src, w, h);
  const edges = edgeMagnitude(gray, w, h);
  structurePreserveSmooth(image, edges, 8 + t * 10);
  adaptiveRegionQuantize(data, edges, 5, 0.62 + t * 0.14, 0.24 + t * 0.1);
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const n = y / 255;
    let r: number, g: number, b: number;
    if (n < 0.35) {
      const u = n / 0.35;
      r = 18 + u * 40; g = 8 + u * 30; b = 40 + u * 90;
    } else if (n < 0.7) {
      const u = (n - 0.35) / 0.35;
      r = 40 + u * 80; g = 90 + u * 100; b = 140 + u * 80;
    } else {
      const u = (n - 0.7) / 0.3;
      r = 160 + u * 70; g = 120 + u * 90; b = 200 + u * 40;
    }
    const k = 0.55 + t * 0.2;
    data[i] = clamp8(data[i] * (1 - k) + r * k);
    data[i + 1] = clamp8(data[i + 1] * (1 - k) + g * k);
    data[i + 2] = clamp8(data[i + 2] * (1 - k) + b * k);
  }
  const period = 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const g0 = gray[p];
      if (g0 < 160 && edges[p] < 55) {
        const cx = x % period; const cy = y % period;
        const dist = Math.sqrt((cx - 1.5) ** 2 + (cy - 1.5) ** 2);
        const rad = ((160 - g0) / 160) * 1.6 * (0.5 + t * 0.45);
        if (dist < rad) {
          const i = p * 4;
          data[i] = clamp8(data[i] * 0.55 + 40);
          data[i + 1] = clamp8(data[i + 1] * 0.45);
          data[i + 2] = clamp8(data[i + 2] * 0.7 + 30);
        }
      }
    }
  }
  applyContrastish(data, 16 + t * 14);
  applySaturationVibrance(data, 18 + t * 16, 14 + t * 12);
  inkOutlines(data, edges, w, h, 26 - t * 4, 8, 0.72 + t * 0.18);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (edges[p] > 50) {
        const i = p * 4;
        const k = Math.min(0.35, (edges[p] - 50) / 80) * t;
        data[i] = clamp8(data[i] + 40 * k);
        data[i + 1] = clamp8(data[i + 1] + 20 * k);
        data[i + 2] = clamp8(data[i + 2] + 55 * k);
      }
    }
  }
}

export function applyStyle(image: RGBAImage, style: string | undefined, intensity: number) {
  if (!style || style === 'none') return;
  const t = Math.max(0, Math.min(100, intensity));
  if (style === 'sketch') applySketchStyle(image, t);
  else if (style === 'anime') applyAnimeStyle(image, t);
  else if (style === 'comic') applyComicStyle(image, t);
  else if (style === 'cartoon') applyCartoonStyle(image, t);
  else if (style === 'oil') applyOilPaintingStyle(image, t);
  else if (style === 'retro3d') applyRetro3dStyle(image, t);
  else if (style === 'cyberpunk') applyCyberpunkStyle(image, t);
  else if (style === 'watercolor') {
    applySoftBlur(image, 50 + t * 0.2);
    applySaturationVibrance(image.data, 20, 15);
    applyFade(image.data, 15);
  } else if (style === 'neon') {
    applyNeonStyle(image.data, 60 + t * 0.3);
    applyContrastish(image.data, 20);
  } else if (style === 'painting') {
    applyOilPaintingStyle(image, Math.min(100, 60 + t * 0.35));
  }
}

export function scaleProfile(profile: ProcessingProfile, intensity: number): ProcessingProfile {
  const t = Math.max(0, Math.min(100, intensity)) / 100;
  const s = (v?: number) => (v == null ? undefined : v * t);
  return {
    exposure: s(profile.exposure),
    brightness: s(profile.brightness),
    contrast: s(profile.contrast),
    highlights: s(profile.highlights),
    shadows: s(profile.shadows),
    temperature: s(profile.temperature),
    tint: s(profile.tint),
    saturation: s(profile.saturation),
    vibrance: s(profile.vibrance),
    gamma: profile.gamma,
    monochrome: profile.monochrome,
    sepia: s(profile.sepia),
    fade: s(profile.fade),
    grain: s(profile.grain),
    vignette: s(profile.vignette),
    vignetteFeather: profile.vignetteFeather,
    sharpening: s(profile.sharpening),
    clarity: s(profile.clarity),
    bloom: s(profile.bloom),
    blur: s(profile.blur),
    denoise: s(profile.denoise),
    microcontrast: s(profile.microcontrast),
    dynamicRange: s(profile.dynamicRange),
    starSeparation: s(profile.starSeparation),
    atmosphere: s(profile.atmosphere),
    splitToning: profile.splitToning,
    toneCurve: profile.toneCurve,
    channelAdjustments: profile.channelAdjustments,
    posterizeLevels: profile.posterizeLevels,
    edgeAmount: s(profile.edgeAmount),
    pixelSize: profile.pixelSize,
    softBlur: s(profile.softBlur),
    duotone: profile.duotone,
    style: profile.style,
  };
}
