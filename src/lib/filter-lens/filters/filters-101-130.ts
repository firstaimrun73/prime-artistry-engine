/**
 * filters/filters-101-130.ts
 * Comic, Sketch, Art, Retro — original Motio2edit looks.
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
    id, name, category,
    description: `${name} — ${desc}`,
    visualDescription: `${name} visual character.`,
    icon: `icon-${id}`, previewKey: `preview-${id}`,
    processingProfile: profile, intensityRange: IR,
    supportsPreview: true as const, supportsFullResolution: true as const,
    supportsCamera: false as const, developerNotes: '',
    attribution: createAttribution(),
    unlock: createUnlockMetadata(12, false), tier,
    ...(animated ? { animatedThumb: true } : {}),
  };
}

export const FILTERS_101_130: FilterDefinition[] = [
  f('filter-101', 'Ink Burst', 'Comic', 'Bold ink edges with posterized color blocks.', {
    style: 'comic', posterizeLevels: 5, edgeAmount: 55, contrast: 28, saturation: 35, vibrance: 20,
  }, 'ai+', true),
  f('filter-102', 'Clean Line', 'Comic', 'Clean graphic line art with restrained fill.', {
    style: 'comic', posterizeLevels: 4, edgeAmount: 70, contrast: 32, saturation: 18, clarity: 20,
  }, 'ai+'),
  f('filter-103', 'Halftone Hero', 'Comic', 'Halftone-inspired posterization and punchy contrast.', {
    posterizeLevels: 6, contrast: 40, saturation: 28, edgeAmount: 35, grain: 12, vignette: 18,
  }, 'ai+'),
  f('filter-104', 'Comic Pop', 'Comic', 'High-pop comic color with strong edge reinforcement.', {
    style: 'comic', posterizeLevels: 5, edgeAmount: 48, saturation: 42, vibrance: 28, contrast: 30,
  }, 'ai+', true),
  f('filter-105', 'Graphic Ink', 'Comic', 'Ink-heavy graphic look with desaturated fills.', {
    style: 'comic', posterizeLevels: 4, edgeAmount: 62, saturation: -12, contrast: 36, grain: 8,
  }, 'pro'),
  f('filter-106', 'Graphite', 'Sketch', 'Soft graphite pencil tonal study.', {
    style: 'sketch', monochrome: true, edgeAmount: 55, grain: 22, contrast: 18, fade: 10,
  }, 'ai+'),
  f('filter-107', 'Soft Pencil', 'Sketch', 'Gentle pencil shading with paper-like grain.', {
    style: 'sketch', monochrome: true, edgeAmount: 40, grain: 28, softBlur: 12, contrast: 12,
  }, 'ai+'),
  f('filter-108', 'Charcoal Paper', 'Sketch', 'Deep charcoal with heavy grain and edge weight.', {
    style: 'sketch', monochrome: true, edgeAmount: 65, grain: 38, contrast: 28, vignette: 22,
  }, 'pro'),
  f('filter-109', 'Ink Study', 'Sketch', 'Ink-wash sketch with strong line extraction.', {
    style: 'sketch', monochrome: true, edgeAmount: 78, contrast: 32, grain: 14, fade: 8,
  }, 'ai+'),
  f('filter-110', 'Dry Brush', 'Sketch', 'Dry-brush sketch feel with textured grain.', {
    style: 'sketch', monochrome: true, edgeAmount: 50, grain: 32, softBlur: 8, contrast: 20,
  }, 'ai+'),
  f('filter-111', 'Line Art', 'Sketch', 'Minimal line-art extraction over soft base.', {
    style: 'sketch', monochrome: true, edgeAmount: 85, contrast: 24, brightness: 8, grain: 10,
  }, 'pro'),
  f('filter-112', 'Cross Hatch', 'Sketch', 'Hatch-like contrast and structured grain.', {
    style: 'sketch', monochrome: true, edgeAmount: 58, contrast: 36, grain: 26, clarity: 16,
  }, 'ai+'),
  f('filter-113', 'Renaissance Oil', 'Art', 'Oil-paint style with soft diffusion and warm tone.', {
    style: 'oil', softBlur: 48, temperature: 18, saturation: 14, contrast: 16, vignette: 20, grain: 12,
  }, 'premium'),
  f('filter-114', 'Watercolor Wash', 'Art', 'Watercolor diffusion with lifted saturation.', {
    style: 'watercolor', softBlur: 55, saturation: 22, vibrance: 18, fade: 18, temperature: 6,
  }, 'ai+', true),
  f('filter-115', 'Pastel Bloom', 'Art', 'Soft pastel palette with gentle bloom.', {
    softBlur: 30, bloom: 28, saturation: -8, temperature: 12, fade: 22, grain: 10, vignette: 14,
  }, 'pro'),
  f('filter-116', 'Digital Airbrush', 'Art', 'Smooth airbrush finish with selective clarity.', {
    softBlur: 22, clarity: -10, saturation: 12, shadows: 16, highlights: -8, grain: 6,
  }, 'pro'),
  f('filter-117', 'Flat Vector', 'Art', 'Flat vector posterization with clean edges.', {
    posterizeLevels: 4, edgeAmount: 30, saturation: 25, contrast: 22, clarity: 18,
  }, 'ai+'),
  f('filter-118', 'Halftone Print', 'Art', 'Print-style halftone with grain and fade.', {
    posterizeLevels: 7, grain: 24, fade: 16, contrast: 26, edgeAmount: 25, vignette: 16,
  }, 'pro'),
  f('filter-119', 'CCD Memory', 'Retro', 'Early digital CCD color and soft noise.', {
    temperature: 8, saturation: 18, grain: 28, contrast: 14, fade: 12, sharpness: -6,
  }, 'ai+'),
  f('filter-120', 'Pocket Film', 'Retro', 'Compact camera flash-and-film hybrid.', {
    exposure: 8, contrast: 20, temperature: 16, grain: 22, vignette: 28, saturation: 12,
  }, 'pro'),
  f('filter-121', 'Flashback 01', 'Retro', 'Direct flash with lifted midtones and cool shadows.', {
    exposure: 10, shadows: 18, temperature: -6, contrast: 22, grain: 18, vignette: 24,
  }, 'ai+'),
  f('filter-122', 'Sunset Negative', 'Retro', 'Warm negative-style fade and soft focus.', {
    temperature: 32, fade: 28, softBlur: 14, saturation: -10, grain: 20, vignette: 20,
  }, 'pro'),
  f('filter-123', 'Analog Dust', 'Retro', 'Dusty analog with heavy grain and light leak feel.', {
    grain: 42, fade: 24, temperature: 14, vignette: 32, contrast: 12, saturation: -8,
  }, 'ai+'),
  f('filter-124', 'Faded Summer', 'Retro', 'Faded summer print with lifted blacks.', {
    fade: 34, temperature: 22, saturation: -14, grain: 16, vignette: 18, shadows: 12,
  }, 'pro'),
  f('filter-125', 'VHS Still', 'Retro', 'VHS-inspired still with soft blur and chroma shift feel.', {
    softBlur: 18, fade: 20, saturation: -6, grain: 26, contrast: 10, temperature: 4,
  }, 'ai+'),
  f('filter-126', 'Expired Film', 'Retro', 'Expired-film color shifts and heavy grain.', {
    temperature: 20, tint: 8, fade: 26, grain: 36, saturation: -12, vignette: 22,
  }, 'pro'),
  f('filter-127', 'Wet Plate', 'Retro', 'Collodion wet-plate inspired monochrome depth.', {
    monochrome: true, contrast: 28, grain: 30, vignette: 40, softBlur: 10, shadows: -8,
  }, 'premium'),
  f('filter-128', 'Polaroid Fade', 'Retro', 'Instant print contrast and warm border falloff.', {
    contrast: 18, temperature: 24, fade: 22, vignette: 36, grain: 14, saturation: 8,
  }, 'pro'),
  f('filter-129', 'Disposable 90s', 'Retro', '1990s disposable camera look.', {
    exposure: 6, contrast: 16, temperature: 12, grain: 24, vignette: 26, saturation: 10, softBlur: 8,
  }, 'ai+'),
  f('filter-130', 'Night CCD', 'Retro', 'CCD night-shot noise and cool lift.', {
    temperature: -12, shadows: 22, grain: 34, contrast: 14, exposure: 8, fade: 10,
  }, 'ai+', true),
];
