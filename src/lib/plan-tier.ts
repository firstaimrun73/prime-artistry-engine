// Central plan-tier capability config (client-safe).
// Internal id "business" displays as Studio+ (VIP / diamond badge).

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
    canUploadAvatar: false,
  },
  lite: {
    memberLabel: "Lite Member",
    crown: "none",
    crownColor: null,
    badgeColor: "#9CA3AF",
    watermark: "none",
    watermarkOpacity: 0,
    maxDimension: 1920,
    qualityLabel: "1080p",
    formats: ["jpg", "png"],
    videoEnabled: false,
    videoMaxSeconds: 0,
    videoQualityLabel: "—",
    videoMonthlyQuota: 0,
    canUploadAvatar: true,
  },
  plus: {
    memberLabel: "Plus Member",
    crown: "bronze",
    crownColor: "#CD7F32",
    badgeColor: "#CD7F32",
    watermark: "small-corner",
    watermarkOpacity: 0.3,
    maxDimension: 1920,
    qualityLabel: "1080p",
    formats: ["jpg", "png"],
    videoEnabled: true,
    videoMaxSeconds: 10,
    videoQualityLabel: "480p",
    videoMonthlyQuota: 5,
    canUploadAvatar: true,
  },
  pro: {
    memberLabel: "Pro Member",
    crown: "silver",
    crownColor: "#C0C0C0",
    badgeColor: "#C0C0C0",
    watermark: "tiny-corner",
    watermarkOpacity: 0.2,
    maxDimension: 2560,
    qualityLabel: "2K",
    formats: ["jpg", "png", "webp"],
    videoEnabled: true,
    videoMaxSeconds: 30,
    videoQualityLabel: "1080p",
    videoMonthlyQuota: 20,
    canUploadAvatar: true,
  },
  studio: {
    memberLabel: "Studio Member",
    crown: "gold",
    crownColor: "#FFD700",
    badgeColor: "#FFD700",
    watermark: "tiny-corner",
    watermarkOpacity: 0.12,
    maxDimension: 3840,
    qualityLabel: "4K",
    formats: ["jpg", "png", "webp"],
    videoEnabled: true,
    videoMaxSeconds: 60,
    videoQualityLabel: "4K",
    videoMonthlyQuota: 50,
    canUploadAvatar: true,
  },
  business: {
    memberLabel: "Studio+ Member",
    crown: "diamond",
    crownColor: "#B9F2FF",
    badgeColor: "#B9F2FF",
    watermark: "none",
    watermarkOpacity: 0,
    maxDimension: 3840,
    qualityLabel: "4K Ultra",
    formats: ["jpg", "png", "webp"],
    videoEnabled: true,
    videoMaxSeconds: 120,
    videoQualityLabel: "4K Ultra",
    videoMonthlyQuota: Infinity,
    canUploadAvatar: true,
  },
};

export function getTier(plan: PlanId | null | undefined): TierConfig {
  return TIERS[(plan ?? "free") as PlanId] ?? TIERS.free;
}

export const FORMAT_MIME: Record<DownloadFormat, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
