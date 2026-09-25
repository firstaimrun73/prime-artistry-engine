/**
 * filter-overrides.ts — processing recipes only (UI locked).
 * Common: photographic grades.
 * AI+: graphic style keys where the catalog look is transformative.
 * Premium slots 076–100 are owned by filters-premium-25.ts (not overridden here).
 *
 * NOTE: filter-064 is NOT cyberpunk — Premium Cyberpunk (filter-083) owns that look.
 */
import type { ProcessingProfile } from '../shared/processing-types';

export const FILTER_PROFILE_OVERRIDES: Record<string, ProcessingProfile> = {
  // ——— Pure neutral grayscale (Common) ———
  'filter-010': {
    monochrome: true,
    contrast: 24,
    clarity: 10,
    shadows: 6,
    highlights: -6,
    grain: 2,
    vignette: 4,
  },
  'filter-011': {
    monochrome: true,
    contrast: 44,
    shadows: -22,
    highlights: -10,
    clarity: 16,
    vignette: 18,
    grain: 4,
  },
  'filter-012': {
    monochrome: true,
    contrast: 18,
    grain: 20,
    fade: 8,
    vignette: 12,
    clarity: 6,
  },
  'filter-046': {
    monochrome: true,
    contrast: 54,
    shadows: -30,
    highlights: -14,
    vignette: 36,
    grain: 12,
    clarity: 14,
  },

  // ——— 80s retro grade (Common/AI photo era) ———
  'filter-015': {
    temperature: -6,
    tint: 18,
    contrast: 28,
    saturation: 22,
    vibrance: 18,
    fade: 12,
    grain: 18,
    vignette: 22,
    bloom: 14,
    highlights: -8,
    shadows: -6,
    softBlur: 4,
    splitToning: {
      shadowsHue: 300,
      shadowsSaturation: 48,
      highlightsHue: 185,
      highlightsSaturation: 42,
      balance: -4,
    },
  },

  // ——— Photographic tints ———
  'filter-024': {
    temperature: -34,
    tint: -12,
    shadows: 14,
    contrast: 18,
    vignette: 12,
    saturation: 10,
    splitToning: {
      shadowsHue: 215,
      shadowsSaturation: 55,
      highlightsHue: 200,
      highlightsSaturation: 28,
      balance: -8,
    },
  },
  // Green Tint — must read clearly green
  'filter-037': {
    temperature: -6,
    tint: 38,
    saturation: 28,
    vibrance: 22,
    contrast: 14,
    shadows: 12,
    highlights: -4,
    vignette: 8,
    splitToning: {
      shadowsHue: 145,
      shadowsSaturation: 72,
      highlightsHue: 110,
      highlightsSaturation: 48,
      balance: -10,
    },
  },
  'filter-025': {
    temperature: 22,
    tint: 12,
    saturation: -4,
    contrast: 14,
    fade: 10,
    grain: 8,
    vignette: 14,
    splitToning: {
      shadowsHue: 28,
      shadowsSaturation: 42,
      highlightsHue: 35,
      highlightsSaturation: 22,
      balance: 4,
    },
  },
  'filter-055': {
    temperature: 36,
    tint: 18,
    saturation: 26,
    contrast: 26,
    highlights: -14,
    vignette: 16,
    shadows: -6,
    splitToning: {
      shadowsHue: 6,
      shadowsSaturation: 52,
      highlightsHue: 18,
      highlightsSaturation: 40,
      balance: 4,
    },
  },
  'filter-038': {
    temperature: 40,
    tint: 14,
    saturation: 18,
    contrast: 16,
    fade: 4,
    grain: 6,
    vignette: 10,
    splitToning: {
      shadowsHue: 24,
      shadowsSaturation: 36,
      highlightsHue: 40,
      highlightsSaturation: 32,
      balance: 6,
    },
  },
  'filter-039': {
    temperature: 26,
    tint: -16,
    saturation: 16,
    contrast: 14,
    fade: 4,
    vignette: 8,
    splitToning: {
      shadowsHue: 48,
      shadowsSaturation: 36,
      highlightsHue: 55,
      highlightsSaturation: 30,
      balance: 2,
    },
  },

  // ——— AI+ graphic / neon (structure recipes) ———
  'filter-050': {
    style: 'neon',
    contrast: 18,
    saturation: 14,
    temperature: -10,
    shadows: -8,
  },
  'filter-051': {
    style: 'neon',
    contrast: 16,
    saturation: 12,
    temperature: -14,
  },
  'filter-052': {
    style: 'neon',
    contrast: 18,
    saturation: 16,
    temperature: 8,
  },
  // City Reflect — wet-night photo grade (NOT cyberpunk; Premium owns that)
  'filter-064': {
    contrast: 28,
    saturation: 14,
    vibrance: 12,
    temperature: -8,
    vignette: 16,
    shadows: 6,
    bloom: 12,
    splitToning: {
      shadowsHue: 220,
      shadowsSaturation: 28,
      highlightsHue: 40,
      highlightsSaturation: 22,
      balance: 0,
    },
  },

  'filter-073': {
    saturation: 52,
    vibrance: 55,
    contrast: 32,
    temperature: -12,
    tint: 20,
    splitToning: {
      shadowsHue: 195,
      shadowsSaturation: 72,
      highlightsHue: 42,
      highlightsSaturation: 55,
      balance: -16,
    },
    clarity: 16,
    shadows: 8,
    bloom: 12,
  },
  'filter-075': {
    saturation: 48,
    vibrance: 42,
    contrast: 18,
    temperature: 4,
    tint: 10,
    bloom: 12,
    splitToning: {
      shadowsHue: 285,
      shadowsSaturation: 72,
      highlightsHue: 48,
      highlightsSaturation: 68,
      balance: -12,
    },
  },
  'filter-043': {
    exposure: -8,
    contrast: 28,
    shadows: -18,
    highlights: -6,
    temperature: -10,
    bloom: 28,
    vignette: 24,
    grain: 8,
    saturation: 8,
  },
  'filter-029': {
    exposure: 10,
    contrast: 12,
    highlights: -8,
    shadows: 16,
    softBlur: 8,
    clarity: -4,
    saturation: 4,
    temperature: 4,
  },

  // NOTE: filter-076…filter-100 recipes live in filters-premium-25.ts only.
};

export const FILTER_NAME_OVERRIDES: Record<string, string> = {
  'filter-024': 'Blue Tint',
  'filter-025': 'Brown Tint',
  'filter-029': 'Light Clean',
  'filter-037': 'Green Tint',
  'filter-039': 'Yellow',
  'filter-043': 'Night Flare',
  'filter-055': 'Red Tint',
  // Was "Cyber City" — renamed to avoid duplicate with Premium Cyberpunk
  'filter-064': 'City Night',
  // Premium owns "Rangoli" — this AI+ look is Jewel Pop
  'filter-075': 'Jewel Pop',
};
