/**
 * filters/filter-unlock.ts
 *
 * Portable, one-time-unlock architecture for filters. This module does
 * NOT connect to Supabase or any specific backend — it defines a small
 * `UnlockStore` interface that Grok can implement against the production
 * database, plus a default in-memory implementation useful for local
 * development, tests, and demos.
 *
 * Contract:
 *  - The first 10 filters (by catalog order) are free and always usable.
 *  - All other filters require a one-time unlock spend (in "credits").
 *  - Once unlocked, a filter is never charged again — there is no
 *    per-use/per-photo charge.
 */

import { getFilterById, getFreeFilters } from './filter-registry';

export interface UnlockStore {
  /** Returns true if this filter id has previously been unlocked for the user. */
  isUnlocked(filterId: string): boolean;
  /** Persists that this filter id is now unlocked for the user. */
  setUnlocked(filterId: string): void;
  /** Returns the user's current credit balance. */
  getCredits(): number;
  /** Deducts credits (caller has already validated sufficient balance). */
  deductCredits(amount: number): void;
}

/** Simple in-memory store — replace with a real persistence-backed store in production. */
export class InMemoryUnlockStore implements UnlockStore {
  private unlocked = new Set<string>();
  private credits: number;

  constructor(startingCredits = 0) {
    this.credits = startingCredits;
  }

  isUnlocked(filterId: string): boolean {
    return this.unlocked.has(filterId);
  }

  setUnlocked(filterId: string): void {
    this.unlocked.add(filterId);
  }

  getCredits(): number {
    return this.credits;
  }

  deductCredits(amount: number): void {
    this.credits = Math.max(0, this.credits - amount);
  }

  /** Test/demo helper for topping up credits. */
  addCredits(amount: number): void {
    this.credits += amount;
  }
}

export function getFilterUnlockCost(filterId: string): number {
  const filter = getFilterById(filterId);
  if (!filter) throw new Error(`Unknown filter id: ${filterId}`);
  return filter.unlock.unlockCost;
}

export function isFilterUnlocked(filterId: string, store: UnlockStore): boolean {
  const filter = getFilterById(filterId);
  if (!filter) throw new Error(`Unknown filter id: ${filterId}`);
  if (filter.unlock.isFree) return true;
  return store.isUnlocked(filterId);
}

/** Can this filter be applied right now (already free, or already unlocked)? */
export function canUseFilter(filterId: string, store: UnlockStore): boolean {
  return isFilterUnlocked(filterId, store);
}

export interface UnlockResult {
  success: boolean;
  reason?: 'already_unlocked' | 'already_free' | 'insufficient_credits' | 'unknown_filter';
  newCreditBalance?: number;
}

/**
 * Performs a one-time unlock. Idempotent: calling this again on an
 * already-unlocked (or free) filter succeeds without charging again.
 */
export function unlockFilter(filterId: string, store: UnlockStore): UnlockResult {
  const filter = getFilterById(filterId);
  if (!filter) return { success: false, reason: 'unknown_filter' };

  if (filter.unlock.isFree) {
    return { success: true, reason: 'already_free' };
  }
  if (store.isUnlocked(filterId)) {
    return { success: true, reason: 'already_unlocked' };
  }
  const cost = filter.unlock.unlockCost;
  if (store.getCredits() < cost) {
    return { success: false, reason: 'insufficient_credits' };
  }
  store.deductCredits(cost);
  store.setUnlocked(filterId);
  return { success: true, newCreditBalance: store.getCredits() };
}

/** Convenience: ids of the always-free starter filters. */
export function getFreeFilterIds(): string[] {
  return getFreeFilters().map((f) => f.id);
}
