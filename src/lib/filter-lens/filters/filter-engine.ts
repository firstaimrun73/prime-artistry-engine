/**
 * filters/filter-engine.ts — Motio2edit programmatic image processing.
 * Never mutates input; preserves alpha; preview + full modes.
 */
import {
  ProcessingProfile,
  ProcessOptions,
  ProcessResult,
  RGBAImage,
} from '../shared/processing-types';
import {
  cloneImage,
  downscale,
  applyExposureContrast,
  applyHighlightsShadows,
  applyTemperatureTint,
  applySaturationVibrance,
  applyMonochromeSepia,
  applySplitToning,
} from './engine-ops-basic';
import {
  applyFade,
  applyGrain,
  applyVignette,
  applySharpen,
  applyPosterize,
  applyEdgeMix,
  applyPixelate,
} from './engine-ops-basic-b';
import {
  applyBloom,
  applySoftBlur,
  applyDuotone,
  applyNeonStyle,
  applyContrastish,
  applyDenoise,
  applyDynamicRange,
  applyAtmosphere,
} from './engine-ops-extra';
import {
  applyComicStyle,
  applySketchStyle,
  applyStyle,
  scaleProfile,
} from './engine-ops-style';

export { cloneImage, downscale };

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
  if (p.splitToning) applySplitToning(data, p.splitToning);
  applyFade(data, p.fade ?? 0);
  if (p.softBlur) applySoftBlur(working, p.softBlur);
  if (p.denoise) applyDenoise(working, p.denoise);
  if (p.dynamicRange) applyDynamicRange(data, p.dynamicRange);
  if (p.atmosphere) applyAtmosphere(data, p.atmosphere);
  if (p.bloom) applyBloom(working, p.bloom);
  if (p.clarity) applySharpen(working, Math.abs(p.clarity) * 0.55);
  if (p.microcontrast) applySharpen(working, Math.abs(p.microcontrast) * 0.4);
  applySharpen(working, p.sharpening ?? 0);
  if (p.posterizeLevels) applyPosterize(data, p.posterizeLevels);
  if (p.edgeAmount) applyEdgeMix(working, p.edgeAmount);
  if (p.pixelSize) applyPixelate(working, p.pixelSize);
  if (p.duotone) applyDuotone(data, p.duotone.shadow, p.duotone.highlight);
  if (p.style && p.style !== 'none') applyStyle(working, p.style, options.intensity);
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
