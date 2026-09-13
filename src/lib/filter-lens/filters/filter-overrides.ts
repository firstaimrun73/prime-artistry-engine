/**
 * filter-overrides.ts — recipes merged on top of curated catalog (no UI change).
 * Rules enforced here:
 * - Pure neutral B/W / Deep B/W / Noir (monochrome last, no brown/sepia)
 * - Premium must NOT be monochrome (Black Glass / Platinum replaced)
 * - Visible Red / Green / Blue / Brown photographic tints
 * - Comic / Sketch / Peacock / Rangoli / Cyberpunk City / Night Flare / Light Clean
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
    // no temperature/tint/sepia/splitToning
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
  // Noir — AI+ dramatic mono (still pure grayscale, not Premium)
  'filter-046': {
    monochrome: true,
    contrast: 54,
    shadows: -30,
    highlights: -14,
    vignette: 36,
    grain: 12,
    clarity: 14,
  },

  // ——— Photographic color tints ———
  // Blue Tint (was Blue)
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
  // Green Tint (was Arctic)
  'filter-037': {
    temperature: -8,
    tint: 22,
    saturation: 14,
    contrast: 16,
    shadows: 10,
    vignette: 10,
    splitToning: {
      shadowsHue: 140,
      shadowsSaturation: 48,
      highlightsHue: 95,
      highlightsSaturation: 28,
      balance: -6,
    },
  },
  // Brown Tint (was Café) — intentional warm brown, NOT B/W
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
  // Red Tint / Red Heat (was Crimson)
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
  // Orange film
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
  // Yellow (was Cyan)
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

  // ——— AI+ creative looks ———
  // Peacock
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
  // Colourful Rangoli (was Prism)
  'filter-075': {
    saturation: 50,
    vibrance: 46,
    contrast: 26,
    temperature: 8,
    tint: 14,
    splitToning: {
      shadowsHue: 310,
      shadowsSaturation: 58,
      highlightsHue: 48,
      highlightsSaturation: 52,
      balance: -10,
    },
    clarity: 12,
    bloom: 10,
  },
  // Cyberpunk City (was City Reflect)
  'filter-064': {
    temperature: -18,
    tint: 18,
    contrast: 30,
    shadows: -12,
    highlights: -8,
    saturation: 22,
    vibrance: 18,
    vignette: 20,
    bloom: 14,
    splitToning: {
      shadowsHue: 280,
      shadowsSaturation: 45,
      highlightsHue: 190,
      highlightsSaturation: 50,
      balance: -4,
    },
  },
  // Dark Night Light With Flares (was Midnight)
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
  // Light Without Flare (was Soft Light)
  'filter-029': {
    exposure: 10,
    contrast: 12,
    highlights: -8,
    shadows: 16,
    softBlur: 8,
    clarity: -4,
    saturation: 4,
    temperature: 4,
    // no bloom on purpose
  },
  // Comic — anime cel
  'filter-099': {
    style: 'comic',
    contrast: 28,
    saturation: 36,
    vibrance: 24,
    clarity: 10,
  },
  // Sketch — pure pencil (no brown paper)
  'filter-100': {
    style: 'sketch',
    contrast: 14,
    grain: 6,
  },
  // Anime (was Anime Soft)
  'filter-095': {
    style: 'comic',
    softBlur: 4,
    bloom: 10,
    saturation: 28,
    vibrance: 18,
    contrast: 18,
    temperature: 4,
  },

  // ——— Premium: replace former B/W slots with luxury color looks ———
  // was Black Glass (mono) → Sapphire
  'filter-091': {
    monochrome: false,
    temperature: -16,
    tint: -6,
    contrast: 26,
    saturation: 12,
    shadows: -8,
    highlights: -6,
    vignette: 18,
    clarity: 12,
    splitToning: {
      shadowsHue: 230,
      shadowsSaturation: 35,
      highlightsHue: 200,
      highlightsSaturation: 22,
      balance: -6,
    },
  },
  // was Platinum (mono) → Champagne
  'filter-092': {
    monochrome: false,
    temperature: 14,
    tint: 6,
    contrast: 18,
    saturation: 6,
    fade: 8,
    softBlur: 6,
    vignette: 14,
    clarity: 8,
    splitToning: {
      shadowsHue: 35,
      shadowsSaturation: 22,
      highlightsHue: 45,
      highlightsSaturation: 18,
      balance: 4,
    },
  },
};

export const FILTER_NAME_OVERRIDES: Record<string, string> = {
  'filter-024': 'Blue Tint',
  'filter-025': 'Brown Tint',
  'filter-029': 'Light Clean',
  'filter-037': 'Green Tint',
  'filter-039': 'Yellow',
  'filter-043': 'Night Flare',
  'filter-055': 'Red Tint',
  'filter-064': 'Cyber City',
  'filter-075': 'Rangoli',
  'filter-091': 'Sapphire',
  'filter-092': 'Champagne',
  'filter-095': 'Anime',
};
