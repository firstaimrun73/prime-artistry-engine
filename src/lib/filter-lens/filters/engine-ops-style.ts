/**
 * engine-ops-style.ts — structure-aware artistic styles (backend only).
 * Cartoon / Comic / Anime / Sketch / Oil use edge hierarchy, luminance masks,
 * and adaptive region simplification — not global color-only grades.
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

/** Sobel magnitude map (structure / object boundaries). */
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

/** Quantize blended with original — keeps face/fabric readable. */
function softCelQuantize(data: Uint8ClampedArray, levels: number, blend: number) {
  const step = 255 / Math.max(2, levels - 1);
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
 * Adaptive posterization: stronger flattening on low-edge (smooth) regions,
 * lighter on strong structure so faces/buildings keep form.
 */
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
    // Low edge → more cartoon flatten; high edge → preserve structure
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

/** Mild bilateral-ish smooth: blur more where edges are weak. */
function structurePreserveSmooth(
  image: RGBAImage,
  edgeMag: Float32Array,
  baseBlur: number,
) {
  // Approximate: soft blur then restore high-edge pixels from a snapshot
  const w = image.width;
  const h = image.height;
  const data = image.data;
  const snap = new Uint8ClampedArray(data);
  applySoftBlur(image, baseBlur);
  for (let p = 0, i = 0; p < edgeMag.length; p++, i += 4) {
    const e = edgeMag[p];
    if (e > 35) {
      const k = Math.min(1, (e - 35) / 70); // restore structure on strong edges
      data[i] = clamp8(data[i] * (1 - k) + snap[i] * k);
      data[i + 1] = clamp8(data[i + 1] * (1 - k) + snap[i + 1] * k);
      data[i + 2] = clamp8(data[i + 2] * (1 - k) + snap[i + 2] * k);
    }
  }
  void w;
  void h;
}

/**
 * Cartoon: structured illustration — adaptive color regions + strong object contours.
 * Not global saturation. Faces/buildings keep geometry.
 */
export function applyCartoonStyle(image: RGBAImage, intensity: number) {
  const w = image.width;
  const h = image.height;
  const data = image.data;
  const t = Math.max(0.45, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = luminanceGray(src, w, h);
  const edges = edgeMagnitude(gray, w, h);

  structurePreserveSmooth(image, edges, 10 + t * 14);
  adaptiveRegionQuantize(data, edges, 5 + Math.round(t), 0.62 + t * 0.12, 0.22 + t * 0.08);
  applySaturationVibrance(data, 16 + t * 14, 14 + t * 12);
  applyContrastish(data, 10 + t * 10);

  // Clean object contours — stronger on primary structure
  inkOutlines(data, edges, w, h, 36 - t * 6, 28, 0.55 + t * 0.2);
}

/**
 * Anime (technique-only): soft cel fields, thin clean contours, slight skin lift.
 * Structure-aware smoothing + adaptive cel quantize. Not IP-specific.
 */
export function applyAnimeStyle(image: RGBAImage, intensity: number) {
  const w = image.width;
  const h = image.height;
  const data = image.data;
  const t = Math.max(0.4, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = luminanceGray(src, w, h);
  const edges = edgeMagnitude(gray, w, h);

  structurePreserveSmooth(image, edges, 8 + t * 12);
  adaptiveRegionQuantize(data, edges, 7, 0.48 + t * 0.12, 0.18 + t * 0.08);

  // Luminous midtones (skin-friendly lift) without inventing facial features
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (y > 45 && y < 205) {
      const lift = (1 - Math.abs(y - 140) / 140) * (8 + t * 10);
      data[i] = clamp8(data[i] + lift * 1.05);
      data[i + 1] = clamp8(data[i + 1] + lift);
      data[i + 2] = clamp8(data[i + 2] + lift * 0.92);
    }
  }

  applySaturationVibrance(data, 14 + t * 16, 12 + t * 12);
  applyContrastish(data, 6 + t * 8);
  // Thin clean linework on primary contours only
  inkOutlines(data, edges, w, h, 44 - t * 5, 40, 0.38 + t * 0.16);
}

/**
 * Comic: primary/secondary contour hierarchy + selective shadow halftone.
 * Face-preserving graphic color cells.
 */
export function applyComicStyle(image: RGBAImage, intensity: number) {
  const w = image.width;
  const h = image.height;
  const data = image.data;
  const t = Math.max(0.45, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = luminanceGray(src, w, h);
  const edges = edgeMagnitude(gray, w, h);

  structurePreserveSmooth(image, edges, 5 + t * 6);
  adaptiveRegionQuantize(data, edges, 6, 0.5 + t * 0.1, 0.2 + t * 0.08);
  applySaturationVibrance(data, 14 + t * 14, 10 + t * 10);
  applyContrastish(data, 14 + t * 12);

  // Selective halftone only in deep shadows (not uniform dots)
  const dotPeriod = 5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const g = gray[p];
      if (g < 85 && edges[p] < 55) {
        const cx = x % dotPeriod;
        const cy = y % dotPeriod;
        const dist = Math.sqrt((cx - 2.5) ** 2 + (cy - 2.5) ** 2);
        if (dist < ((85 - g) / 85) * 1.7 * (0.5 + t * 0.4)) {
          const i = p * 4;
          data[i] = clamp8(data[i] * 0.7);
          data[i + 1] = clamp8(data[i + 1] * 0.7);
          data[i + 2] = clamp8(data[i + 2] * 0.7);
        }
      }
    }
  }

  // Primary contours (strong) + lighter secondary ink
  inkOutlines(data, edges, w, h, 26 - t * 4, 4, 0.78 + t * 0.14);
  inkOutlines(data, edges, w, h, 48 - t * 4, 50, 0.28 + t * 0.1);
}

/**
 * Sketch: graphite tonal base + edge hierarchy (primary strong, micro weak).
 * Intentionally drawn look — not uniform Sobel edges.
 */
export function applySketchStyle(image: RGBAImage, intensity: number) {
  const w = image.width;
  const h = image.height;
  const data = image.data;
  const t = Math.max(0.5, Math.min(1, intensity / 100));
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const edges = edgeMagnitude(gray, w, h);

  // Color-dodge pencil base
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

  // Graphite paper base from dodge
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const denom = 255 - cur[p] + 1e-3;
    let v = (gray[p] * 255) / denom;
    if (v > 255) v = 255;
    // Soften micro-noise in sky/flat areas (low edge)
    const e = edges[p];
    const soften = e < 18 ? 0.12 * t : 0;
    const g = Math.min(255, v * (0.82 + 0.12 * (1 - t)) + soften * 40);
    const out = clamp8(g);
    data[i] = out;
    data[i + 1] = out;
    data[i + 2] = out;
  }

  // Edge hierarchy: primary ink strong, secondary medium, micro suppressed
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const mag = edges[p];
      const i = p * 4;
      if (mag > 55) {
        // Primary structure
        const k = Math.min(1, (mag - 55) / 40) * (0.75 + t * 0.25);
        data[i] = clamp8(data[i] * (1 - k));
        data[i + 1] = clamp8(data[i + 1] * (1 - k));
        data[i + 2] = clamp8(data[i + 2] * (1 - k));
      } else if (mag > 28) {
        // Secondary
        const k = Math.min(1, (mag - 28) / 40) * (0.35 + t * 0.15);
        data[i] = clamp8(data[i] * (1 - k) + 40 * k);
        data[i + 1] = clamp8(data[i + 1] * (1 - k) + 40 * k);
        data[i + 2] = clamp8(data[i + 2] * (1 - k) + 40 * k);
      }
      // micro < 28: leave graphite base (no equal edge weight)
    }
  }

  // Light cross-hatch bias in deep shadows only
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (gray[p] < 70 && edges[p] < 40) {
        if (((x + y) % 4) === 0 || ((x - y + 1024) % 5) === 0) {
          const i = p * 4;
          const k = 0.12 + t * 0.1;
          data[i] = clamp8(data[i] * (1 - k));
          data[i + 1] = clamp8(data[i + 1] * (1 - k));
          data[i + 2] = clamp8(data[i + 2] * (1 - k));
        }
      }
    }
  }
}

