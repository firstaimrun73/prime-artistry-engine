/**
 * engine-ops-style.ts — filter-specific GRAPHIC recipes.
 * Oil / Watercolor / Cartoon use established NPR algorithms (not photo grades).
 */
import type { RGBAImage, ProcessingProfile } from '../shared/processing-types';
import { clamp8, applySaturationVibrance } from './engine-ops-basic';
import { applyFade } from './engine-ops-basic-b';
import { applyContrastish, applyNeonStyle } from './engine-ops-extra';
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
import {
  oilPaintFilter,
  bilateralApprox,
  adaptiveEdgeMask,
  applyEdgeMaskInk,
  watercolorEdgeDarken,
  softQuantize,
  grayFromImage,
  boxBlur,
} from './engine-npr-core';

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

/**
 * Cartoon — OpenCV-style pipeline:
 * bilateral smooth → color quantize → adaptive edge mask → ink composite
 */
export function applyCartoonStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.5, Math.min(1, intensity / 100));

  // Edge-preserving color simplification (bilateral role)
  bilateralApprox(image, 3 + Math.round(t * 2), 28 + t * 30, 2 + Math.round(t));
  softQuantize(data, 5 + Math.round(t * 2), 0.75 + t * 0.15);
  applyCelBands(data, 4, 0.45 + t * 0.2);
  applySaturationVibrance(data, 12 + t * 14, 10 + t * 12);

  const gray = grayFromImage(data, w, h);
  const mask = adaptiveEdgeMask(gray, w, h, 9, 6 + t * 4);
  applyEdgeMaskInk(data, mask, 0.75 + t * 0.2);
}

/** Anime: softer bilateral + thinner edges */
export function applyAnimeStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.45, Math.min(1, intensity / 100));
  bilateralApprox(image, 3 + Math.round(t), 35 + t * 25, 2);
  softQuantize(data, 7, 0.55 + t * 0.2);
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (y > 40 && y < 210) {
      const lift = (1 - Math.abs(y - 140) / 140) * (8 + t * 10);
      data[i] = clamp8(data[i] + lift * 1.05);
      data[i + 1] = clamp8(data[i + 1] + lift);
      data[i + 2] = clamp8(data[i + 2] + lift * 0.9);
    }
  }
  applySaturationVibrance(data, 14 + t * 16, 12 + t * 12);
  const gray = grayFromImage(data, w, h);
  const mask = adaptiveEdgeMask(gray, w, h, 11, 8 + t * 3);
  applyEdgeMaskInk(data, mask, 0.45 + t * 0.2);
}

/** Comic: cartoon base + halftone in shadows */
export function applyComicStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.5, Math.min(1, intensity / 100));
  const srcGray = grayLuma(new Uint8ClampedArray(data), w, h);
  bilateralApprox(image, 2 + Math.round(t), 30 + t * 20, 2);
  softQuantize(data, 5, 0.7 + t * 0.15);
  applyCelBands(data, 4, 0.5 + t * 0.2);
  applySaturationVibrance(data, 14 + t * 14, 10 + t * 12);
  applyContrastish(data, 12 + t * 12);
  const edges = extractEdges(srcGray, w, h);
  applyHalftone(data, srcGray, edges, w, h, { period: 5, maxLum: 95, density: 0.55 + t * 0.35, inkBoost: 0.7 });
  const gray = grayFromImage(data, w, h);
  const mask = adaptiveEdgeMask(gray, w, h, 9, 5 + t * 3);
  applyEdgeMaskInk(data, mask, 0.85 + t * 0.12);
}

/**
 * Oil painting — classic intensity-bin oil filter (full frame including face).
 * Ref: oil-paint radius + intensity levels NPR algorithm.
 */
function applyOilPaintingStyle(image: RGBAImage, intensity: number) {
  const t = Math.max(0.55, Math.min(1, intensity / 100));
  const radius = 3 + Math.round(t * 3); // 3–6
  const levels = 12 + Math.round(t * 12); // 12–24
  oilPaintFilter(image, radius, levels);
  // Mild second pass at smaller radius for finer strokes
  oilPaintFilter(image, Math.max(2, radius - 1), levels + 4);
  applySaturationVibrance(image.data, 6 + t * 8, 6 + t * 6);
  applyContrastish(image.data, 4 + t * 6);
}

