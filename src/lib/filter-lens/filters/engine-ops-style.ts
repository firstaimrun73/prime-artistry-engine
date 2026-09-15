/**
 * engine-ops-style.ts — filter-specific GRAPHIC recipes.
 * Each style composes primitives differently (not photo grade + stronger numbers).
 */
import type { RGBAImage, ProcessingProfile } from '../shared/processing-types';
import { clamp8, applySaturationVibrance } from './engine-ops-basic';
import { applyFade } from './engine-ops-basic-b';
import { applySoftBlur, applyContrastish, applyNeonStyle } from './engine-ops-extra';
import {
  grayLuma,
  extractEdges,
  applyInkContours,
  applyColorCells,
  applyCelBands,
  applyHalftone,
  structureSmooth,
  applyCrossHatch,
  applyNeonRim,
  applyPaintSmear,
  applyLumaPalette,
} from './engine-graphic-primitives';

/** Sketch: graphite tonal field + stroke hierarchy + cross-hatch */
export function applySketchStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.55, Math.min(1, intensity / 100));
  const gray = grayLuma(data, w, h);
  const edges = extractEdges(gray, w, h);

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
    for (let x = 0; x < w; x++) { next[x] = cur[x]; next[(h - 1) * w + x] = cur[(h - 1) * w + x]; }
    for (let y = 0; y < h; y++) { next[y * w] = cur[y * w]; next[y * w + w - 1] = cur[y * w + w - 1]; }
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
  applyInkContours(data, edges, w, h, { threshold: 42 - t * 6, strength: 0.7 + t * 0.2, ink: 12, secondary: 22 });
  applyCrossHatch(data, gray, w, h, { maxLum: 120, density: 0.5 + t * 0.35, strength: 0.22 + t * 0.18 });
}

/** Cartoon: color cells + cel bands + contours */
export function applyCartoonStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.5, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = grayLuma(src, w, h);
  const edges = extractEdges(gray, w, h);
  structureSmooth(image, edges, 16 + t * 20, 0.22);
  applyColorCells(data, edges, 4 + Math.round(t), 0.78 + t * 0.1, 0.48 + t * 0.12);
  applyCelBands(data, 4, 0.55 + t * 0.2);
  applySaturationVibrance(data, 18 + t * 16, 16 + t * 14);
  applyContrastish(data, 12 + t * 12);
  applyInkContours(data, edges, w, h, { threshold: 32 - t * 6, strength: 0.62 + t * 0.22, ink: 22 });
}

/** Anime: soft cells + luminous midtones + thin clean contours */
export function applyAnimeStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.45, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = grayLuma(src, w, h);
  const edges = extractEdges(gray, w, h);
  structureSmooth(image, edges, 12 + t * 16, 0.25);
  applyColorCells(data, edges, 6, 0.65 + t * 0.12, 0.35 + t * 0.1);
  applyCelBands(data, 5, 0.4 + t * 0.15);
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
  applyInkContours(data, edges, w, h, { threshold: 40 - t * 5, strength: 0.42 + t * 0.18, ink: 36 });
}

/** Comic: cells + cel + haltone + dual ink */
export function applyComicStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.5, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = grayLuma(src, w, h);
  const edges = extractEdges(gray, w, h);
  structureSmooth(image, edges, 7 + t * 8, 0.2);
  applyColorCells(data, edges, 5, 0.65 + t * 0.12, 0.4 + t * 0.1);
  applyCelBands(data, 4, 0.5 + t * 0.2);
  applySaturationVibrance(data, 16 + t * 16, 12 + t * 12);
  applyContrastish(data, 16 + t * 14);
  applyHalftone(data, gray, edges, w, h, { period: 5, maxLum: 95, density: 0.55 + t * 0.4, inkBoost: 0.68 });
  applyInkContours(data, edges, w, h, { threshold: 24 - t * 4, strength: 0.85 + t * 0.12, ink: 4, secondary: 46 });
}

