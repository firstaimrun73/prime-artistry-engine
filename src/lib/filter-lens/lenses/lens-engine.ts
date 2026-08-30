/**
 * lenses/lens-engine.ts
 * Lens processing builds on the filter-engine pipeline with lens-only passes.
 */
import {
  ProcessingProfile,
  ProcessOptions,
  ProcessResult,
  RGBAImage,
} from '../shared/processing-types';
import {
  applyProcessingProfile,
  cloneImage,
  downscale,
  renderPreview,
  renderFullResolution,
} from '../filters/filter-engine';

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

/** Edge-protected denoise (simple bilateral-ish blur on luma). */
function applyDenoise(image: RGBAImage, amount: number): void {
  if (amount <= 0) return;
  const w = image.width;
  const h = image.height;
  const src = new Uint8ClampedArray(image.data);
  const strength = Math.min(1, amount / 100);
  const radius = strength > 0.5 ? 2 : 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = 0, g = 0, b = 0, wt = 0;
      const cr = src[i], cg = src[i + 1], cb = src[i + 2];
      const cl = 0.299 * cr + 0.587 * cg + 0.114 * cb;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = (ny * w + nx) * 4;
          const nr = src[j], ng = src[j + 1], nb = src[j + 2];
          const nl = 0.299 * nr + 0.587 * ng + 0.114 * nb;
          const d = Math.abs(nl - cl);
          const weight = Math.exp(-(d * d) / (2 * (20 + strength * 40) ** 2));
          r += nr * weight; g += ng * weight; b += nb * weight; wt += weight;
        }
      }
      if (wt > 0) {
        image.data[i] = clamp8(cr * (1 - strength) + (r / wt) * strength);
        image.data[i + 1] = clamp8(cg * (1 - strength) + (g / wt) * strength);
        image.data[i + 2] = clamp8(cb * (1 - strength) + (b / wt) * strength);
      }
    }
  }
}

function applyMicrocontrast(image: RGBAImage, amount: number): void {
  if (!amount) return;
  const w = image.width, h = image.height;
  const src = new Uint8ClampedArray(image.data);
  const t = amount / 100;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = src[i + c];
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            sum += src[((y + dy) * w + (x + dx)) * 4 + c];
        const avg = sum / 9;
        image.data[i + c] = clamp8(center + (center - avg) * t);
      }
    }
  }
}

function applyDynamicRange(image: RGBAImage, amount: number): void {
  if (amount <= 0) return;
  const t = amount / 100;
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = data[i + c] / 255;
      const lifted = v < 0.5 ? v + (0.5 - v) * t * 0.35 : v - (v - 0.5) * t * 0.2;
      data[i + c] = clamp8(lifted * 255);
    }
  }
}

function applyAtmosphere(image: RGBAImage, amount: number): void {
  if (!amount) return;
  const t = amount / 100;
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    if (t > 0) {
      // dehaze: increase contrast slightly
      for (let c = 0; c < 3; c++) {
        const v = data[i + c] / 255;
        data[i + c] = clamp8(((v - 0.5) * (1 + t * 0.4) + 0.5) * 255);
      }
    } else {
      // haze
      const h = -t;
      for (let c = 0; c < 3; c++) {
        data[i + c] = clamp8(data[i + c] * (1 - h * 0.3) + 200 * h * 0.3);
      }
    }
  }
}

export function applyLensProfile(
  image: RGBAImage,
  profile: ProcessingProfile,
  options: ProcessOptions,
): ProcessResult {
  const working = cloneImage(image);
  const intensity = Math.max(0, Math.min(100, options.intensity)) / 100;
  const scale = (v?: number) => (v == null ? 0 : v * intensity);

  if (profile.denoise) applyDenoise(working, scale(profile.denoise));
  const base = applyProcessingProfile(working, profile, options);
  if (base.cancelled) return base;
  const out = base.image;
  if (profile.microcontrast) applyMicrocontrast(out, scale(profile.microcontrast));
  if (profile.dynamicRange) applyDynamicRange(out, scale(profile.dynamicRange));
  if (profile.atmosphere) applyAtmosphere(out, scale(profile.atmosphere));
  return { image: out, cancelled: false, isPreview: options.mode === 'preview' };
}

export function renderLensPreview(
  image: RGBAImage,
  profile: ProcessingProfile,
  options: Omit<ProcessOptions, 'mode'> & { mode?: 'preview' },
): ProcessResult {
  const maxDim = options.previewMaxDimension ?? 640;
  const small = downscale(image, maxDim);
  return applyLensProfile(small, profile, { ...options, mode: 'preview', intensity: options.intensity });
}

export function renderLensFullResolution(
  image: RGBAImage,
  profile: ProcessingProfile,
  options: Omit<ProcessOptions, 'mode'> & { mode?: 'full' },
): ProcessResult {
  return applyLensProfile(image, profile, { ...options, mode: 'full', intensity: options.intensity });
}

export { cloneImage, downscale };
