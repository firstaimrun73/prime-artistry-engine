/**
 * shared/metadata.ts
 *
 * Common metadata shapes used by both filters and lenses, plus small
 * helpers for building attribution blocks and unlock metadata consistently.
 *
 * IMPORTANT: This module makes no ownership claims over third-party
 * technology or trademarks. It only tags content as originating from the
 * Motio2edit project itself.
 */

export interface AttributionMetadata {
  createdFor: 'Motio2edit';
  designOrigin: 'Original Motio2edit visual design';
  developer: 'Motio2edit Team';
  /** Free-form note, e.g. version or generation batch. Never a legal claim. */
  note?: string;
}

export function createAttribution(note?: string): AttributionMetadata {
  return {
    createdFor: 'Motio2edit',
    designOrigin: 'Original Motio2edit visual design',
    developer: 'Motio2edit Team',
    ...(note ? { note } : {}),
  };
}

/** Shared unlock metadata shape reused by both filters and lenses. */
export interface UnlockMetadata {
  unlockCost: number;
  currencyType: 'credits';
  isFree: boolean;
  /**
   * Static/default unlock state as shipped with the definition. Actual
   * runtime unlock state is tracked by the unlock store (see
   * filters/filter-unlock.ts and lenses/lens-unlock.ts), not here.
   */
  isUnlockedByDefault: boolean;
}

export function createUnlockMetadata(unlockCost: number, isFree: boolean): UnlockMetadata {
  return {
    unlockCost: isFree ? 0 : unlockCost,
    currencyType: 'credits',
    isFree,
    isUnlockedByDefault: isFree,
  };
}
