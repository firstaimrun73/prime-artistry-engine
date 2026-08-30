/**
 * lenses/lens-unlock.ts — one-time unlock architecture for AI Lenses.
 */
import { getLensById } from './lens-registry';

export interface LensUnlockStore {
  isUnlocked(lensId: string): boolean;
  setUnlocked(lensId: string): void;
  getCredits(): number;
  deductCredits(amount: number): void;
}

export class InMemoryLensUnlockStore implements LensUnlockStore {
  private unlocked = new Set<string>();
  private credits: number;
  constructor(startingCredits = 0) {
    this.credits = startingCredits;
  }
  isUnlocked(lensId: string): boolean {
    return this.unlocked.has(lensId);
  }
  setUnlocked(lensId: string): void {
    this.unlocked.add(lensId);
  }
  getCredits(): number {
    return this.credits;
  }
  deductCredits(amount: number): void {
    this.credits = Math.max(0, this.credits - amount);
  }
  addCredits(amount: number): void {
    this.credits += amount;
  }
}

export function getLensUnlockCost(lensId: string): number {
  const lens = getLensById(lensId);
  if (!lens) throw new Error(`Unknown lens id: ${lensId}`);
  return lens.unlock.unlockCost;
}

export function isLensUnlocked(lensId: string, store: LensUnlockStore): boolean {
  const lens = getLensById(lensId);
  if (!lens) throw new Error(`Unknown lens id: ${lensId}`);
  if (lens.unlock.isFree) return true;
  return store.isUnlocked(lensId);
}

export function canUseLens(lensId: string, store: LensUnlockStore): boolean {
  return isLensUnlocked(lensId, store);
}

export interface LensUnlockResult {
  success: boolean;
  reason?: 'already_unlocked' | 'already_free' | 'insufficient_credits' | 'unknown_lens';
  newCreditBalance?: number;
}

export function unlockLens(lensId: string, store: LensUnlockStore): LensUnlockResult {
  const lens = getLensById(lensId);
  if (!lens) return { success: false, reason: 'unknown_lens' };
  if (lens.unlock.isFree) return { success: true, reason: 'already_free' };
  if (store.isUnlocked(lensId)) return { success: true, reason: 'already_unlocked' };
  const cost = lens.unlock.unlockCost;
  if (store.getCredits() < cost) return { success: false, reason: 'insufficient_credits' };
  store.deductCredits(cost);
  store.setUnlocked(lensId);
  return { success: true, newCreditBalance: store.getCredits() };
}
