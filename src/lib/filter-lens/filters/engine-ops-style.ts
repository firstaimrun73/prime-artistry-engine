/**
 * engine-ops-style.ts — graphic style recipes only (UI locked).
 * Sketch outline strength scales with intensity.
 * Oil/watercolor avoid face-destroying step artifacts.
 * Neon is structure rim light, not a faint tint.
 */
import type { RGBAImage, ProcessingProfile } from '../shared/processing-types';
import { clamp8, applySaturationVibrance } from './engine-ops-basic';
import { applyFade } from './engine-ops-basic-b';
import { applyContrastish, applyNeonStyle } from './engine-ops-extra';
import {
  grayLuma,
  extractEdges,
  applyInkContours,
  applyCelBands,
  applyHalftone,
  applyCrossHatch,
  applyNeonRim,
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
  analyzeImageStats,
} from './engine-npr-core';

/** Sketch — intensity controls outline darkness + hatch (not locked black). */
export function applySketchStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  // Allow light sketches at low intensity
  const t = Math.max(0.15, Math.min(1, intensity / 100));
  const gray = grayLuma(data, w, h);
  const edges = extractEdges(gray, w, h);

  const inv = new Float32Array(w * h);
  for (let p = 0; p < gray.length; p++) inv[p] = 255 - gray[p];
  let cur = inv;
  const passes = 3 + Math.round(t * 3);
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

  // Lighter paper + softer graphite at low intensity
  const paperBase = 242 - t * 12;
  const toneScale = 0.55 + t * 0.35;
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const denom = 255 - cur[p] + 1e-3;
    let v = (gray[p] * 255) / denom;
    if (v > 255) v = 255;
    const g = Math.min(paperBase, v * toneScale + (1 - t) * 40);
    const out = clamp8(g);
    data[i] = out;
    data[i + 1] = out;
    data[i + 2] = out;
  }

  // Outline strength scales with intensity (user request)
  const inkStrength = 0.25 + t * 0.55;
  const inkThreshold = 55 - t * 18;
  applyInkContours(data, edges, w, h, {
    threshold: inkThreshold,
    strength: inkStrength,
    ink: 18 + (1 - t) * 40,
    secondary: 28 + (1 - t) * 30,
  });
  if (t > 0.35) {
    applyCrossHatch(data, gray, w, h, {
      maxLum: 110,
      density: 0.25 + t * 0.4,
      strength: 0.12 + t * 0.22,
    });
  }
}

export function applyCartoonStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.4, Math.min(1, intensity / 100));
  const stats = analyzeImageStats(data, w, h);
  const edgeBoost = stats.isLowContrast ? 1.15 : 1;

  bilateralApprox(image, 2 + Math.round(t * 1.5), 30 + t * 25, 2);
  softQuantize(data, 6 + Math.round(t), 0.65 + t * 0.2);
  applyCelBands(data, 4, 0.4 + t * 0.2);
  applySaturationVibrance(data, 10 + t * 14, 8 + t * 12);

  const gray = grayFromImage(data, w, h);
  const mask = adaptiveEdgeMask(gray, w, h, 9, (5 + t * 4) * edgeBoost);
  applyEdgeMaskInk(data, mask, 0.55 + t * 0.3);
}

export function applyAnimeStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.4, Math.min(1, intensity / 100));
  bilateralApprox(image, 2 + Math.round(t), 38 + t * 22, 2);
  softQuantize(data, 8, 0.5 + t * 0.2);
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (y > 40 && y < 210) {
      const lift = (1 - Math.abs(y - 140) / 140) * (6 + t * 10);
      data[i] = clamp8(data[i] + lift * 1.05);
      data[i + 1] = clamp8(data[i + 1] + lift);
      data[i + 2] = clamp8(data[i + 2] + lift * 0.9);
    }
  }
  applySaturationVibrance(data, 12 + t * 14, 10 + t * 12);
  const gray = grayFromImage(data, w, h);
  const mask = adaptiveEdgeMask(gray, w, h, 11, 8 + t * 3);
  applyEdgeMaskInk(data, mask, 0.35 + t * 0.25);
}

