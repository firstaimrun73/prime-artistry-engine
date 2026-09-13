/**
 * filter-overrides.ts — strong Comic, Sketch, Peacock, pure B/W, tints
 * Merged on top of curated catalog (no UI change).
 */
import type { ProcessingProfile } from '../shared/processing-types';

export const FILTER_PROFILE_OVERRIDES: Record<string, ProcessingProfile> = {
  'filter-010': { monochrome: true, contrast: 20, clarity: 8, shadows: 4, highlights: -4, grain: 2, vignette: 4 },
  'filter-011': { monochrome: true, contrast: 40, shadows: -18, highlights: -8, clarity: 14, vignette: 16, grain: 4 },
  'filter-024': { temperature: -28, tint: -10, shadows: 14, contrast: 16, vignette: 12, saturation: 8, splitToning: { shadowsHue: 210, shadowsSaturation: 42, highlightsHue: 200, highlightsSaturation: 22, balance: -8 } },
  'filter-038': { temperature: 36, tint: 14, saturation: 16, contrast: 14, fade: 6, grain: 6, vignette: 10, splitToning: { shadowsHue: 25, shadowsSaturation: 30, highlightsHue: 35, highlightsSaturation: 28, balance: 6 } },
  'filter-046': { monochrome: true, contrast: 44, shadows: -20, highlights: -8, vignette: 32, grain: 10, clarity: 12 },
  'filter-055': { temperature: 38, tint: 18, saturation: 22, contrast: 24, highlights: -14, vignette: 18, shadows: -6, splitToning: { shadowsHue: 10, shadowsSaturation: 40, highlightsHue: 25, highlightsSaturation: 35, balance: 4 } },
  'filter-073': { saturation: 48, vibrance: 50, contrast: 30, temperature: -12, tint: 20, splitToning: { shadowsHue: 195, shadowsSaturation: 72, highlightsHue: 42, highlightsSaturation: 55, balance: -16 }, clarity: 16, shadows: 8, bloom: 12 },
  'filter-075': { saturation: 44, vibrance: 40, contrast: 24, temperature: 8, tint: 12, splitToning: { shadowsHue: 310, shadowsSaturation: 55, highlightsHue: 45, highlightsSaturation: 48, balance: -10 }, clarity: 12, bloom: 10 },
  'filter-095': { style: 'comic', softBlur: 6, bloom: 12, saturation: 24, vibrance: 16, contrast: 16, temperature: 6 },
  'filter-099': { style: 'comic', contrast: 22, saturation: 28, vibrance: 18, clarity: 8 },
  'filter-100': { style: 'sketch', contrast: 10, grain: 4 },
};

export const FILTER_NAME_OVERRIDES: Record<string, string> = {
  'filter-055': 'Red Heat',
  'filter-075': 'Rangoli',
  'filter-095': 'Anime',
};
