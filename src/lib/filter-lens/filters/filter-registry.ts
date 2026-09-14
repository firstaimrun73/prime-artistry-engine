/**
 * filters/filter-registry.ts
 * Motio2edit AI Filters registry — 100 unique original looks.
 * Common 40 (free) · AI+ 35 · Premium 25
 *
 * Plus generative Premium filters (separate Flux img2img pipeline):
 *   Rangoli + Wildfire, Glacier, Neon Pulse, Gold Dust,
 *   Storm Break, Bloom, Molten, Chrome Future
 */
import { FilterDefinition, FilterCategory, FILTER_CATEGORIES } from './filter-types';
import { FILTERS_CURATED } from './filters-curated';
import { FILTER_PROFILE_OVERRIDES, FILTER_NAME_OVERRIDES } from './filter-overrides';
import { RANGOLI_FILTER } from './rangoli-filter';
import {
  HIGH_IMPACT_GENERATIVE_FILTERS,
  type GenerativeFilterConfig,
} from './high-impact-generative-filters';

export const ALL_FILTERS: FilterDefinition[] = FILTERS_CURATED.map((f) => {
  const profile = FILTER_PROFILE_OVERRIDES[f.id];
  const name = FILTER_NAME_OVERRIDES[f.id];
  if (!profile && !name) return f;
  return {
    ...f,
    ...(name ? { name } : {}),
    ...(profile ? { processingProfile: { ...f.processingProfile, ...profile } } : {}),
  };
});

/** Premium generative filters (Flux img2img + ControlNet). Not part of the 100 CSS/programmatic set. */
export { RANGOLI_FILTER };
export {
  HIGH_IMPACT_GENERATIVE_FILTERS,
  WILDFIRE_FILTER,
  GLACIER_FILTER,
  NEON_PULSE_FILTER,
  GOLD_DUST_FILTER,
  STORM_BREAK_FILTER,
  BLOOM_FILTER,
  MOLTEN_FILTER,
  CHROME_FUTURE_FILTER,
} from './high-impact-generative-filters';
export type { GenerativeFilterConfig };

export const GENERATIVE_FILTERS: readonly GenerativeFilterConfig[] = [
  RANGOLI_FILTER as GenerativeFilterConfig,
  ...HIGH_IMPACT_GENERATIVE_FILTERS,
] as const;

export function getFilterById(id: string): FilterDefinition | undefined {
  return ALL_FILTERS.find((f) => f.id === id);
}

export function getGenerativeFilterById(id: string): GenerativeFilterConfig | undefined {
  return GENERATIVE_FILTERS.find((f) => f.filter_id === id);
}

export function listGenerativeFilters(): readonly GenerativeFilterConfig[] {
  return GENERATIVE_FILTERS;
}

export function getFiltersByCategory(category: FilterCategory): FilterDefinition[] {
  return ALL_FILTERS.filter((f) => f.category === category);
}

export function listFilterCategories(): FilterCategory[] {
  const present = new Set(ALL_FILTERS.map((f) => f.category));
  return FILTER_CATEGORIES.filter((c) => present.has(c));
}

export function getFreeFilters(): FilterDefinition[] {
  return ALL_FILTERS.filter((f) => f.unlock.isFree);
}

export function getLockedFilters(): FilterDefinition[] {
  return ALL_FILTERS.filter((f) => !f.unlock.isFree);
}

export interface RegistryValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFilterRegistry(): RegistryValidationResult {
  const errors: string[] = [];
  if (ALL_FILTERS.length !== 100) {
    errors.push(`Expected exactly 100 filters, found ${ALL_FILTERS.length}`);
  }
  const ids = new Set<string>();
  const names = new Set<string>();
  let common = 0, aiPlus = 0, premium = 0;
  for (const f of ALL_FILTERS) {
    if (ids.has(f.id)) errors.push(`Duplicate filter id: ${f.id}`);
    ids.add(f.id);
    if (names.has(f.name)) errors.push(`Duplicate filter name: ${f.name}`);
    names.add(f.name);
    if (!f.processingProfile || Object.keys(f.processingProfile).length === 0) {
      errors.push(`Filter ${f.id} has an empty processing profile`);
    }
    if (f.supportsCamera !== false) {
      errors.push(`Filter ${f.id} must not expose camera capability`);
    }
    if (!f.unlock.isFree && !f.tier) {
      errors.push(`Locked filter ${f.id} must declare tier (ai+|pro|premium)`);
    }
    if (f.tier && !['ai+', 'pro', 'premium'].includes(f.tier)) {
      errors.push(`Filter ${f.id} has invalid tier: ${f.tier}`);
    }
    if (f.unlock.isFree || !f.tier) common++;
    else if (f.tier === 'ai+') aiPlus++;
    else if (f.tier === 'premium' || f.tier === 'pro') premium++;
  }
  const freeCount = getFreeFilters().length;
  if (freeCount !== 40) {
    errors.push(`Expected exactly 40 free (Common) filters, found ${freeCount}`);
  }
  if (aiPlus !== 35) errors.push(`Expected 35 AI+ filters, found ${aiPlus}`);
  if (premium !== 25) errors.push(`Expected 25 Premium filters, found ${premium}`);
  if (common !== 40) errors.push(`Expected 40 Common (free/no-tier) filters, found ${common}`);
  return { valid: errors.length === 0, errors };
}