/** Storybook paint (original) — oil core + soft atmosphere */
function applyGhibliStyle(image: RGBAImage, intensity: number) {
  const t = Math.max(0.55, Math.min(1, intensity / 100));
  oilPaintFilter(image, 4 + Math.round(t * 2), 16 + Math.round(t * 8));
  bilateralApprox(image, 2, 40, 1);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (y > 50 && y < 210) {
      data[i] = clamp8(data[i] + (5 + t * 6));
      data[i + 1] = clamp8(data[i + 1] + (6 + t * 7));
      data[i + 2] = clamp8(data[i + 2] - (1 + t));
    }
  }
  applySaturationVibrance(data, 6 + t * 8, 8 + t * 8);
}

export function applyRetro3dStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.5, Math.min(1, intensity / 100));
  bilateralApprox(image, 2 + Math.round(t), 25 + t * 20, 2);
  softQuantize(data, 5, 0.7 + t * 0.15);
  applyCelBands(data, 4, 0.5 + t * 0.2);
  applyContrastish(data, 12 + t * 10);
  const gray = grayFromImage(data, w, h);
  const mask = adaptiveEdgeMask(gray, w, h, 9, 7 + t * 3);
  applyEdgeMaskInk(data, mask, 0.4 + t * 0.2);
  // Mild block materials
  const block = 2;
  if (t > 0.35) {
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
        const k = 0.3 + t * 0.2;
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
  bilateralApprox(image, 2 + Math.round(t), 28 + t * 22, 2);
  softQuantize(data, 5, 0.72 + t * 0.15);
  applyCelBands(data, 4, 0.55 + t * 0.2);
  applyLumaPalette(data, [
    { at: 0, rgb: [18, 8, 40] },
    { at: 0.35, rgb: [40, 30, 120] },
    { at: 0.55, rgb: [30, 140, 180] },
    { at: 0.75, rgb: [160, 80, 200] },
    { at: 1, rgb: [230, 200, 255] },
  ], 0.55 + t * 0.2);
  const gray0 = grayLuma(new Uint8ClampedArray(data), w, h);
  const edges = extractEdges(gray0, w, h);
  applyHalftone(data, gray0, edges, w, h, { period: 4, maxLum: 160, density: 0.5 + t * 0.4, inkBoost: 0.55 });
  applyContrastish(data, 14 + t * 12);
  const gray = grayFromImage(data, w, h);
  const mask = adaptiveEdgeMask(gray, w, h, 9, 5 + t * 3);
  applyEdgeMaskInk(data, mask, 0.7 + t * 0.2);
  applyNeonRim(data, edges, w, h, { threshold: 45, strength: 0.3 * t, rgb: [90, 40, 230] });
}

function applyFlatVectorStyle(image: RGBAImage, intensity: number) {
  const t = Math.max(0.5, Math.min(1, intensity / 100));
  bilateralApprox(image, 2, 30, 2);
  softQuantize(image.data, 3 + Math.round(t), 0.9);
  applyCelBands(image.data, 3, 0.8);
  const gray = grayFromImage(image.data, image.width, image.height);
  const mask = adaptiveEdgeMask(gray, image.width, image.height, 9, 5);
  applyEdgeMaskInk(image.data, mask, 0.8 + t * 0.15);
}

/**
 * Watercolor — wash + edge darkening + soft quantize.
 * Ref: watercolor NPR (pigment migration to edges, soft washes).
 */
function applyWatercolorStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.55, Math.min(1, intensity / 100));

  // Wet wash base
  bilateralApprox(image, 4 + Math.round(t * 2), 45 + t * 30, 2 + Math.round(t));
  // Extra soft diffusion
  const blurred = boxBlur(data, w, h, 2 + Math.round(t * 2));
  for (let i = 0; i < data.length; i += 4) {
    const k = 0.35 + t * 0.25;
    data[i] = clamp8(data[i] * (1 - k) + blurred[i] * k);
    data[i + 1] = clamp8(data[i + 1] * (1 - k) + blurred[i + 1] * k);
    data[i + 2] = clamp8(data[i + 2] * (1 - k) + blurred[i + 2] * k);
  }
  softQuantize(data, 8, 0.45 + t * 0.2);

  const gray = grayFromImage(data, w, h);
  const edges = extractEdges(gray, w, h);
  // Pigment edge darkening (key watercolor cue)
  watercolorEdgeDarken(data, edges, 0.55 + t * 0.35);
  applySaturationVibrance(data, 8 + t * 10, 8 + t * 8);
  applyFade(data, 10 + t * 12);
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
