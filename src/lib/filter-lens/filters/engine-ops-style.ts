/**
 * engine-ops-style.ts — anime / comic / sketch / neon style ops
 * Anime: soft cel-shade, clean thin-thick outlines, warm vibrant flats (no IP refs).
 * Comic: bold ink contours, flat graphic color, halftone shadow texture (no IP refs).
 * Sketch: pure neutral pencil (no brown cast).
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
        const ink = Math.max(0, inkFloor - (mag - edgeThresh) * 0.04);
        const k = Math.min(1, (mag - edgeThresh) / 50) * strength;
        data[i] = clamp8(data[i] * (1 - k) + ink * k);
        data[i + 1] = clamp8(data[i + 1] * (1 - k) + ink * k);
        data[i + 2] = clamp8(data[i + 2] * (1 - k) + ink * k);
      }
    }
  }
}

/**
 * Anime: soft cel shading (2–3 flat tones), clean contour lines, warm saturated flats.
 * Descriptive technique only — no studio/artist/IP language.
 */
export function applyAnimeStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height;
  const data = image.data;
  const t = Math.max(0.5, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);

  // Soft cel: 3–4 levels, slight lift on midtones for smooth skin fields
  const levels = 3 + (t > 0.75 ? 0 : 1);
  const step = 255 / (levels - 1);
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const q = Math.round(data[i + c] / step) * step;
      // Bias toward slightly brighter cel midtones
      data[i + c] = clamp8(q * 0.92 + 18 * t);
    }
  }
  applySaturationVibrance(data, 28 + t * 32, 18 + t * 20);
  applyContrastish(data, 12 + t * 14);

  const gray = luminanceGray(src, w, h);
  // Clean anime contours — medium threshold, soft ink (not pure black)
  inkOutlines(data, gray, w, h, 32 - t * 8, 22, 0.72 + t * 0.2);
}

/**
 * Comic: bold ink outlines, flat graphic color blocks, classic halftone in shadows.
 * Descriptive technique only — no franchise/IP language.
 */
export function applyComicStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height;
  const data = image.data;
  const t = Math.max(0.55, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);

  // Strong posterize for graphic color blocking
  const levels = 4;
  const step = 255 / (levels - 1);
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      data[i + c] = clamp8(Math.round(data[i + c] / step) * step);
    }
  }
  applySaturationVibrance(data, 30 + t * 28, 16 + t * 18);
  applyContrastish(data, 26 + t * 24);

  const gray = luminanceGray(src, w, h);

  // Halftone dot pattern in shadow regions (print-comic texture)
  const dotPeriod = Math.max(3, Math.round(5 - t * 1.5));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const g = gray[p];
      if (g < 140) {
        const cx = x % dotPeriod;
        const cy = y % dotPeriod;
        const dist = Math.sqrt((cx - dotPeriod / 2) ** 2 + (cy - dotPeriod / 2) ** 2);
        const radius = ((140 - g) / 140) * (dotPeriod * 0.45) * (0.6 + t * 0.4);
        if (dist < radius) {
          const i = p * 4;
          const darken = 0.55 + t * 0.25;
          data[i] = clamp8(data[i] * darken);
          data[i + 1] = clamp8(data[i + 1] * darken);
          data[i + 2] = clamp8(data[i + 2] * darken);
        }
      }
    }
  }

  // Bold black ink contours
  inkOutlines(data, gray, w, h, 24 - t * 8, 4, 0.9 + t * 0.1);
}

/** Pure pencil-sketch: grayscale + inverted-blur color-dodge. No brown/warm cast. */
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
  const passes = 4 + Math.round(t * 2);
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
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const denom = 255 - cur[p] + 1e-3;
    let v = (gray[p] * 255) / denom;
    if (v > 255) v = 255;
    const g = Math.min(255, v * (0.88 + 0.12 * (1 - t)));
    const out = clamp8(g);
    data[i] = out;
    data[i + 1] = out;
    data[i + 2] = out;
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
