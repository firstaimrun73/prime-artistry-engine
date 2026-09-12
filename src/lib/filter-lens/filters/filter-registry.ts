/**
 * filters/filter-registry.ts
 * Curated Motio2edit AI Filters registry (~36 unique looks).
 */
import { FilterDefinition, FilterCategory, FILTER_CATEGORIES } from './filter-types';
import { FILTERS_CURATED } from './filters-curated';

export const ALL_FILTERS: FilterDefinition[] = [...FILTERS_CURATED];

export function getFilterById(id: string): FilterDefinition | undefined {
  return ALL_FILTERS.find((f) => f.id === id);
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
  if (ALL_FILTERS.length < 20) {
    errors.push(`Expected at least 20 curated filters, found ${ALL_FILTERS.length}`);
  }
  const ids = new Set<string>();
  const names = new Set<string>();
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
  }
  const freeCount = getFreeFilters().length;
  if (freeCount !== 5) {
    errors.push(`Expected exactly 5 free filters, found ${freeCount}`);
  }
  return { valid: errors.length === 0, errors };
}
