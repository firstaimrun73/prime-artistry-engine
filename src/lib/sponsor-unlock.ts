/**
 * Free-user temporary unlock after opt-in Sponsored interaction.
 * Client session only — server still applies watermark unless keepWatermark=false
 * is allowed via matching client preference after unlock.
 *
 * Duration: 20 minutes after user confirms they completed a Sponsored offer.
 */

const KEY = "motio2edit-sponsor-unlock-until";
export const SPONSOR_UNLOCK_MINUTES = 20;

export function getSponsorUnlockUntil(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function isSponsorUnlockActive(): boolean {
  return Date.now() < getSponsorUnlockUntil();
}

export function grantSponsorUnlock(minutes = SPONSOR_UNLOCK_MINUTES): number {
  const until = Date.now() + minutes * 60 * 1000;
  try {
    localStorage.setItem(KEY, String(until));
  } catch {
    /* ignore */
  }
  return until;
}

export function clearSponsorUnlock(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function sponsorUnlockRemainingMs(): number {
  return Math.max(0, getSponsorUnlockUntil() - Date.now());
}