/** Oil: full-frame paint including face */
function applyOilPaintingStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.55, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = grayLuma(src, w, h);
  const edges = extractEdges(gray, w, h);
  structureSmooth(image, edges, 34 + t * 40, 0.18);
  applyColorCells(data, edges, 6, 0.7 + t * 0.12, 0.45 + t * 0.15);
  applyPaintSmear(data, edges, w, h, 0.32 + t * 0.18);
  applyPaintSmear(data, edges, w, h, 0.22 + t * 0.12);
  applyPaintSmear(data, edges, w, h, 0.14 + t * 0.08);
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (y > 45 && y < 220) {
      data[i] = clamp8(data[i] + (8 + t * 10));
      data[i + 1] = clamp8(data[i + 1] + (5 + t * 6));
      data[i + 2] = clamp8(data[i + 2] - (1 + t * 2));
    }
  }
  applySaturationVibrance(data, 12 + t * 12, 12 + t * 10);
  applyInkContours(data, edges, w, h, { threshold: 48 - t * 4, strength: 0.22 + t * 0.12, ink: 55 });
}

function applyGhibliStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.55, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = grayLuma(src, w, h);
  const edges = extractEdges(gray, w, h);
  structureSmooth(image, edges, 36 + t * 42, 0.12);
  applyColorCells(data, edges, 7, 0.65 + t * 0.12, 0.4 + t * 0.12);
  applyPaintSmear(data, edges, w, h, 0.22 + t * 0.14);
  applyPaintSmear(data, edges, w, h, 0.16 + t * 0.1);
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const n = y / 255;
    if (n > 0.65 && edges[(i / 4) | 0] < 25) {
      data[i] = clamp8(data[i] * 0.92 + 40 * t);
      data[i + 1] = clamp8(data[i + 1] * 0.95 + 55 * t);
      data[i + 2] = clamp8(data[i + 2] * 0.98 + 70 * t);
    }
    if (n > 0.25 && n < 0.75) {
      data[i] = clamp8(data[i] + (6 + t * 8));
      data[i + 1] = clamp8(data[i + 1] + (8 + t * 10));
      data[i + 2] = clamp8(data[i + 2] - (1 + t * 2));
    }
  }
  applySaturationVibrance(data, 8 + t * 10, 10 + t * 10);
  applyInkContours(data, edges, w, h, { threshold: 52 - t * 4, strength: 0.16 + t * 0.1, ink: 70 });
}

export function applyRetro3dStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.5, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = grayLuma(src, w, h);
  const edges = extractEdges(gray, w, h);
  structureSmooth(image, edges, 10 + t * 12, 0.2);
  applyColorCells(data, edges, 5, 0.65 + t * 0.12, 0.4 + t * 0.1);
  applyCelBands(data, 4, 0.45 + t * 0.2);
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (y < 45) {
      data[i] = clamp8(data[i] * 0.75);
      data[i + 1] = clamp8(data[i + 1] * 0.78);
      data[i + 2] = clamp8(data[i + 2] * 0.85);
    }
  }
  applyContrastish(data, 14 + t * 12);
  applyInkContours(data, edges, w, h, { threshold: 38 - t * 4, strength: 0.35 + t * 0.15, ink: 30 });
  const block = 2;
  if (t > 0.4) {
    for (let y = 0; y < h; y += block) {
      for (let x = 0; x < w; x += block) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = 0; dy < block && y + dy < h; dy++)
          for (let dx = 0; dx < block && x + dx < w; dx++) {
            const i = ((y + dy) * w + (x + dx)) * 4;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
          }
        if (!n) continue;
        r = (r / n) | 0; g = (g / n) | 0; b = (b / n) | 0;
        const k = 0.35 + t * 0.2;
        for (let dy = 0; dy < block && y + dy < h; dy++)
          for (let dx = 0; dx < block && x + dx < w; dx++) {
            const i = ((y + dy) * w + (x + dx)) * 4;
            data[i] = clamp8(data[i] * (1 - k) + r * k);
            data[i + 1] = clamp8(data[i + 1] * (1 - k) + g * k);
            data[i + 2] = clamp8(data[i + 2] * (1 - k) + b * k);
          }
      }
    }
  }
}

