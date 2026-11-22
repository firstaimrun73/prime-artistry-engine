/**
 * Retention systems foundation — not launched.
 * Daily challenges, limited daily spin, achievements.
 * No iPhone giveaway / lottery without legal + budget approval.
 */

export type RetentionFeatureId = "daily_challenge" | "daily_spin" | "achievements";

export type RetentionFeatureMeta = {
  id: RetentionFeatureId;
  title: string;
  description: string;
  enabled: boolean;
};

/** All disabled until product explicitly enables. */
export const RETENTION_FEATURES: RetentionFeatureMeta[] = [
  {
    id: "daily_challenge",
    title: "Daily challenge",
    description: "Complete a simple creative task for a small credit bonus.",
    enabled: false,
  },
  {
    id: "daily_spin",
    title: "Daily spin",
    description: "Limited once-per-day spin for a small reward. Not a paid lottery.",
    enabled: false,
  },
  {
    id: "achievements",
    title: "Achievements",
    description: "Track milestones (first restore, first multi-ref, etc.).",
    enabled: false,
  },
];

export function isRetentionFeatureEnabled(id: RetentionFeatureId): boolean {
  return RETENTION_FEATURES.find((f) => f.id === id)?.enabled === true;
}
