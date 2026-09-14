/**
 * engine-ops-style.ts — anime / comic / sketch / neon style ops (backend only)
 * Sketch: pure B/W with stronger black line weight.
 * Anime: soft multi-tone cel, thin clean ink, luminous skin bias (technique-only).
 * Comic: moderate quantize + bold ink + light shadow dots; preserves face structure.
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

function inkOutlines(
  data: Uint8ClampedArray,
  gray: Float32Array,
  w: number,
  h: number,
  edgeThresh: number,
  inkFloor: number,
  strength: number,
) {
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const gx =
        -gray[p - w - 1] - 2 * gray[p - 1] - gray[p + w - 1] +
         gray[p - w + 1] + 2 * gray[p + 1] + gray[p + w + 1];
      const gy =
        -gray[p - w - 1] - 2 * gray[p - w] - gray[p - w + 1] +
         gray[p + w - 1] + 2 * gray[p + w] + gray[p + w + 1];
      const mag = Math.sqrt(gx * gx + gy * gy);
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

/** Quantize blended with original — keeps face/fabric readable. */
function softCelQuantize(data: Uint8ClampedArray, levels: number, blend: number) {
  const step = 255 / (levels - 1);
  const keep = 1 - blend;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = data[i + c];
      const q = Math.round(orig / step) * step;
      data[i + c] = clamp8(orig * keep + q * blend);
    }
  }
}

/**
 * Anime (technique-only): soft cel fields, thin clean contours, slight skin lift.
 * Inspired by classic cel-animation shading structure — not any named IP.
 */
export function applyAnimeStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height;
  const data = image.data;
  const t = Math.max(0.4, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);

  // Mild smooth base so skin reads as flat cel fields
  applySoftBlur(image, 6 + t * 8);

  // 7–8 soft levels, light blend — face structure stays
  softCelQuantize(data, 7, 0.38 + t * 0.12);

  // Luminous midtones (skin bias): lift mids slightly, keep highlights
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (y > 40 && y < 210) {
      const lift = (1 - Math.abs(y - 140) / 140) * (8 + t * 10);
      data[i] = clamp8(data[i] + lift * 1.05);
      data[i + 1] = clamp8(data[i + 1] + lift);
      data[i + 2] = clamp8(data[i + 2] + lift * 0.92);
    }
  }

  applySaturationVibrance(data, 14 + t * 16, 12 + t * 12);
  applyContrastish(data, 6 + t * 8);

  const gray = luminanceGray(src, w, h);
  // Thin clean linework (not heavy comic black)
  inkOutlines(data, gray, w, h, 42 - t * 5, 36, 0.42 + t * 0.18);
}

/**
 * Comic: graphic but face-preserving — moderate quantize, bold ink, light shadow dots.
 */
export function applyComicStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height;
  const data = image.data;
  const t = Math.max(0.45, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);

  // 6 levels, ~45% blend — graphic without muddy red/green face blocks
  softCelQuantize(data, 6, 0.42 + t * 0.1);
  applySaturationVibrance(data, 12 + t * 14, 10 + t * 10);
  applyContrastish(data, 12 + t * 12);

  const gray = luminanceGray(src, w, h);

  // Halftone only in deep shadows
  const dotPeriod = 5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const g = gray[p];
      if (g < 90) {
        const cx = x % dotPeriod;
        const cy = y % dotPeriod;
        const dist = Math.sqrt((cx - 2.5) ** 2 + (cy - 2.5) ** 2);
        if (dist < ((90 - g) / 90) * 1.8 * (0.5 + t * 0.4)) {
          const i = p * 4;
          data[i] = clamp8(data[i] * 0.72);
          data[i + 1] = clamp8(data[i + 1] * 0.72);
          data[i + 2] = clamp8(data[i + 2] * 0.72);
        }
      }
    }
  }

  // Strong black ink on clear edges only
  inkOutlines(data, gray, w, h, 28 - t * 5, 6, 0.82 + t * 0.12);
}

/**
 * Sketch: pure neutral pencil + stronger black outlines (user request).
 */
export function applySketchStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height;
  const data = image.data;
  const t = Math.max(0.5, Math.min(1, intensity / 100));
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const inv = new Float32Array(w * h);
  for (let p = 0; p < gray.length; p++) inv[p] = 255 - gray[p];
  let cur = inv;
  const passes = 3 + Math.round(t * 2);
  for (let pass = 0; pass < passes; pass++) {
    const next = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            s += cur[(y + dy) * w + (x + dx)];
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

  // Base pencil dodge
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const denom = 255 - cur[p] + 1e-3;
    let v = (gray[p] * 255) / denom;
    if (v > 255) v = 255;
    // Darker overall line weight
    const g = Math.min(255, v * (0.78 + 0.14 * (1 - t)));
    const out = clamp8(g);
    data[i] = out;
    data[i + 1] = out;
    data[i + 2] = out;
  }

  // Extra pure-black edge pass on strong contours
  const edgeThresh = 22 - t * 6;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const gx =
        -gray[p - w - 1] - 2 * gray[p - 1] - gray[p + w - 1] +
         gray[p - w + 1] + 2 * gray[p + 1] + gray[p + w + 1];
      const gy =
        -gray[p - w - 1] - 2 * gray[p - w] - gray[p - w + 1] +
         gray[p + w - 1] + 2 * gray[p + w] + gray[p + w + 1];
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > edgeThresh) {
        const i = p * 4;
        const k = Math.min(1, (mag - edgeThresh) / 40) * (0.7 + t * 0.3);
        // Push toward pure black outlines
        const ink = 0;
        data[i] = clamp8(data[i] * (1 - k) + ink * k);
        data[i + 1] = clamp8(data[i + 1] * (1 - k) + ink * k);
        data[i + 2] = clamp8(data[i + 2] * (1 - k) + ink * k);
      }
    }
  }
}

export function applyStyle(image: RGBAImage, style: string | undefined, intensity: number) {
  if (!style || style === 'none') return;
  const t = Math.max(0, Math.min(100, intensity));
  if (style === 'sketch') {
    applySketchStyle(image, t);
  } else if (style === 'anime') {
    applyAnimeStyle(image, t);
  } else if (style === 'comic') {
    applyComicStyle(image, t);
  } else if (style === 'oil') {
    applySoftBlur(image, 40 + t * 0.3);
    applyPosterize(image.data, 8);
    applySaturationVibrance(image.data, 12, 8);
  } else if (style === 'watercolor') {
    applySoftBlur(image, 50 + t * 0.2);
    applySaturationVibrance(image.data, 20, 15);
    applyFade(image.data, 15);
  } else if (style === 'neon') {
    applyNeonStyle(image.data, 60 + t * 0.3);
    applyContrastish(image.data, 20);
  } else if (style === 'painting') {
    applySoftBlur(image, 18 + t * 0.25);
    applySaturationVibrance(image.data, 8 + t * 0.12, 10);
    applyContrastish(image.data, 12 + t * 0.1);
    applySketchStyle(image, Math.min(70, 35 + t * 0.35));
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
