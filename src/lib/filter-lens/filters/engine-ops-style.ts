/**
 * engine-ops-style.ts
 * Style recipes — intensity scales GRAPHIC stages.
 * Local NPR path (preview + AI fallback).
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
  | 'rangoli'
  | 'glassy'
  | 'origami'
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

function applySketch(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  const stats = computeImageStats(img);
  const base = bilateralApprox(img, 2, 32);
  const { width, height, data } = base;
  const paper = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const grain = ((i * 13) % 17) - 8;
    const g = 205 + (l / 255) * 40 - (255 - l) * 0.22 * t + grain * 0.4;
    paper[i] = paper[i + 1] = paper[i + 2] = Math.max(170, Math.min(248, g));
    paper[i + 3] = data[i + 3];
  }
  let out: ImgBuf = { data: paper, width, height };
  const inkStrength = 1.35 + t * 1.85;
  const threshold = 6 + stats.edgeDensity * 16;
  const inkMask = sobelInkMask(img, inkStrength, threshold);
  out = compositeInk(out, inkMask, [12, 10, 16]);
  const fineMask = sobelInkMask(img, 0.75 + t * 0.9, 18);
  out = compositeInk(out, scaleMask(fineMask, 0.7), [28, 26, 32]);
  if (t > 0.1) out = crossHatch(out, Math.min(1, (t - 0.1) / 0.45 + 0.45));
  return out;
}

function applyOil(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  const stats = computeImageStats(img);
  const edgeAdj = stats.edgeDensity > 0.12 ? -1 : 0;
  const radius = Math.max(3, Math.min(6, Math.round(3 + t * 2.5 + edgeAdj)));
  const levels = stats.lowContrast ? 9 : 7;
  let out = oilPaint(img, radius, levels);
  const second = oilPaint(out, radius + 1, Math.max(5, levels - 1));
  out = blend(out, second, 0.35 + t * 0.35);
  const edgeMask = adaptiveEdgeMask(img, 2, 8);
  out = compositeInk(out, scaleMask(edgeMask, 0.25 + t * 0.25), [40, 28, 20]);
  return out;
}

function applyWatercolor(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  const stats = computeImageStats(img);
  const radius = 3 + Math.round(t * 3);
  const sigmaColor = 25 + t * 25;
  let out = bilateralApprox(img, radius, sigmaColor);
  const levels = stats.lowContrast ? 12 : 10;
  out = softQuantize(out, levels, 0.45);
  const edgeMask = adaptiveEdgeMask(img, 3, 6);
  out = compositeInk(out, scaleMask(edgeMask, 0.3 + t * 0.4), [30, 20, 25]);
  return out;
}

function applyCartoon(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  const stats = computeImageStats(img);
  const smoothed = bilateralApprox(img, 3, 42);
  const levels = stats.lowContrast ? 12 : 9;
  let out = softQuantize(smoothed, levels, 0.22);
  const inkStrength = 0.75 + t * 1.15;
  const threshold = 14 + stats.edgeDensity * 24;
  const inkMask = sobelInkMask(img, inkStrength, threshold);
  out = compositeInk(out, inkMask, [8, 8, 12]);
  return out;
}

function applyComic(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  let out = applyCartoon(img, intensity);
  out = halftoneShadows(out, 5, 100, 0.35 + t * 0.4);
  const inkMask = sobelInkMask(img, 0.9 + t * 1.2, 12);
  out = compositeInk(out, inkMask, [5, 5, 8]);
  return out;
}

function applyCyberpunk(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  const stats = computeImageStats(img);
  const cellSize = stats.edgeDensity > 0.12 ? 3 : 4;
  let out = colorCells(img, cellSize, 0.62 + t * 0.28);
  out = cyberpunkPaletteBlend(out, 0.62 + t * 0.48);
  out = midtoneDarken(out, 0.18 + t * 0.28);
  out = halftoneShadows(out, 4, 85, 0.34 + t * 0.38);
  const inkMask = sobelInkMask(img, 0.85 + t * 1.1, 22);
  out = compositeInk(out, inkMask, [0, 55, 95]);
  out = neonRim(out, 0.72 + t * 0.7);
  const { width, height, data } = out;
  const d = new Uint8ClampedArray(data);
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const w = Math.sin(Math.PI * Math.min(1, l / 255));
    d[i] = Math.min(255, d[i] + 32 * t * w);
    d[i + 1] = Math.min(255, d[i + 1] + 8 * t * w);
    d[i + 2] = Math.min(255, d[i + 2] + 42 * t * w);
  }
  out = { data: d, width, height };
  return out;
}

function applyNeon(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  let out = midtoneDarken(img, 0.32 + t * 0.42);
  out = neonRim(out, 0.72 + t * 1.05);
  const { width, height, data } = out;
  const d = new Uint8ClampedArray(data);
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const w = Math.sin(Math.PI * Math.min(1, l / 255));
    d[i] = Math.min(255, d[i] + 18 * t * w);
    d[i + 2] = Math.min(255, d[i + 2] + 28 * t * w);
  }
  return { data: d, width, height };
}

function applyGhibli(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  const stats = computeImageStats(img);
  const radius = stats.edgeDensity > 0.12 ? 5 : 6;
  const painterly = oilPaint(img, radius, 11);
  let out = blend(img, painterly, 0.82 + t * 0.14);
  out = bilateralApprox(out, 3, 22);
  out = softQuantize(out, 14, 0.22);
  out = warmGreenLift(out, 0.92 + t * 0.48);
  const { width, height, data } = out;
  const graded = new Uint8ClampedArray(data.length);
  const warm = 0.14 + t * 0.16;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];
    r = Math.min(255, r + (248 - r) * warm * 0.35 + 10 * warm);
    g = Math.min(255, g + (252 - g) * warm * 0.42 + 16 * warm);
    b = Math.min(255, b + (236 - b) * warm * 0.18 + 4 * warm);
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    const mid = Math.sin(Math.PI * Math.min(1, l / 255));
    g = Math.min(255, g + 22 * t * mid);
    r = Math.min(255, r + 6 * t * mid);
    graded[i] = r; graded[i + 1] = g; graded[i + 2] = b; graded[i + 3] = data[i + 3];
  }
  out = { data: graded, width, height };
  const edgeMask = adaptiveEdgeMask(img, 2, 10);
  out = compositeInk(out, scaleMask(edgeMask, 0.12 + t * 0.12), [40, 55, 35]);
  return out;
}

function applyRangoli(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  let out = bilateralApprox(img, 2, 28);
  const { width, height, data } = out;
  const sat = new Uint8ClampedArray(data.length);
  const satMul = 1.45 + t * 0.55;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    let nr = l + (r - l) * satMul;
    let ng = l + (g - l) * satMul;
    let nb = l + (b - l) * satMul;
    const w = Math.sin(Math.PI * Math.min(1, l / 255));
    nr = Math.min(255, nr + 18 * t * w);
    ng = Math.min(255, ng + 10 * t * w);
    nb = Math.min(255, nb + 6 * t * w);
    sat[i] = nr; sat[i + 1] = ng; sat[i + 2] = nb; sat[i + 3] = data[i + 3];
  }
  out = { data: sat, width, height };
  out = softQuantize(out, 10, 0.22);
  out = colorCells(out, 5, 0.35 + t * 0.3);
  out = cyberpunkPaletteBlend(out, 0.28 + t * 0.28);
  out = neonRim(out, 0.2 + t * 0.3);
  return out;
}

function applyGlassy(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  let out = bilateralApprox(img, 2, 25);
  out = midtoneDarken(out, 0.12 + t * 0.18);
  const { data, width, height } = out;
  const d = new Uint8ClampedArray(data);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, d[i] * 0.85 + 20 * t);
    d[i + 1] = Math.min(255, d[i + 1] * 0.95 + 35 * t);
    d[i + 2] = Math.min(255, d[i + 2] * 1.05 + 55 * t);
  }
  out = { data: d, width, height };
  out = neonRim(out, 0.45 + t * 0.55);
  const edgeMask = adaptiveEdgeMask(img, 2, 9);
  out = compositeInk(out, scaleMask(edgeMask, 0.3 + t * 0.25), [180, 230, 255]);
  return out;
}

function applyOrigami(img: ImgBuf, intensity: number): ImgBuf {
  const t = norm(intensity);
  let out = bilateralApprox(img, 2, 35);
  out = softQuantize(out, 6, 0.4);
  out = colorCells(out, 5 + Math.round(t * 2), 0.55 + t * 0.25);
  const inkMask = sobelInkMask(img, 0.85 + t * 0.9, 14);
  out = compositeInk(out, inkMask, [30, 28, 25]);
  out = midtoneDarken(out, 0.08 + t * 0.12);
  return out;
}

function applyStyleBuf(img: ImgBuf, style: string, intensity: number): ImgBuf {
  switch (style) {
    case 'sketch': return applySketch(img, intensity);
    case 'oil':
    case 'painting': return applyOil(img, intensity);
    case 'watercolor': return applyWatercolor(img, intensity);
    case 'cartoon': return applyCartoon(img, intensity);
    case 'comic': return applyComic(img, intensity);
    case 'cyberpunk': return applyCyberpunk(img, intensity);
    case 'neon': return applyNeon(img, intensity);
    case 'ghibli': return applyGhibli(img, intensity);
    case 'rangoli': return applyRangoli(img, intensity);
    case 'glassy': return applyGlassy(img, intensity);
    case 'origami': return applyOrigami(img, intensity);
    case 'anime': return applyCartoon(img, intensity);
    case 'flatvector': return applyOrigami(img, intensity);
    case 'retro3d': return applyNeon(img, intensity);
    default: return img;
  }
}

export function applyStyle(img: ImgBuf, style: StyleKey | string, intensity: number): ImgBuf {
  if (!style || style === 'none') return img;
  return applyStyleBuf(img, style, intensity);
}

export function applyStyleFromProfile(
  img: ImgBuf,
  profile: ProcessingProfile,
  intensity: number,
): ImgBuf {
  if (!profile.style || profile.style === 'none') return img;
  return applyStyle(img, profile.style, intensity);
}

export function styleProfileExtras(profile: ProcessingProfile): ProcessingProfile {
  return {
    contrast: profile.contrast,
    saturation: profile.saturation,
    temperature: profile.temperature,
    tint: profile.tint,
    style: profile.style,
  };
}
