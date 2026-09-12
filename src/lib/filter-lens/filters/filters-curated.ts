/**
 * Curated Motio2edit AI Filters — unique looks only (~36).
 * First 5 are free AI filters. Rest are Premium or AI+.
 * Adjustment-only grades removed (use Adjust tab instead).
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
  opts: { free?: boolean; tier?: 'ai+' | 'pro' | 'premium'; animated?: boolean; cost?: number } = {},
): FilterDefinition {
  const isFree = !!opts.free;
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
    unlock: createUnlockMetadata(isFree ? 0 : opts.cost ?? 12, isFree),
    ...(isFree ? {} : { tier: opts.tier ?? 'premium' }),
    ...(opts.animated ? { animatedThumb: true } : {}),
  };
}

/** Unique curated catalog — no near-duplicate gradient variants. */
export const FILTERS_CURATED: FilterDefinition[] = [
  f('filter-001', 'Open Sky', 'Natural', 'Bright open daylight with lifted shadows.', {
    exposure: 12, shadows: 28, highlights: -8, contrast: 18, vibrance: 18, clarity: 12, temperature: 6,
  }, { free: true }),
  f('filter-002', 'True Color', 'Natural', 'Punchy true-color grade with clear midtones.', {
    contrast: 28, saturation: 22, vibrance: 18, clarity: 16, sharpening: 14,
  }, { free: true }),
  f('filter-003', 'Soft Daylight', 'Natural', 'Soft diffused daylight with gentle contrast.', {
    contrast: 14, brightness: 8, softBlur: 18, shadows: 14, temperature: 4, vignette: 12,
  }, { free: true }),
  f('filter-004', 'Portrait Soft', 'Portrait', 'Soft portrait finish with gentle skin lift.', {
    softBlur: 16, shadows: 16, temperature: 8, saturation: 6, clarity: -6,
  }, { free: true }),
  f('filter-005', 'Mono Classic', 'Black & White', 'Clean classic black and white.', {
    monochrome: true, contrast: 22, clarity: 12, grain: 8, vignette: 10,
  }, { free: true }),

  f('filter-016', 'Cinema Teal', 'Cinematic', 'Cinematic teal shadows with warm highlights.', {
    temperature: -8, tint: -6, contrast: 24, shadows: 8, vignette: 22,
  }, { tier: 'premium' }),
  f('filter-017', 'Drama Frame', 'Cinematic', 'Dramatic cinematic contrast and vignette.', {
    contrast: 30, vignette: 32, shadows: -8, highlights: -10, grain: 12,
  }, { tier: 'premium' }),
  f('filter-018', 'Film Still', 'Cinematic', 'Film-still look with soft grain.', {
    contrast: 22, grain: 18, fade: 12, temperature: 6, vignette: 18,
  }, { tier: 'ai+' }),
  f('filter-019', 'Night Scene', 'Cinematic', 'Night scene grade with cool lift.', {
    temperature: -16, shadows: 16, contrast: 20, grain: 14, vignette: 30,
  }, { tier: 'premium' }),

  f('filter-021', 'Sepia Memory', 'Vintage', 'Classic sepia with grain and vignette.', {
    sepia: 70, contrast: 22, fade: 24, grain: 26, vignette: 34,
  }, { tier: 'ai+' }),
  f('filter-022', 'Faded Polaroid', 'Vintage', 'Faded Polaroid light-leak feel.', {
    fade: 36, temperature: 24, saturation: -18, grain: 22, vignette: 40, contrast: 12,
  }, { tier: 'premium' }),
  f('filter-023', '70s Print', 'Vintage', '1970s print warmth and soft focus.', {
    temperature: 30, softBlur: 20, saturation: 18, fade: 20, grain: 18,
  }, { tier: 'premium' }),

  f('filter-bw2', 'Noir Hard', 'Black & White', 'Hard noir contrast and deep blacks.', {
    monochrome: true, contrast: 40, shadows: -16, vignette: 28, grain: 14, clarity: 16,
  }, { tier: 'premium' }),
  f('filter-bw3', 'Silver Soft', 'Black & White', 'Soft silver gelatin feel.', {
    monochrome: true, contrast: 14, fade: 18, grain: 20, softBlur: 10, vignette: 16,
  }, { tier: 'ai+' }),
  f('filter-bw4', 'Ink Wash BW', 'Black & White', 'Ink-wash monochrome depth.', {
    monochrome: true, contrast: 28, grain: 24, vignette: 36, softBlur: 8, shadows: -10,
  }, { tier: 'premium' }),

  f('filter-101', 'Ink Burst', 'Comic', 'Bold ink edges with posterized color blocks.', {
    style: 'comic', posterizeLevels: 5, edgeAmount: 55, contrast: 28, saturation: 35, vibrance: 20,
  }, { tier: 'ai+', animated: true }),
  f('filter-104', 'Comic Pop', 'Comic', 'High-pop comic color with strong edges.', {
    style: 'comic', posterizeLevels: 5, edgeAmount: 48, saturation: 42, vibrance: 28, contrast: 30,
  }, { tier: 'ai+', animated: true }),
  f('filter-105', 'Graphic Ink', 'Comic', 'Ink-heavy graphic look with desaturated fills.', {
    style: 'comic', posterizeLevels: 4, edgeAmount: 62, saturation: -12, contrast: 36, grain: 8,
  }, { tier: 'premium' }),

  f('filter-106', 'Graphite', 'Sketch', 'Soft graphite pencil tonal study.', {
    style: 'sketch', monochrome: true, edgeAmount: 55, grain: 22, contrast: 18, fade: 10,
  }, { tier: 'ai+' }),
  f('filter-108', 'Charcoal Paper', 'Sketch', 'Deep charcoal with heavy grain.', {
    style: 'sketch', monochrome: true, edgeAmount: 65, grain: 38, contrast: 28, vignette: 22,
  }, { tier: 'premium' }),
  f('filter-109', 'Ink Study', 'Sketch', 'Ink-wash sketch with strong line extraction.', {
    style: 'sketch', monochrome: true, edgeAmount: 78, contrast: 32, grain: 14, fade: 8,
  }, { tier: 'ai+' }),
  f('filter-111', 'Line Art', 'Sketch', 'Minimal line-art extraction.', {
    style: 'sketch', monochrome: true, edgeAmount: 85, contrast: 24, brightness: 8, grain: 10,
  }, { tier: 'premium' }),

  f('filter-anime', 'Anime Soft', 'Art', 'Anime-inspired soft cel shading and color pop.', {
    style: 'comic', posterizeLevels: 6, edgeAmount: 40, saturation: 38, vibrance: 30, softBlur: 10, contrast: 22,
  }, { tier: 'ai+', animated: true }),
  f('filter-114', 'Watercolor Wash', 'Art', 'Watercolor diffusion with lifted saturation.', {
    style: 'watercolor', softBlur: 55, saturation: 22, vibrance: 18, fade: 18, temperature: 6,
  }, { tier: 'ai+', animated: true }),
  f('filter-113', 'Renaissance Oil', 'Art', 'Oil-paint style with soft diffusion.', {
    style: 'oil', softBlur: 48, temperature: 18, saturation: 14, contrast: 16, vignette: 20, grain: 12,
  }, { tier: 'premium' }),
  f('filter-117', 'Flat Vector', 'Art', 'Flat vector posterization with clean edges.', {
    posterizeLevels: 4, edgeAmount: 30, saturation: 25, contrast: 22, clarity: 18,
  }, { tier: 'ai+' }),

  f('filter-119', 'CCD Memory', 'Retro', 'Early digital CCD color and soft noise.', {
    temperature: 8, saturation: 18, grain: 28, contrast: 14, fade: 12, sharpness: -6,
  }, { tier: 'ai+' }),
  f('filter-125', 'VHS Still', 'Retro', 'VHS-inspired still with soft blur.', {
    softBlur: 18, fade: 20, saturation: -6, grain: 26, contrast: 10, temperature: 4,
  }, { tier: 'ai+' }),
  f('filter-126', 'Expired Film', 'Retro', 'Expired-film color shifts and heavy grain.', {
    temperature: 20, tint: 8, fade: 26, grain: 36, saturation: -12, vignette: 22,
  }, { tier: 'premium' }),
  f('filter-129', 'Disposable 90s', 'Retro', '1990s disposable camera look.', {
    exposure: 6, contrast: 16, temperature: 12, grain: 24, vignette: 26, saturation: 10, softBlur: 8,
  }, { tier: 'ai+' }),

  f('filter-057', 'Neon Alley', 'Neon', 'Neon street glow with magenta/cyan push.', {
    style: 'neon', saturation: 30, contrast: 28, bloom: 24, temperature: -8, vignette: 20,
  }, { tier: 'premium' }),
  f('filter-056', 'Street Punch', 'Street', 'High contrast urban street grit.', {
    contrast: 36, clarity: 24, sharpening: 18, saturation: 12, vignette: 22,
  }, { tier: 'ai+' }),
  f('filter-081', 'Drama High', 'Dramatic', 'High-drama contrast and deep vignette.', {
    contrast: 40, shadows: -22, vignette: 36, clarity: 16, saturation: 8,
  }, { tier: 'premium' }),
  f('filter-086', 'Dream Soft', 'Soft', 'Dreamy soft focus with gentle bloom.', {
    softBlur: 28, bloom: 22, clarity: -16, fade: 14, contrast: -6,
  }, { tier: 'ai+' }),
  f('filter-013', 'Skin Glow', 'Portrait', 'Soft glow with skin-friendly midtones.', {
    softBlur: 12, bloom: 14, temperature: 10, shadows: 12, saturation: 6,
  }, { tier: 'premium' }),
  f('filter-096', 'Amber Dust', 'Warm', 'Warm amber midtones with soft grain.', {
    temperature: 32, tint: 8, grain: 22, vibrance: 18, contrast: 18, vignette: 16,
  }, { tier: 'ai+' }),
];
