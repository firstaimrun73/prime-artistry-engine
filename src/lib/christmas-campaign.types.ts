/**
 * Shared contracts between Supabase RPCs and TanStack server functions.
 */

export type CampaignStartResult = {
  ok: boolean;
  reason?: string;
  message?: string;
  sessionId?: string;
  startedAt?: string;
  claimedAt?: string | null;
  creditsGranted?: number | null;
  alreadyClaimed?: boolean;
  rewardCredits?: number;
  sessionSeconds?: number;
};

export type CampaignStatusResult = {
  ok: boolean;
  reason?: string;
  hasSession?: boolean;
  startedAt?: string;
  claimed?: boolean;
  claimedAt?: string | null;
  creditsGranted?: number | null;
  elapsedSeconds?: number;
  requiredSeconds?: number;
  remainingSeconds?: number;
  eligible?: boolean;
  campaignActive?: boolean;
  rewardCredits?: number;
  sessionSeconds?: number;
  countryAllowed?: boolean;
};

export type CampaignClaimResult = {
  ok: boolean;
  reason?: string;
  message?: string;
  creditsGranted?: number;
  newBalance?: number;
  remainingSeconds?: number;
  elapsedSeconds?: number;
  requiredSeconds?: number;
  claimedAt?: string;
};

/** Christmas gift is always exactly 25 — never accept another amount from UI. */
export const CHRISTMAS_FIXED_REWARD = 25 as const;
export const CHRISTMAS_FIXED_SESSION_SECONDS = 600 as const;
