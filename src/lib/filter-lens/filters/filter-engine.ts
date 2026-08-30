/**
 * filters/filter-engine.ts — Motio2edit programmatic image processing.
 * Never mutates input; preserves alpha; preview + full modes.
 */
import {
  ProcessingProfile,
  ProcessOptions,
  ProcessResult,
  RGBAImage,
  ToneCurvePoint,
} from '../shared/processing-types';

export function cloneImage(image: RGBAImage): RGBAImage {
  return { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function downscale(image: RGBAImage, maxDimension: number): RGBAImage {
  const long = Math.max(image.width, image.height);
  if (long <= maxDimension) return cloneImage(image);
  const scale = maxDimension / long;
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(image.width - 1, Math.floor(x / scale));
      const sy = Math.min(image.height - 1, Math.floor(y / scale));
      const si = (sy * image.width + sx) * 4;
      const di = (y * w + x) * 4;
      out[di] = image.data[si];
      out[di + 1] = image.data[si + 1];
      out[di + 2] = image.data[si + 2];
      out[di + 3] = image.data[si + 3];
    }
  }
  return { width: w, height: h, data: out };
}

function applyExposureContrast(data: Uint8ClampedArray, exposure: number, contrast: number, brightness: number) {
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

function applyHighlightsShadows(data: Uint8ClampedArray, highlights: number, shadows: number) {
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const shadowW = 1 - Math.min(1, l / 128);
    const highW = Math.min(1, Math.max(0, (l - 128) / 127));
    const adj = shadows * 0.4 * shadowW + highlights * 0.4 * highW;
    for (let ch = 0; ch < 3; ch++) data[i + ch] = clamp8(data[i + ch] + adj);
  }
}

function applyTemperatureTint(data: Uint8ClampedArray, temperature: number, tint: number) {
  const t = temperature / 100;
  const ti = tint / 100;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp8(data[i] + t * 25 - ti * 8);
    data[i + 1] = clamp8(data[i + 1] + ti * 20);
    data[i + 2] = clamp8(data[i + 2] - t * 25 - ti * 8);
  }
}

function applySaturationVibrance(data: Uint8ClampedArray, saturation: number, vibrance: number) {
  const s = 1 + saturation / 100;
  const vib = vibrance / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
    const sat = maxc === 0 ? 0 : (maxc - minc) / maxc;
    const vBoost = 1 + vib * (1 - sat);
    const factor = s * vBoost;
    data[i] = clamp8(gray + (r - gray) * factor);
    data[i + 1] = clamp8(gray + (g - gray) * factor);
    data[i + 2] = clamp8(gray + (b - gray) * factor);
  }
}

function applyMonochromeSepia(data: Uint8ClampedArray, mono: boolean, sepia: number) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let nr = r, ng = g, nb = b;
    if (mono || sepia > 0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      nr = ng = nb = gray;
      if (sepia > 0) {
        const t = sepia / 100;
        nr = clamp8(gray + 40 * t);
        ng = clamp8(gray + 20 * t);
        nb = clamp8(gray - 20 * t);
      }
    }
    data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
  }
}

function applyFade(data: Uint8ClampedArray, fade: number) {
  if (fade <= 0) return;
  const t = fade / 100;
  for (let i = 0; i < data.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) data[i + ch] = clamp8(data[i + ch] * (1 - t * 0.25) + 40 * t);
  }
}

function applyGrain(data: Uint8ClampedArray, grain: number, seed: number) {
  if (grain <= 0) return;
  const rnd = mulberry32(seed);
  const amt = grain * 0.6;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rnd() - 0.5) * amt;
    data[i] = clamp8(data[i] + n);
    data[i + 1] = clamp8(data[i + 1] + n);
    data[i + 2] = clamp8(data[i + 2] + n);
  }
}

function applyVignette(image: RGBAImage, amount: number, feather: number) {
  if (amount <= 0) return;
  const w = image.width, h = image.height;
  const cx = w / 2, cy = h / 2;
  const maxD = Math.sqrt(cx * cx + cy * cy);
  const soft = 0.3 + (feather / 100) * 0.5;
  const strength = amount / 100;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxD;
      const v = Math.max(0, (d - (1 - soft)) / soft);
      const factor = 1 - v * v * strength;
      const i = (y * w + x) * 4;
      image.data[i] = clamp8(image.data[i] * factor);
      image.data[i + 1] = clamp8(image.data[i + 1] * factor);
      image.data[i + 2] = clamp8(image.data[i + 2] * factor);
    }
  }
}

function applySharpen(image: RGBAImage, amount: number) {
  if (amount <= 0) return;
  const w = image.width, h = image.height;
  const src = new Uint8ClampedArray(image.data);
  const t = amount / 100;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = src[i + c];
        const blur =
          (src[i - 4 + c] + src[i + 4 + c] + src[i - w * 4 + c] + src[i + w * 4 + c] + center * 4) / 8;
        image.data[i + c] = clamp8(center + (center - blur) * t * 2);
      }
    }
  }
}

function scaleProfile(profile: ProcessingProfile, intensity: number): ProcessingProfile {
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
  };
}

export function applyProcessingProfile(
  image: RGBAImage,
  profile: ProcessingProfile,
  options: ProcessOptions,
): ProcessResult {
  const working = cloneImage(image);
  const p = scaleProfile(profile, options.intensity);
  const data = working.data;

  if (options.isCancelled?.()) return { image: working, cancelled: true, isPreview: options.mode === 'preview' };

  applyExposureContrast(data, p.exposure ?? 0, p.contrast ?? 0, p.brightness ?? 0);
  applyHighlightsShadows(data, p.highlights ?? 0, p.shadows ?? 0);
  applyTemperatureTint(data, p.temperature ?? 0, p.tint ?? 0);
  applySaturationVibrance(data, p.saturation ?? 0, p.vibrance ?? 0);
  applyMonochromeSepia(data, !!p.monochrome, p.sepia ?? 0);
  applyFade(data, p.fade ?? 0);
  if (p.clarity) applySharpen(working, Math.abs(p.clarity) * 0.5);
  applySharpen(working, p.sharpening ?? 0);
  applyVignette(working, p.vignette ?? 0, p.vignetteFeather ?? 50);
  applyGrain(data, p.grain ?? 0, options.seed ?? 42);

  return { image: working, cancelled: false, isPreview: options.mode === 'preview' };
}

export function renderPreview(
  image: RGBAImage,
  profile: ProcessingProfile,
  options: ProcessOptions,
): ProcessResult {
  const maxDim = options.previewMaxDimension ?? 640;
  const small = downscale(image, maxDim);
  return applyProcessingProfile(small, profile, { ...options, mode: 'preview' });
}

export function renderFullResolution(
  image: RGBAImage,
  profile: ProcessingProfile,
  options: ProcessOptions,
): ProcessResult {
  return applyProcessingProfile(image, profile, { ...options, mode: 'full' });
}
