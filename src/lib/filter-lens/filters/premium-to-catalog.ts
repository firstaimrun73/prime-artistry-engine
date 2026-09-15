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
    case 'premium_01_ghibli_art':
    case 'premium_01_anime':
      return 'Art';
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

  const bases: Record<string, ProcessingProfile> = {
    premium_01_ghibli_art: {
      style: 'oil',
      temperature: 22,
      saturation: 14,
      vibrance: 16,
      bloom: 20,
      softBlur: 16,
      atmosphere: 14,
      contrast: 8,
      shadows: 6,
      fade: 4,
    },
    premium_01_anime: { style: 'anime', saturation: 16, contrast: 8 },
    premium_02_comic: { style: 'comic', saturation: 14, contrast: 14 },
    premium_03_sketch: { style: 'sketch' },
    premium_04_rangoli: {
      saturation: 38, vibrance: 32, contrast: 14, bloom: 20, temperature: 10,
      atmosphere: 14, style: undefined,
    },
    premium_05_wildfire: {
      temperature: 36, saturation: 22, contrast: 20, bloom: 26, shadows: -12,
      atmosphere: 14,
    },
    premium_06_glacier: {
      temperature: -32, tint: -10, saturation: -4, contrast: 18, bloom: 16,
      atmosphere: 18,
    },
    premium_07_neonpulse: {
      style: 'neon', contrast: 26, saturation: 24, bloom: 24, temperature: -12,
    },
    premium_08_golddust: {
      temperature: 32, saturation: 16, bloom: 28, contrast: 14, fade: 8,
    },
    premium_09_stormbreak: {
      contrast: 32, shadows: -18, temperature: -14, atmosphere: 20, vignette: 26,
    },
    premium_10_bloom: {
      bloom: 42, softBlur: 16, saturation: 12, fade: 12, contrast: -8,
    },
    premium_11_molten: {
      temperature: 40, contrast: 22, shadows: -14, bloom: 20, saturation: 16,
    },
    premium_12_chromefuture: {
      saturation: -28, contrast: 24, clarity: 22, temperature: -10, bloom: 10,
    },
    premium_13_velvetnoir: {
      monochrome: true, contrast: 36, vignette: 32, grain: 18, shadows: -16,
    },
    premium_14_oilcanvas: { style: 'oil', saturation: 16, softBlur: 26, contrast: 10 },
    premium_15_watercolorbloom: { style: 'watercolor', saturation: 20, softBlur: 32, fade: 14 },
    premium_16_duotonepulse: {
      contrast: 22, posterizeLevels: 5, saturation: 10,
      duotone: { shadow: [30, 20, 60], highlight: [255, 200, 120] },
    },
    premium_17_infrareddream: {
      temperature: -18, saturation: 26, tint: 14, bloom: 18, contrast: 12,
    },
    premium_18_mirage: {
      temperature: 26, softBlur: 12, atmosphere: 22, saturation: 12, fade: 8,
    },
    premium_19_auroraveil: {
      saturation: 22, vibrance: 20, bloom: 26, temperature: -8, atmosphere: 18,
    },
    premium_20_copperpatina: {
      temperature: 22, tint: 12, saturation: -6, contrast: 16, grain: 12,
    },
    premium_21_galaxydrift: {
      saturation: 24, bloom: 28, temperature: -14, atmosphere: 20, contrast: 12,
    },
    premium_22_vintage8mm: {
      sepia: 22, grain: 32, fade: 16, vignette: 28, contrast: 12, temperature: 14,
    },
    premium_23_porcelainart: {
      softBlur: 18, contrast: -6, saturation: 8, bloom: 14, fade: 8,
    },
    premium_24_origamifold: {
      posterizeLevels: 5, contrast: 20, edgeAmount: 22, saturation: -12,
    },
    premium_25_bioluminescence: {
      contrast: 18, bloom: 34, temperature: -22, saturation: 16, shadows: 12,
    },
  };

  const base = bases[p.filter_id] ?? { contrast: 12, saturation: 10 };
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
    unlock: createUnlockMetadata(p.credit_cost, false),
    tier: 'premium',
    animatedThumb: p.priority === 'P0',
  };
}

/** Premium filters as catalog-ready FilterDefinitions */
export const PREMIUM_AS_FILTERS: FilterDefinition[] = ALL_PREMIUM_FILTERS.map(premiumToFilterDefinition);

/** Combined catalog: original base + Premium (UI still uses same components) */
export function getCatalogWithPremium(base: FilterDefinition[]): FilterDefinition[] {
  const existingIds = new Set(base.map((f) => f.id));
  const extra = PREMIUM_AS_FILTERS.filter((f) => !existingIds.has(f.id));
  return [...base, ...extra];
}
