/**
 * Rewarded ads type surface.
 * Credits are granted ONLY after trusted provider verification.
 * Client timers / clicks are never proof of an ad.
 */

/** Master switch — keep false until provider credentials + signed callbacks exist. */
export const REWARDED_ADS_ENABLED = false as const;

export type RewardedAdProvider = "monetag" | "other";

export type RewardedAdSessionStatus =
  | "created"
  | "shown"
  | "completed"
  | "failed"
  | "rejected"
  | "rewarded";

export type RewardedAdSession = {
  id: string;
  userId: string;
  provider: RewardedAdProvider;
  providerTxnId: string | null;
  status: RewardedAdSessionStatus;
  creditsGranted: number;
  createdAt: string;
  completedAt: string | null;
};

export type RewardedAdClaimResult =
  | { ok: true; creditsGranted: number; newBalance: number }
  | { ok: false; reason: string; message: string };
