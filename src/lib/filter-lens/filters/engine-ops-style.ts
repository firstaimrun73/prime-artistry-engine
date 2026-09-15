/**
 * engine-ops-style.ts
 * Style recipes from Claude NPR engine. Intensity scales GRAPHIC stages.
 * Public applyStyle keeps RGBAImage in-place API for filter-engine.ts.
 *
 * 2026-09: Sketch / Ghibli / Cartoon strengthened for visible transformation
 * on soft studio portraits (lower thresholds, higher graphic blend).
 */
import type { RGBAImage, ProcessingProfile } from '../shared/processing-types';
import {
  ImgBuf,
  computeImageStats,
  bilateralApprox,
  oilPaint,
  softQuantize,
  blend,
} from './engine-npr-core';
import {
  sobelInkMask,
  adaptiveEdgeMask,
  compositeInk,
  crossHatch,
  colorCells,
  halftoneShadows,
  neonRim,
  midtoneDarken,
  cyberpunkPaletteBlend,
  warmGreenLift,
} from './engine-graphic-primitives';

export type StyleKey =
  | 'sketch'
  | 'oil'
  | 'watercolor'
  | 'cartoon'
  | 'comic'
  | 'anime'
  | 'cyberpunk'
  | 'neon'
  | 'ghibli'
  | 'retro3d'
  | 'flatvector'
  | 'painting'
  | 'none';

function norm(intensity: number): number {
  return Math.max(0, Math.min(100, intensity)) / 100;
}

function scaleMask(mask: Float32Array, factor: number): Float32Array {
  const out = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = Math.min(1, mask[i] * factor);
  return out;
}

function toBuf(image: RGBAImage): ImgBuf {
  return { data: image.data, width: image.width, height: image.height };
}

function writeBack(image: RGBAImage, buf: ImgBuf): void {
  if (image.data === buf.data) return;
  image.data.set(buf.data);
}

// ── SKETCH ──────────────────────────────────────────────────────────────────
// Stronger ink + lower threshold so soft portraits get visible pencil lines.
// Intensity directly scales outline darkness and hatch density.
function applySketch(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  const stats = computeImageStats(img);
  // Soften photo slightly so paper base is clean
  const base = bilateralApprox(img, 2, 28);
  const { width, height, data } = base;
  const paper = new Uint8ClampedArray(data.length);
  // Higher contrast paper (less washed-out gray)
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Map to 210–245 range with more midtone separation
    const g = 210 + (l / 255) * 35 - (255 - l) * 0.15 * t;
    paper[i] = paper[i + 1] = paper[i + 2] = Math.max(180, Math.min(250, g));
    paper[i + 3] = data[i + 3];
  }
  let out: ImgBuf = { data: paper, width, height };

  // Much stronger ink — was too weak on soft edges
  const inkStrength = 0.85 + t * 1.4; // was 0.3 + t*1.1
  // Lower threshold so more edges become lines
  const threshold = 12 + stats.edgeDensity * 22; // was 25 +
  const inkMask = sobelInkMask(img, inkStrength, threshold);
  out = compositeInk(out, inkMask, [28, 26, 32]);

  // Cross-hatch earlier and denser (starts at 20% intensity)
  if (t > 0.2) {
    out = crossHatch(out, Math.min(1, (t - 0.2) / 0.55 + 0.25));
  }
  return out;
}

// ── OIL ─────────────────────────────────────────────────────────────────────
function applyOil(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  const stats = computeImageStats(img);
  const edgeAdj = stats.edgeDensity > 0.12 ? -1 : 0;
  const radius = Math.max(2, Math.min(4, Math.round(2 + t * 2 + edgeAdj)));
  const levels = stats.lowContrast ? 10 : 8;
  let out = oilPaint(img, radius, levels);
  if (t > 0.7) {
    const second = oilPaint(out, radius + 1, levels);
    out = blend(out, second, ((t - 0.7) / 0.3) * 0.5);
  }
  return out;
}

// ── WATERCOLOR ──────────────────────────────────────────────────────────────
function applyWatercolor(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  const stats = computeImageStats(img);
  const radius = 3 + Math.round(t * 3);
  const sigmaColor = 25 + t * 25;
  let out = bilateralApprox(img, radius, sigmaColor);
  // Higher levels reduce ring banding on smooth studio backgrounds
  const levels = stats.lowContrast ? 12 : 10;
  out = softQuantize(out, levels, 0.45);
  const edgeMask = adaptiveEdgeMask(img, 3, 6);
  out = compositeInk(out, scaleMask(edgeMask, 0.3 + t * 0.4), [30, 20, 25]);
  return out;
}

