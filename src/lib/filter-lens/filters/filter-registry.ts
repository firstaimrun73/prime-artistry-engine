/**
 * filters/filter-registry.ts
 * Merges all filter definition files into a single registry.
 */
import { FilterDefinition, FilterCategory, FILTER_CATEGORIES } from './filter-types';
import { FILTERS_001_025 } from './filters-001-025';
import { FILTERS_026_050 } from './filters-026-050';
import { FILTERS_051_075 } from './filters-051-075';
import { FILTERS_076_100 } from './filters-076-100';

export const ALL_FILTERS: FilterDefinition[] = [
  ...FILTERS_001_025,
  ...FILTERS_026_050,
  ...FILTERS_051_075,
  ...FILTERS_076_100,
];

export function getFilterById(id: string): FilterDefinition | undefined {
  return ALL_FILTERS.find((f) => f.id === id);
}

export function getFiltersByCategory(category: FilterCategory): FilterDefinition[] {
  return ALL_FILTERS.filter((f) => f.category === category);
}

export function listFilterCategories(): FilterCategory[] {
  return FILTER_CATEGORIES;
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
  }
  for (const category of FILTER_CATEGORIES) {
    const inCategory = getFiltersByCategory(category);
    if (inCategory.length !== 5) {
      errors.push(`Category ${category} has ${inCategory.length} filters, expected 5`);
    }
  }
  const freeCount = getFreeFilters().length;
  if (freeCount !== 10) {
    errors.push(`Expected exactly 10 free filters, found ${freeCount}`);
  }
  return { valid: errors.length === 0, errors };
}
