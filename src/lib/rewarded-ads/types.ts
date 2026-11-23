/** Rewarded ads types. Credits ONLY after trusted provider verification. */
export const REWARDED_ADS_ENABLED = false as const;
export type RewardedAdProvider = "monetag" | "other";
export type RewardedAdSessionStatus =
  | "created" | "shown" | "completed" | "failed" | "rejected" | "rewarded";
export type RewardedAdCallbackPayload = {
  providerTxnId: string;
  userId: string;
  sessionId: string;
  signature: string;
  completedAt: string;
  raw?: unknown;
};