export function applyComicStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.4, Math.min(1, intensity / 100));
  const srcGray = grayLuma(new Uint8ClampedArray(data), w, h);
  bilateralApprox(image, 2 + Math.round(t), 28 + t * 18, 2);
  softQuantize(data, 5, 0.65 + t * 0.18);
  applyCelBands(data, 4, 0.45 + t * 0.2);
  applySaturationVibrance(data, 12 + t * 14, 8 + t * 12);
  applyContrastish(data, 10 + t * 12);
  const edges = extractEdges(srcGray, w, h);
  applyHalftone(data, srcGray, edges, w, h, {
    period: 5,
    maxLum: 95,
    density: 0.45 + t * 0.35,
    inkBoost: 0.65,
  });
  const gray = grayFromImage(data, w, h);
  const mask = adaptiveEdgeMask(gray, w, h, 9, 5 + t * 3);
  applyEdgeMaskInk(data, mask, 0.7 + t * 0.2);
}

/** Oil — single moderate pass, every pixel, no double-destroy. */
function applyOilPaintingStyle(image: RGBAImage, intensity: number) {
  const t = Math.max(0.35, Math.min(1, intensity / 100));
  const stats = analyzeImageStats(image.data, image.width, image.height);
  // Smaller radius on busy/high-edge images to keep faces readable
  const radius = stats.edgeDensity > 35 ? 2 + Math.round(t) : 3 + Math.round(t * 1.5);
  const levels = 14 + Math.round(t * 8);
  oilPaintFilter(image, radius, levels);
  applySaturationVibrance(image.data, 4 + t * 8, 4 + t * 6);
  applyContrastish(image.data, 3 + t * 5);
}

/** Ghibli Art — soft painterly + warm green storybook (original, not IP copy). */
function applyGhibliStyle(image: RGBAImage, intensity: number) {
  const t = Math.max(0.4, Math.min(1, intensity / 100));
  oilPaintFilter(image, 2 + Math.round(t * 1.5), 16 + Math.round(t * 6));
  bilateralApprox(image, 2, 42, 1);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (y > 45 && y < 220) {
      data[i] = clamp8(data[i] + (4 + t * 6));
      data[i + 1] = clamp8(data[i + 1] + (7 + t * 8));
      data[i + 2] = clamp8(data[i + 2] - (2 + t * 2));
    }
  }
  applySaturationVibrance(data, 5 + t * 8, 8 + t * 10);
  applyFade(data, 4 + t * 6);
}

export function applyRetro3dStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.4, Math.min(1, intensity / 100));
  bilateralApprox(image, 2 + Math.round(t), 26 + t * 18, 2);
  softQuantize(data, 6, 0.6 + t * 0.18);
  applyCelBands(data, 4, 0.4 + t * 0.2);
  applyContrastish(data, 10 + t * 10);
  const gray = grayFromImage(data, w, h);
  const mask = adaptiveEdgeMask(gray, w, h, 9, 7 + t * 3);
  applyEdgeMaskInk(data, mask, 0.3 + t * 0.25);
}

