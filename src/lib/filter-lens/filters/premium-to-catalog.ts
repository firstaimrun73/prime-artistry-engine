/**
 * premium-to-catalog.ts
 * Converts Premium recipe definitions into FilterDefinition objects
 * so they appear in the existing Filters UI without any layout/icon changes.
 */
import type { FilterDefinition, FilterCategory } from './filter-types';
import type { ProcessingProfile } from '../shared/processing-types';
import { createAttribution, createUnlockMetadata } from '../shared/metadata';
import { ALL_PREMIUM_FILTERS, type PremiumFilterDefinition } from './premium-filters-registry';

/** Map Premium category → existing UI category buckets */
function mapCategory(p: PremiumFilterDefinition): FilterCategory {
  switch (p.filter_id) {
    case 'premium_01_anime':
    case 'premium_02_comic':
      return 'Comic';
    case 'premium_03_sketch':
      return 'Sketch';
    case 'premium_04_rangoli':
    case 'premium_07_neonpulse':
    case 'premium_10_bloom':
    case 'premium_16_duotonepulse':
    case 'premium_19_auroraveil':
    case 'premium_21_galaxydrift':
    case 'premium_25_bioluminescence':
      return 'Art';
    case 'premium_05_wildfire':
    case 'premium_06_glacier':
    case 'premium_09_stormbreak':
    case 'premium_11_molten':
    case 'premium_18_mirage':
      return 'Atmospheric';
    case 'premium_08_golddust':
    case 'premium_12_chromefuture':
    case 'premium_20_copperpatina':
      return 'Dramatic';
    case 'premium_13_velvetnoir':
      return 'Black & White';
    case 'premium_14_oilcanvas':
    case 'premium_15_watercolorbloom':
    case 'premium_23_porcelainart':
      return 'Art';
    case 'premium_17_infrareddream':
      return 'Atmospheric';
    case 'premium_22_vintage8mm':
      return 'Film';
    case 'premium_24_origamifold':
      return 'Art';
    default:
      return 'Art';
  }
}

/** Build a usable ProcessingProfile from Premium styleKey + defaults */
function profileFromPremium(p: PremiumFilterDefinition): ProcessingProfile {
  const style = p.styleKey && p.styleKey !== 'none' ? p.styleKey : undefined;

  // Base atmospheric / color grades for hybrid & non-style filters
  const bases: Record<string, ProcessingProfile> = {
    premium_04_rangoli: {
      saturation: 35, vibrance: 28, contrast: 12, bloom: 18, temperature: 8,
      atmosphere: 12, style: undefined,
    },
    premium_05_wildfire: {
      temperature: 32, saturation: 18, contrast: 16, bloom: 22, shadows: -8,
      atmosphere: 10,
    },
    premium_06_glacier: {
      temperature: -28, tint: -8, saturation: -6, contrast: 14, bloom: 12,
      atmosphere: 14,
    },
    premium_07_neonpulse: {
      style: 'neon', contrast: 22, saturation: 20, bloom: 20, temperature: -10,
    },
    premium_08_golddust: {
      temperature: 28, saturation: 14, bloom: 24, contrast: 10, fade: 6,
    },
    premium_09_stormbreak: {
      contrast: 28, shadows: -14, temperature: -12, atmosphere: 16, vignette: 22,
    },
    premium_10_bloom: {
      bloom: 36, softBlur: 12, saturation: 10, fade: 10, contrast: -6,
    },
    premium_11_molten: {
      temperature: 36, contrast: 18, shadows: -10, bloom: 16, saturation: 12,
    },
    premium_12_chromefuture: {
      saturation: -25, contrast: 20, clarity: 18, temperature: -8, bloom: 8,
    },
    premium_13_velvetnoir: {
      monochrome: true, contrast: 32, vignette: 28, grain: 16, shadows: -12,
    },
    premium_14_oilcanvas: { style: 'oil', saturation: 12, softBlur: 22 },
    premium_15_watercolorbloom: { style: 'watercolor', saturation: 16, softBlur: 28, fade: 12 },
    premium_16_duotonepulse: {
      contrast: 18, posterizeLevels: 6, saturation: 8,
      duotone: { shadow: [30, 20, 60], highlight: [255, 200, 120] },
    },
    premium_17_infrareddream: {
      temperature: -15, saturation: 22, tint: 12, bloom: 14, contrast: 10,
    },
    premium_18_mirage: {
      temperature: 22, softBlur: 8, atmosphere: 18, saturation: 8, fade: 6,
    },
    premium_19_auroraveil: {
      saturation: 18, vibrance: 16, bloom: 20, temperature: -6, atmosphere: 14,
    },
    premium_20_copperpatina: {
      temperature: 18, tint: 10, saturation: -8, contrast: 12, grain: 10,
    },
    premium_21_galaxydrift: {
      saturation: 20, bloom: 22, temperature: -12, atmosphere: 16, contrast: 8,
    },
    premium_22_vintage8mm: {
      sepia: 18, grain: 28, fade: 14, vignette: 24, contrast: 10, temperature: 12,
    },
    premium_23_porcelainart: {
      softBlur: 14, contrast: -4, saturation: 6, bloom: 10, fade: 6,
    },
    premium_24_origamifold: {
      posterizeLevels: 5, contrast: 16, edgeAmount: 18, saturation: -10,
    },
    premium_25_bioluminescence: {
      contrast: 14, bloom: 28, temperature: -18, saturation: 12, shadows: 10,
    },
    premium_01_anime: { style: 'anime', saturation: 16, contrast: 8 },
    premium_02_comic: { style: 'comic', saturation: 14, contrast: 14 },
    premium_03_sketch: { style: 'sketch' },
  };

  const base = bases[p.filter_id] ?? { contrast: 10, saturation: 8 };
  if (style) base.style = style;
  return base;
}

export function premiumToFilterDefinition(p: PremiumFilterDefinition): FilterDefinition {
  return {
    id: p.filter_id,
    name: p.display_name,
    category: mapCategory(p),
    description: p.description,
    visualDescription: p.visualDescription,
    icon: `icon-${p.filter_id}`,
    previewKey: `preview-${p.filter_id}`,
    processingProfile: profileFromPremium(p),
    intensityRange: p.intensityRange,
    supportsPreview: true,
    supportsFullResolution: true,
    supportsCamera: false,
    developerNotes: p.recipeNotes ?? '',
    attribution: createAttribution(),
    unlock: createUnlockMetadata(p.credit_cost, false), // locked, premium
    tier: 'premium',
    animatedThumb: p.priority === 'P0',
  };
}

/** All 25 Premium filters as catalog-ready FilterDefinitions */
export const PREMIUM_AS_FILTERS: FilterDefinition[] = ALL_PREMIUM_FILTERS.map(premiumToFilterDefinition);

/** Combined catalog: original 100 + 25 Premium (UI still uses same components) */
export function getCatalogWithPremium(base: FilterDefinition[]): FilterDefinition[] {
  const existingIds = new Set(base.map((f) => f.id));
  const extra = PREMIUM_AS_FILTERS.filter((f) => !existingIds.has(f.id));
  return [...base, ...extra];
}
