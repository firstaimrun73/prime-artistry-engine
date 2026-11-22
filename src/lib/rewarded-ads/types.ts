/**
 * Rewarded-ad types — server verification required before any credit grant.
 * Provider is NOT configured; do not simulate completions.
 */

export type RewardedAdStatus =
  | "not_configured"
  | "ineligible"
  | "eligible"
  | "ad_unavailable"
  | "render_failed"
  | "not_viewable"
  | "user_closed"
  | "provider_timeout"
  | "verification_failed"
  | "duplicate"
  | "rewarded";

export type RewardedAdEligibility = {
  ok: boolean;
  status: RewardedAdStatus;
  reason?: string;
  dailyRemaining?: number;
  cooldownSeconds?: number;
};

/** Client must never set reward amount — server config only. */
export type RewardedAdCompletionPayload = {
  providerTxnId: string;
  placement: string;
  campaignId: string;
  /** Opaque signed token / signature from provider — verified server-side only */
  providerSignature?: string;
};

export const REWARDED_ADS_ENABLED = false;
