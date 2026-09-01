/**
 * lenses/lens-registry.ts
 */
import { LensDefinition, LensSpecialty } from './lens-types';
import { LENSES_001_010 } from './lenses-001-010';
import { LENSES_011_020 } from './lenses-011-020';
import { LENSES_021_040 } from './lenses-021-040';

export const ALL_LENSES: LensDefinition[] = [...LENSES_001_010, ...LENSES_011_020, ...LENSES_021_040];

export function getLensById(id: string): LensDefinition | undefined {
  return ALL_LENSES.find((l) => l.id === id);
}

export function getLensesBySpecialty(specialty: LensSpecialty): LensDefinition[] {
  return ALL_LENSES.filter((l) => l.specialty === specialty);
}

export function listLensSpecialties(): LensSpecialty[] {
  return Array.from(new Set(ALL_LENSES.map((l) => l.specialty)));
}

export function getFreeLenses(): LensDefinition[] {
  return ALL_LENSES.filter((l) => l.unlock.isFree);
}

export interface RegistryValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateLensRegistry(): RegistryValidationResult {
  const errors: string[] = [];
  // Partial catalog is allowed until lenses-021-040 is fully populated.
  if (ALL_LENSES.length < 1) {
    errors.push(`Expected at least 1 lens, found ${ALL_LENSES.length}`);
  }
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const l of ALL_LENSES) {
    if (ids.has(l.id)) errors.push(`Duplicate lens id: ${l.id}`);
    ids.add(l.id);
    if (names.has(l.name)) errors.push(`Duplicate lens name: ${l.name}`);
    names.add(l.name);
    if (!l.processingProfile || Object.keys(l.processingProfile).length === 0) {
      errors.push(`Lens ${l.id} has an empty processing profile`);
    }
    if (l.supportsCamera !== true) {
      errors.push(`Lens ${l.id} must expose camera capability`);
    }
  }
  return { valid: errors.length === 0, errors };
}