/**
 * Oil / painterly (Ghibli-direction safe): soft fields, warm atmosphere,
 * structure-preserving edges — composition and identity retained.
 */
function applyOilPaintingStyle(image: RGBAImage, intensity: number) {
  const w = image.width;
  const h = image.height;
  const data = image.data;
  const t = Math.max(0.4, Math.min(1, intensity / 100));
  const src = new Uint8ClampedArray(data);
  const gray = luminanceGray(src, w, h);
  const edges = edgeMagnitude(gray, w, h);

  structurePreserveSmooth(image, edges, 22 + t * 28);
  adaptiveRegionQuantize(data, edges, 8, 0.4 + t * 0.12, 0.12 + t * 0.06);

  // Warm sunlight bias + gentle green lift in midtones (environmental, not full recolor)
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (y > 50 && y < 210) {
      data[i] = clamp8(data[i] + (6 + t * 8));
      data[i + 1] = clamp8(data[i + 1] + (4 + t * 5));
      data[i + 2] = clamp8(data[i + 2] - (2 + t * 2));
    }
  }
  applySaturationVibrance(data, 10 + t * 10, 10 + t * 8);
  applyContrastish(data, 6 + t * 6);
  // Very soft contour — illustrated silhouette, not heavy ink
  inkOutlines(data, edges, w, h, 50 - t * 4, 60, 0.18 + t * 0.1);
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
  } else if (style === 'cartoon') {
    applyCartoonStyle(image, t);
  } else if (style === 'oil') {
    applyOilPaintingStyle(image, t);
  } else if (style === 'watercolor') {
    applySoftBlur(image, 50 + t * 0.2);
    applySaturationVibrance(image.data, 20, 15);
    applyFade(image.data, 15);
  } else if (style === 'neon') {
    applyNeonStyle(image.data, 60 + t * 0.3);
    applyContrastish(image.data, 20);
  } else if (style === 'painting') {
    applyOilPaintingStyle(image, Math.min(100, 55 + t * 0.35));
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
