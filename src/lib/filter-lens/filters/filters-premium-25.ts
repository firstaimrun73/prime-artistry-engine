/**
 * filters-premium-25.ts
 * Exact 25 Premium Motio2edit filter effects (product reference).
 * Graphic filters use style recipes (multi-stage). Photo-grade Premium stays photographic.
 */
import type { FilterDefinition } from './filter-types';
import { createAttribution, createUnlockMetadata } from '../shared/metadata';

const IR = { min: 0, max: 100, default: 85 } as const;

function p(
  id: string,
  name: string,
  category: FilterDefinition['category'],
  desc: string,
  profile: FilterDefinition['processingProfile'],
  animated = false,
): FilterDefinition {
  return {
    id,
    name,
    category,
    description: desc,
    visualDescription: desc,
    icon: `icon-${id}`,
    previewKey: `preview-${id}`,
    processingProfile: profile,
    intensityRange: IR,
    supportsPreview: true as const,
    supportsFullResolution: true as const,
    supportsCamera: false as const,
    developerNotes: '',
    attribution: createAttribution(),
    unlock: createUnlockMetadata(12, false),
    tier: 'premium',
    ...(animated ? { animatedThumb: true } : {}),
  };
}

/** 25 Premium filters — IDs filter-076 … filter-100 */
export const FILTERS_PREMIUM_25: FilterDefinition[] = [
  p('filter-076', 'Cinematic', 'Cinematic',
    'Movie-like tones with rich contrast, controlled highlights, and natural skin.',
    { contrast: 26, shadows: -8, highlights: -10, saturation: 6, vibrance: 10, vignette: 16, temperature: 2, clarity: 6, grain: 4 }),

  p('filter-077', 'Vintage', 'Vintage',
    'Classic retro film look — warm fade, soft contrast, analog character.',
    { temperature: 18, fade: 18, grain: 14, saturation: -10, contrast: 12, vignette: 14, sepia: 8 }),

  p('filter-078', 'B&W Classic', 'Black & White',
    'Timeless clean black and white with natural tonal range and facial detail.',
    { monochrome: true, contrast: 22, clarity: 10, shadows: 6, highlights: -6, grain: 4, vignette: 8 }),

  p('filter-079', 'Sepia', 'Vintage',
    'Warm nostalgic sepia with preserved contrast and photographic detail.',
    { sepia: 55, contrast: 14, fade: 8, grain: 8, vignette: 10, temperature: 8 }),

  p('filter-080', 'HDR', 'Dramatic',
    'Enhanced local contrast and detail with vibrant but controlled color — natural skin.',
    { contrast: 28, clarity: 22, microcontrast: 14, shadows: 12, highlights: -14, vibrance: 16, saturation: 8, sharpening: 10 }),

  p('filter-081', 'Dreamy Glow', 'Soft',
    'Soft luminous highlights with gentle bloom — preserves facial structure.',
    { bloom: 28, softBlur: 10, clarity: -8, fade: 6, temperature: 6, contrast: 8, shadows: 10, saturation: 4 }),

  p('filter-082', 'Neon', 'Neon',
    'Localized neon rim lighting on structure — not global color wash.',
    { style: 'neon' }, true),

  p('filter-083', 'Cyberpunk', 'Neon',
    'Full-frame illustrated cyberpunk — color cells, cyan/magenta palette, halftone, bold contours, neon rim.',
    { style: 'cyberpunk' }, true),

  p('filter-084', 'Aqua', 'Cool',
    'Cool teal and blue-green atmosphere with natural-looking skin.',
    { temperature: -16, tint: -10, saturation: 8, contrast: 14, shadows: 10, vibrance: 10 }),

  p('filter-085', 'Sunset', 'Sunset',
    'Golden-hour warm orange grading with soft highlights and realistic skin.',
    { temperature: 28, tint: 8, saturation: 12, highlights: -12, shadows: 10, fade: 4, vignette: 8 }),

  p('filter-086', 'Forest', 'Landscape',
    'Rich green environmental tones, earthy depth, natural skin preservation.',
    { temperature: -4, tint: 8, saturation: 14, contrast: 16, shadows: 6, vibrance: 12,
      splitToning: { shadowsHue: 120, shadowsSaturation: 18, highlightsHue: 50, highlightsSaturation: 12, balance: 0 } }),

  p('filter-087', 'Moody', 'Moody',
    'Darker cinematic shadows, muted colors, dramatic atmosphere.',
    { contrast: 24, saturation: -18, shadows: -10, vignette: 22, fade: 8, grain: 6, temperature: -4 }),

  p('filter-088', 'Pastel', 'Soft',
    'Soft pastel colors, lower contrast, gentle dreamy highlights.',
    { softBlur: 8, fade: 14, saturation: -12, temperature: 6, bloom: 12, contrast: 6, clarity: -6 }),

  p('filter-089', 'Film Grain', 'Film',
    'Authentic fine film grain with subtle film color character — sharp subjects.',
    { grain: 26, fade: 10, contrast: 14, temperature: 4, vignette: 12, saturation: -4 }),

  p('filter-090', 'Sketch', 'Sketch',
    'Full-frame graphite sketch — tonal field, stroke hierarchy, cross-hatch (not edge overlay).',
    { style: 'sketch' }),

  p('filter-091', 'Oil Painting', 'Art',
    'Full-frame oil — multi-pass brush smear, color cells, soft painterly contours.',
    { style: 'oil' }),

  p('filter-092', 'Cartoon', 'Comic',
    'Full-frame cartoon — color cells, cel bands, clean contours.',
    { style: 'cartoon' }),

  p('filter-093', 'Watercolor', 'Art',
    'Wash diffusion, pigment-style pooling, soft edges — full-frame watercolor.',
    { style: 'watercolor' }),

  p('filter-094', 'Rainbow', 'Art',
    'Smooth multicolor spectrum highlights — vibrant but subject stays clear.',
    { saturation: 26, vibrance: 30, contrast: 12, bloom: 10,
      splitToning: { shadowsHue: 280, shadowsSaturation: 40, highlightsHue: 50, highlightsSaturation: 45, balance: 0 } }, true),

  p('filter-095', 'Retro 3D', 'Art',
    'Original early-3D game-art — color cells, cel bands, baked light, soft block materials. Not affiliated with any game brand.',
    { style: 'retro3d' }, true),

  p('filter-096', 'Lens Flare', 'Cinematic',
    'Cinematic optical flare and glow that complements the frame without covering faces.',
    { bloom: 32, highlights: 8, temperature: 10, contrast: 12, softBlur: 4, vignette: 6 }),

  p('filter-097', 'Soft Focus', 'Soft',
    'Gentle optical softness and diffusion while the main subject stays attractive.',
    { softBlur: 20, clarity: -12, bloom: 10, fade: 6, contrast: 6, temperature: 4 }),

  p('filter-098', 'Film Noir', 'Black & White',
    'High-contrast monochrome noir — dramatic shadows and classic cinema lighting.',
    { monochrome: true, contrast: 38, shadows: -18, vignette: 28, grain: 10, clarity: 8, highlights: -8 }),

  p('filter-099', 'Golden Bloom', 'Portrait',
    'Warm golden highlights with soft luminous bloom and natural skin tones.',
    { temperature: 22, bloom: 24, softBlur: 6, highlights: -6, shadows: 10, saturation: 8, contrast: 10 }),

  p('filter-100', 'Crystal Clear', 'Professional',
    'Ultra-clean high-detail look — crisp natural contrast, no artificial skin.',
    { clarity: 24, sharpening: 16, contrast: 18, microcontrast: 12, vibrance: 10, shadows: 6, highlights: -6 }),
];
