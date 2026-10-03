// Central plan-tier capability config (client-safe).
// Internal id "business" displays as Master Studio (VIP / diamond badge).

import type { PlanId } from "./plans";

export type WatermarkLevel = "large-center" | "small-corner" | "tiny-corner" | "none";
export type CrownTier = "none" | "bronze" | "silver" | "gold" | "diamond";
export type DownloadFormat = "jpg" | "png" | "webp";

export type TierConfig = {
  memberLabel: string;
  crown: CrownTier;
  crownColor: string | null;
  badgeColor: string;
  watermark: WatermarkLevel;
  watermarkOpacity: number;
  maxDimension: number;
  qualityLabel: string;
  formats: DownloadFormat[];
  videoEnabled: boolean;
  videoMaxSeconds: number;
  videoQualityLabel: string;
  videoMonthlyQuota: number;
  canUploadAvatar: boolean;
};

export const TIERS: Record<PlanId, TierConfig> = {
  free: {
    memberLabel: "Free",
    crown: "none",
    crownColor: null,
    badgeColor: "#9CA3AF",
    watermark: "large-center",
    watermarkOpacity: 0.5,
    maxDimension: 1280,
    qualityLabel: "720p",
    formats: ["jpg"],
    videoEnabled: false,
    videoMaxSeconds: 0,
    videoQualityLabel: "—",
    videoMonthlyQuota: 0,
    canUploadAvatar: true,
  },
  lite: {
    memberLabel: "Lite Member",
    crown: "bronze",
    crownColor: "#CD7F32",
    badgeColor: "#CD7F32",
    watermark: "small-corner",
    watermarkOpacity: 0.25,
    maxDimension: 1920,
    qualityLabel: "1080p",
    formats: ["jpg", "png"],
    videoEnabled: true,
    videoMaxSeconds: 5,
    videoQualityLabel: "720p",
    videoMonthlyQuota: 20,
    canUploadAvatar: true,
  },
  plus: {
    memberLabel: "Plus Member",
    crown: "silver",
    crownColor: "#C0C0C0",
    badgeColor: "#94A3B8",
    watermark: "small-corner",
    watermarkOpacity: 0.2,
    maxDimension: 2560,
    qualityLabel: "2K",
    formats: ["jpg", "png", "webp"],
    videoEnabled: true,
    videoMaxSeconds: 10,
    videoQualityLabel: "1080p",
    videoMonthlyQuota: 50,
    canUploadAvatar: true,
  },
  pro: {
    memberLabel: "Pro Member",
    crown: "gold",
    crownColor: "#FFD700",
    badgeColor: "#EAB308",
    watermark: "tiny-corner",
    watermarkOpacity: 0.15,
    maxDimension: 3840,
    qualityLabel: "4K",
    formats: ["jpg", "png", "webp"],
    videoEnabled: true,
    videoMaxSeconds: 15,
    videoQualityLabel: "1080p",
    videoMonthlyQuota: 100,
    canUploadAvatar: true,
  },
  studio: {
    memberLabel: "AI Studio",
    crown: "gold",
    crownColor: "#FFD700",
    badgeColor: "#F59E0B",
    watermark: "none",
    watermarkOpacity: 0,
    maxDimension: 4096,
    qualityLabel: "4K+",
    formats: ["jpg", "png", "webp"],
    videoEnabled: true,
    videoMaxSeconds: 20,
    videoQualityLabel: "1080p",
    videoMonthlyQuota: 200,
    canUploadAvatar: true,
  },
  business: {
    memberLabel: "Master Studio",
    crown: "diamond",
    crownColor: "#B9F2FF",
    badgeColor: "#06B6D4",
    watermark: "none",
    watermarkOpacity: 0,
    maxDimension: 4096,
    qualityLabel: "Max",
    formats: ["jpg", "png", "webp"],
    videoEnabled: true,
    videoMaxSeconds: 30,
    videoQualityLabel: "1080p",
    videoMonthlyQuota: 500,
    canUploadAvatar: true,
  },
};

export function getTier(plan: PlanId | string | null | undefined): TierConfig {
  const id = (plan ?? "free") as PlanId;
  return TIERS[id] ?? TIERS.free;
}
