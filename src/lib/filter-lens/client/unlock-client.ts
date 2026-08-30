/**
 * Client unlock persistence (per-user localStorage) + credit balance bridge.
 * Unlock purchases must still deduct server credits via unlock.functions.
 * Free items never need the server.
 */
import type { UnlockStore } from "@/lib/filter-lens/filters/filter-unlock";
import type { LensUnlockStore } from "@/lib/filter-lens/lenses/lens-unlock";

function storageKey(userId: string, kind: "filter" | "lens") {
  return `motio2edit:${kind}-unlocks:${userId}`;
}

function readSet(userId: string, kind: "filter" | "lens"): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId, kind));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSet(userId: string, kind: "filter" | "lens", set: Set<string>) {
  try {
    localStorage.setItem(storageKey(userId, kind), JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export class ClientFilterUnlockStore implements UnlockStore {
  private unlocked: Set<string>;
  constructor(
    private userId: string,
    private credits: number,
    private onCredits?: (n: number) => void,
  ) {
    this.unlocked = readSet(userId, "filter");
  }
  isUnlocked(filterId: string): boolean {
    return this.unlocked.has(filterId);
  }
  setUnlocked(filterId: string): void {
    this.unlocked.add(filterId);
    writeSet(this.userId, "filter", this.unlocked);
  }
  getCredits(): number {
    return this.credits;
  }
  deductCredits(amount: number): void {
    this.credits = Math.max(0, this.credits - amount);
    this.onCredits?.(this.credits);
  }
  markUnlockedFromServer(filterId: string, newCredits: number) {
    this.setUnlocked(filterId);
    this.credits = newCredits;
    this.onCredits?.(newCredits);
  }
}

export class ClientLensUnlockStore implements LensUnlockStore {
  private unlocked: Set<string>;
  constructor(
    private userId: string,
    private credits: number,
    private onCredits?: (n: number) => void,
  ) {
    this.unlocked = readSet(userId, "lens");
  }
  isUnlocked(lensId: string): boolean {
    return this.unlocked.has(lensId);
  }
  setUnlocked(lensId: string): void {
    this.unlocked.add(lensId);
    writeSet(this.userId, "lens", this.unlocked);
  }
  getCredits(): number {
    return this.credits;
  }
  deductCredits(amount: number): void {
    this.credits = Math.max(0, this.credits - amount);
    this.onCredits?.(this.credits);
  }
  markUnlockedFromServer(lensId: string, newCredits: number) {
    this.setUnlocked(lensId);
    this.credits = newCredits;
    this.onCredits?.(newCredits);
  }
}