export function applyCyberpunkStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.45, Math.min(1, intensity / 100));
  bilateralApprox(image, 2 + Math.round(t), 26 + t * 20, 2);
  softQuantize(data, 5, 0.65 + t * 0.18);
  applyCelBands(data, 4, 0.5 + t * 0.2);
  applyLumaPalette(data, [
    { at: 0, rgb: [12, 6, 32] },
    { at: 0.3, rgb: [30, 20, 100] },
    { at: 0.5, rgb: [20, 130, 170] },
    { at: 0.72, rgb: [150, 60, 190] },
    { at: 1, rgb: [220, 190, 255] },
  ], 0.5 + t * 0.25);
  const gray0 = grayLuma(new Uint8ClampedArray(data), w, h);
  const edges = extractEdges(gray0, w, h);
  applyHalftone(data, gray0, edges, w, h, {
    period: 4,
    maxLum: 150,
    density: 0.4 + t * 0.4,
    inkBoost: 0.5,
  });
  applyContrastish(data, 12 + t * 12);
  const gray = grayFromImage(data, w, h);
  const mask = adaptiveEdgeMask(gray, w, h, 9, 5 + t * 3);
  applyEdgeMaskInk(data, mask, 0.55 + t * 0.25);
  applyNeonRim(data, edges, w, h, {
    threshold: 40,
    strength: 0.25 + t * 0.25,
    rgb: [100, 40, 240],
  });
}

function applyFlatVectorStyle(image: RGBAImage, intensity: number) {
  const t = Math.max(0.4, Math.min(1, intensity / 100));
  bilateralApprox(image, 2, 28, 2);
  softQuantize(image.data, 4 + Math.round(t), 0.85);
  applyCelBands(image.data, 3, 0.75);
  const gray = grayFromImage(image.data, image.width, image.height);
  const mask = adaptiveEdgeMask(gray, image.width, image.height, 9, 5);
  applyEdgeMaskInk(image.data, mask, 0.7 + t * 0.2);
}

/** Watercolor — soft wash + edge darken; light quantize only (no ring banding). */
function applyWatercolorStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.4, Math.min(1, intensity / 100));

  bilateralApprox(image, 3 + Math.round(t), 48 + t * 25, 2);
  const blurred = boxBlur(data, w, h, 2 + Math.round(t * 1.5));
  const k = 0.3 + t * 0.25;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp8(data[i] * (1 - k) + blurred[i] * k);
    data[i + 1] = clamp8(data[i + 1] * (1 - k) + blurred[i + 1] * k);
    data[i + 2] = clamp8(data[i + 2] * (1 - k) + blurred[i + 2] * k);
  }
  // Mild quantize only — dithered to avoid concentric rings on smooth backgrounds
  softQuantize(data, 10, 0.25 + t * 0.2);

  const gray = grayFromImage(data, w, h);
  const edges = extractEdges(gray, w, h);
  watercolorEdgeDarken(data, edges, 0.45 + t * 0.35);
  applySaturationVibrance(data, 6 + t * 10, 6 + t * 8);
  applyFade(data, 8 + t * 10);
}

/** Neon — strong localized rim + cool/magenta night contrast (not a faint pink edge). */
function applyNeonGraphicStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height, data = image.data;
  const t = Math.max(0.4, Math.min(1, intensity / 100));
  const gray = grayLuma(new Uint8ClampedArray(data), w, h);
  const edges = extractEdges(gray, w, h);

  // Darken midtones slightly for night club feel
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (y < 180) {
      const d = (1 - y / 180) * (12 + t * 18);
      data[i] = clamp8(data[i] - d * 0.7);
      data[i + 1] = clamp8(data[i + 1] - d * 0.85);
      data[i + 2] = clamp8(data[i + 2] - d * 0.5);
    }
  }
  applyNeonStyle(data, 70 + t * 25);
  applyContrastish(data, 14 + t * 14);
  applySaturationVibrance(data, 8 + t * 12, 6 + t * 10);
  // Dual rim: magenta + cyan
  applyNeonRim(data, edges, w, h, {
    threshold: 28,
    strength: 0.45 + t * 0.4,
    rgb: [255, 30, 160],
  });
  applyNeonRim(data, edges, w, h, {
    threshold: 50,
    strength: 0.25 + t * 0.25,
    rgb: [40, 220, 255],
  });
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
  else if (style === 'neon') applyNeonGraphicStyle(image, t);
  else if (style === 'painting') applyOilPaintingStyle(image, Math.min(100, 55 + t * 0.4));
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