// ── CARTOON / COMIC ─────────────────────────────────────────────────────────
// Higher quantize levels + stronger outlines. Fewer concentric rings on flat bg.
function applyCartoon(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  const stats = computeImageStats(img);
  const smoothed = bilateralApprox(img, 3, 42);
  // More levels = less posterization / rings on smooth gradients
  const levels = stats.lowContrast ? 12 : 9; // was 9 / 7
  let out = softQuantize(smoothed, levels, 0.22); // less dither noise
  // Stronger black outlines
  const inkStrength = 0.75 + t * 1.15;
  const threshold = 14 + stats.edgeDensity * 24;
  const inkMask = sobelInkMask(img, inkStrength, threshold);
  out = compositeInk(out, inkMask, [8, 8, 12]);
  return out;
}

// ── CYBERPUNK ───────────────────────────────────────────────────────────────
function applyCyberpunk(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  const stats = computeImageStats(img);
  const cellSize = stats.edgeDensity > 0.12 ? 3 : 5;
  let out = colorCells(img, cellSize, 0.5 + t * 0.2);
  out = cyberpunkPaletteBlend(out, 0.35 + t * 0.35);
  out = halftoneShadows(out, 4, 90, 0.3 + t * 0.3);
  const inkMask = sobelInkMask(img, 0.6 + t * 0.8, 24);
  out = compositeInk(out, inkMask, [5, 0, 15]);
  out = neonRim(out, 0.4 + t * 0.5);
  return out;
}

// ── NEON ────────────────────────────────────────────────────────────────────
function applyNeon(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  let out = midtoneDarken(img, 0.25 + t * 0.35);
  out = neonRim(out, 0.5 + t * 0.9);
  return out;
}

// ── GHIBLI ART ──────────────────────────────────────────────────────────────
// Was almost invisible (blend 0.4–0.7 of mild oil). Now clearly painterly.
function applyGhibli(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  const stats = computeImageStats(img);
  // Larger paint radius for visible brush structure
  const radius = stats.edgeDensity > 0.12 ? 2 : 3;
  const painterly = oilPaint(img, radius, 9);
  // Much higher blend toward paint (was 0.4 + t*0.3 → max 0.7)
  let out = blend(img, painterly, 0.7 + t * 0.25); // 0.70 → 0.95
  out = bilateralApprox(out, 2, 18);
  // Stronger storybook warm-green
  out = warmGreenLift(out, 0.45 + t * 0.45);
  const { width, height, data } = out;
  const faded = new Uint8ClampedArray(data.length);
  const fadeAmt = 0.1 + t * 0.1;
  for (let i = 0; i < data.length; i += 4) {
    faded[i] = data[i] + (245 - data[i]) * fadeAmt * 0.35 + 12 * fadeAmt;
    faded[i + 1] = data[i + 1] + (245 - data[i + 1]) * fadeAmt * 0.35 + 10 * fadeAmt;
    faded[i + 2] = data[i + 2] + (245 - data[i + 2]) * fadeAmt * 0.25;
    faded[i + 3] = data[i + 3];
  }
  return { data: faded, width, height };
}

// ── RETRO 3D / ANIME (lightweight) ──────────────────────────────────────────
function applyRetro3d(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  const stats = computeImageStats(img);
  let out = bilateralApprox(img, 2, 35);
  out = softQuantize(out, stats.lowContrast ? 9 : 7, 0.35);
  out = colorCells(out, 3, 0.35 + t * 0.25);
  const inkMask = sobelInkMask(img, 0.4 + t * 0.45, 24);
  out = compositeInk(out, inkMask, [20, 20, 25]);
  return out;
}

function applyAnime(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  let out = bilateralApprox(img, 2, 40);
  out = softQuantize(out, 9, 0.25);
  const inkMask = sobelInkMask(img, 0.4 + t * 0.45, 26);
  out = compositeInk(out, inkMask, [15, 12, 18]);
  return out;
}

function applyStyleBuf(img: ImgBuf, style: string, intensity: number): ImgBuf {
  switch (style) {
    case 'sketch':
      return applySketch(img, intensity);
    case 'oil':
    case 'painting':
      return applyOil(img, intensity);
    case 'watercolor':
      return applyWatercolor(img, intensity);
    case 'cartoon':
    case 'comic':
      return applyCartoon(img, intensity);
    case 'cyberpunk':
      return applyCyberpunk(img, intensity);
    case 'neon':
      return applyNeon(img, intensity);
    case 'ghibli':
      return applyGhibli(img, intensity);
    case 'retro3d':
      return applyRetro3d(img, intensity);
    case 'anime':
      return applyAnime(img, intensity);
    case 'flatvector':
      return applyCartoon(img, intensity);
    default:
      return img;
  }
}

/**
 * Public API used by filter-engine.ts — mutates RGBAImage in place.
 */
export function applyStyle(
  image: RGBAImage,
  style: string | undefined,
  intensity: number,
): void {
  if (!style || style === 'none') return;
  const buf = toBuf(image);
  const result = applyStyleBuf(buf, style, intensity);
  writeBack(image, result);
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