export function applyCyberpunkStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.55, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = grayLuma(src, w, h);
  const edges = extractEdges(gray, w, h);
  structureSmooth(image, edges, 10 + t * 12, 0.2);
  applyColorCells(data, edges, 5, 0.72 + t * 0.12, 0.5 + t * 0.12);
  applyCelBands(data, 4, 0.55 + t * 0.2);
  applyLumaPalette(data, [
    { at: 0, rgb: [18, 8, 40] },
    { at: 0.35, rgb: [40, 30, 120] },
    { at: 0.55, rgb: [30, 140, 180] },
    { at: 0.75, rgb: [160, 80, 200] },
    { at: 1, rgb: [230, 200, 255] },
  ], 0.55 + t * 0.2);
  applyHalftone(data, gray, edges, w, h, { period: 4, maxLum: 160, density: 0.5 + t * 0.45, inkBoost: 0.55 });
  applyContrastish(data, 16 + t * 14);
  applySaturationVibrance(data, 18 + t * 16, 14 + t * 12);
  applyInkContours(data, edges, w, h, { threshold: 26 - t * 4, strength: 0.72 + t * 0.18, ink: 8 });
  applyNeonRim(data, edges, w, h, { threshold: 50, strength: 0.35 * t, rgb: [80, 40, 220] });
}

function applyFlatVectorStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.5, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = grayLuma(src, w, h);
  const edges = extractEdges(gray, w, h);
  structureSmooth(image, edges, 10 + t * 12, 0.15);
  applyColorCells(data, edges, 3 + Math.round(t), 0.85 + t * 0.1, 0.5 + t * 0.15);
  applyCelBands(data, 3, 0.75 + t * 0.2);
  applyInkContours(data, edges, w, h, { threshold: 28 - t * 4, strength: 0.7 + t * 0.2, ink: 15 });
}

function applyWatercolorStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.55, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = grayLuma(src, w, h);
  const edges = extractEdges(gray, w, h);
  structureSmooth(image, edges, 36 + t * 42, 0.08);
  applyColorCells(data, edges, 8, 0.62 + t * 0.14, 0.38 + t * 0.12);
  applyPaintSmear(data, edges, w, h, 0.28 + t * 0.16);
  const snap = new Uint8ClampedArray(data);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (edges[p] < 90) {
        const i = p * 4;
        const j = ((y + 1) * w + (x + (y % 2))) * 4;
        const k = (0.2 + t * 0.18) * (edges[p] < 40 ? 1 : 0.55);
        data[i] = clamp8(snap[i] * (1 - k) + snap[j] * k);
        data[i + 1] = clamp8(snap[i + 1] * (1 - k) + snap[j + 1] * k);
        data[i + 2] = clamp8(snap[i + 2] * (1 - k) + snap[j + 2] * k);
      }
    }
  }
  applySaturationVibrance(data, 10 + t * 10, 10 + t * 8);
  applyFade(data, 12 + t * 12);
}

export function applyStyle(image: RGBAImage, style: string | undefined, intensity: number) {
  if (!style || style === 'none') return;
  const t = Math.max(0, Math.min(100, intensity));
  if (style === 'sketch') applySketchStyle(image, t);
  else if (style === 'anime') applyAnimeStyle(image, t);
  else if (style === 'comic') applyComicStyle(image, t);
  else if (style === 'cartoon') applyCartoonStyle(image, t);
  else if (style === 'oil') applyOilPaintingStyle(image, t);
  else if (style === 'ghibli') applyGhibliStyle(image, t);
  else if (style === 'retro3d') applyRetro3dStyle(image, t);
  else if (style === 'cyberpunk') applyCyberpunkStyle(image, t);
  else if (style === 'flatvector') applyFlatVectorStyle(image, t);
  else if (style === 'watercolor') applyWatercolorStyle(image, t);
  else if (style === 'neon') {
    const w = image.width, h = image.height;
    const src = new Uint8ClampedArray(image.data);
    const gray = grayLuma(src, w, h);
    const edges = extractEdges(gray, w, h);
    applyNeonStyle(image.data, 60 + t * 0.3);
    applyContrastish(image.data, 20);
    applyNeonRim(image.data, edges, w, h, { threshold: 40, strength: 0.25 + t * 0.002, rgb: [255, 40, 180] });
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
