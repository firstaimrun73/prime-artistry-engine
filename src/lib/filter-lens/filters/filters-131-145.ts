/**
 * filters/filters-131-145.ts
 * Neon, Atmospheric, Premium cinematic, and specialty looks.
 */
import { FilterDefinition } from './filter-types';
import { createAttribution, createUnlockMetadata } from '../shared/metadata';

const IR = { min: 0, max: 100, default: 85 } as const;

function f(
  id: string,
  name: string,
  category: FilterDefinition['category'],
  desc: string,
  profile: FilterDefinition['processingProfile'],
  tier: 'ai+' | 'pro' | 'premium',
  animated?: boolean,
): FilterDefinition {
  return {
    id,
    name,
    category,
    description: `${name} — ${desc}`,
    visualDescription: `${name} visual character.`,
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
    tier,
    ...(animated ? { animatedThumb: true } : {}),
  };
}

export const FILTERS_131_145: FilterDefinition[] = [
  f('filter-131', 'Neon Bloom', 'Neon', 'Electric neon glow with saturated accents.', {
    style: 'neon', saturation: 40, vibrance: 28, contrast: 24, bloom: 32, vignette: 28,
  }, 'ai+', true),
  f('filter-132', 'Cyber Edge', 'Neon', 'Cyberpunk edge lighting and cool contrast.', {
    style: 'neon', temperature: -18, contrast: 32, saturation: 28, edgeAmount: 25, vignette: 30,
  }, 'ai+', true),
  f('filter-133', 'Red Neon', 'Neon', 'Dominant red neon wash with deep shadows.', {
    style: 'neon', temperature: 20, tint: 12, contrast: 28, shadows: -12, saturation: 35, vignette: 32,
  }, 'ai+'),
  f('filter-134', 'Prism Motion', 'Neon', 'Chromatic prism feel with lifted midtones.', {
    saturation: 30, vibrance: 25, contrast: 18, bloom: 22, temperature: -6, grain: 10,
  }, 'ai+', true),
  f('filter-135', 'Rainy Solitude', 'Atmospheric', 'Cool rain atmosphere with soft diffusion.', {
    temperature: -14, softBlur: 16, fade: 18, grain: 20, shadows: 14, vignette: 26, saturation: -10,
  }, 'ai+'),
  f('filter-136', 'Golden Hour', 'Atmospheric', 'Warm golden-hour light and soft highlight roll-off.', {
    temperature: 28, exposure: 6, highlights: -16, shadows: 12, saturation: 14, softBlur: 8, vignette: 14,
  }, 'pro'),
  f('filter-137', 'Dream Shift', 'Atmospheric', 'Dreamy soft focus with pastel lift.', {
    softBlur: 28, bloom: 24, fade: 20, temperature: 10, saturation: -6, grain: 8,
  }, 'ai+', true),
  f('filter-138', 'Night Atmosphere', 'Atmospheric', 'Deep night atmosphere with cool grain.', {
    temperature: -20, shadows: 20, contrast: 18, grain: 24, vignette: 34, saturation: -8,
  }, 'pro'),
  f('filter-139', 'Light Leak', 'Atmospheric', 'Analog light-leak warmth on edges.', {
    temperature: 24, exposure: 4, vignette: -10, bloom: 18, grain: 16, saturation: 12, fade: 8,
  }, 'ai+'),
  f('filter-140', 'Halation Film', 'Atmospheric', 'Film halation glow around highlights.', {
    bloom: 36, highlights: -12, temperature: 14, softBlur: 12, grain: 14, contrast: 10,
  }, 'pro'),
  f('filter-141', 'Velvet Noir', 'Cinematic', 'Luxury noir with controlled blacks and soft grain.', {
    monochrome: true, contrast: 32, shadows: -14, highlights: -10, grain: 18, vignette: 36, clarity: 12,
  }, 'premium'),
  f('filter-142', 'Cinema Gold', 'Cinematic', 'Warm cinematic grade with golden midtones.', {
    temperature: 22, contrast: 24, shadows: 10, highlights: -14, saturation: 12, vignette: 22, grain: 10,
  }, 'premium'),
  f('filter-143', 'Obsidian Film', 'Film', 'Deep film blacks with refined grain structure.', {
    contrast: 28, shadows: -12, fade: 8, grain: 22, temperature: 6, vignette: 28, clarity: 14,
  }, 'premium'),
  f('filter-144', 'Midnight Editorial', 'Moody', 'Editorial night grade with teal shadows.', {
    temperature: -10, tint: -6, contrast: 26, shadows: 8, highlights: -12, saturation: -6, vignette: 30,
  }, 'premium'),
  f('filter-145', 'Aurelia', 'Portrait', 'Luxury portrait warmth with skin-friendly lift.', {
    temperature: 14, shadows: 18, highlights: -10, softBlur: 10, saturation: 8, clarity: -6, grain: 6,
  }, 'premium'),
];
