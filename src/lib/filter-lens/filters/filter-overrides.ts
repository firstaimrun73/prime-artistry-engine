/**
 * filter-overrides.ts — strong Comic, Sketch, Peacock, pure B/W, tints
 * Merged on top of curated catalog (no UI change).
 * Pure monochrome for B/W + Noir (no brown/grey cast).
 * Visible tinted red / blue / orange / yellow.
 */
import type { ProcessingProfile } from '../shared/processing-types';

export const FILTER_PROFILE_OVERRIDES: Record<string, ProcessingProfile> = {
  // Pure neutral B/W
  'filter-010': { monochrome: true, contrast: 22, clarity: 10, shadows: 6, highlights: -6, grain: 2, vignette: 4 },
  // Deep pure B/W
  'filter-011': { monochrome: true, contrast: 42, shadows: -20, highlights: -10, clarity: 16, vignette: 18, grain: 4 },
  // Strong cool Blue
  'filter-024': {
    temperature: -36, tint: -14, shadows: 16, contrast: 20, vignette: 14, saturation: 12,
    splitToning: { shadowsHue: 210, shadowsSaturation: 58, highlightsHue: 200, highlightsSaturation: 32, balance: -10 },
  },
  // Strong Orange film
  'filter-038': {
    temperature: 42, tint: 16, saturation: 20, contrast: 18, fade: 4, grain: 8, vignette: 12,
    splitToning: { shadowsHue: 22, shadowsSaturation: 40, highlightsHue: 38, highlightsSaturation: 36, balance: 8 },
  },
  // Pure high-contrast Noir (no brown)
  'filter-046': { monochrome: true, contrast: 52, shadows: -28, highlights: -12, vignette: 36, grain: 12, clarity: 14 },
  // Red Heat — strong red/orange tint
  'filter-055': {
    temperature: 48, tint: 22, saturation: 28, contrast: 28, highlights: -16, vignette: 20, shadows: -8,
    splitToning: { shadowsHue: 8, shadowsSaturation: 55, highlightsHue: 22, highlightsSaturation: 45, balance: 6 },
  },
  // Peacock — vivid multi-hue separation
  'filter-073': {
    saturation: 55, vibrance: 58, contrast: 34, temperature: -14, tint: 24,
    splitToning: { shadowsHue: 195, shadowsSaturation: 78, highlightsHue: 42, highlightsSaturation: 60, balance: -18 },
    clarity: 18, shadows: 10, bloom: 14,
  },
  // Rangoli — festive multi-color
  'filter-075': {
    saturation: 52, vibrance: 48, contrast: 28, temperature: 10, tint: 16,
    splitToning: { shadowsHue: 310, shadowsSaturation: 62, highlightsHue: 48, highlightsSaturation: 55, balance: -12 },
    clarity: 14, bloom: 12,
  },
  // Anime Soft → stronger comic-leaning
  'filter-095': { style: 'comic', softBlur: 4, bloom: 10, saturation: 30, vibrance: 20, contrast: 20, temperature: 4 },
  // Comic — strong anime cel
  'filter-099': { style: 'comic', contrast: 28, saturation: 36, vibrance: 24, clarity: 10 },
  // Sketch — pure line drawing
  'filter-100': { style: 'sketch', contrast: 14, grain: 6 },
  // Yellow tint (was Cyan) — warm yellow film
  'filter-039': {
    temperature: 28, tint: -18, saturation: 18, contrast: 16, fade: 6, vignette: 10,
    splitToning: { shadowsHue: 50, shadowsSaturation: 38, highlightsHue: 55, highlightsSaturation: 32, balance: 4 },
  },
};

export const FILTER_NAME_OVERRIDES: Record<string, string> = {
  'filter-055': 'Red Heat',
  'filter-075': 'Rangoli',
  'filter-095': 'Anime',
  'filter-039': 'Yellow',
};
