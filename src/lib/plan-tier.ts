// Central plan-tier capability config (client-safe).
//
// Maps the existing PlanId set (free | plus | pro | studio) to the
// user-facing "membership" tiers, crown badges, watermark strength,
// download quality, allowed formats and video limits. This is the single
// source of truth for plan-gated features so UI and pipeline stay in sync.
//
// Tier mapping (per product decision — "map to existing tiers"):
//   free   → Free          (no crown,   large watermark, 720p, JPG)
//   plus   → Basic Member  (bronze,     small watermark, 1080p, JPG/PNG)
//   pro    → Pro Member    (silver,     tiny watermark,  2K, JPG/PNG/WebP)
//   studio → Business Member (gold,      no watermark,    4K, all formats)

import type { PlanId } from "./plans";

export type WatermarkLevel = "large-center" | "small-corner" | "tiny-corner" | "none";
export type CrownTier = "none" | "bronze" | "silver" | "gold" | "diamond";
export type DownloadFormat = "jpg" | "png" | "webp";

export type TierConfig = {
  /** Membership label shown on badges. */
  memberLabel: string;
  /** Crown tier + colour. */
  crown: CrownTier;
  crownColor: string | null;
  badgeColor: string;
  /** Watermark behaviour on downloads. */
  watermark: WatermarkLevel;
  watermarkOpacity: number;
  /** Max download dimension (longest edge), and human label. */
  maxDimension: number;
  qualityLabel: string;
  /** Allowed download formats. */
  formats: DownloadFormat[];
  /** Video generation. */
  videoEnabled: boolean;
  videoMaxSeconds: number;
  videoQualityLabel: string;
  /** Monthly video quota (Infinity = unlimited). */
  videoMonthlyQuota: number;
  /** Profile picture upload allowed. */
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
    maxDimension: 1280, // 720p
    qualityLabel: "720p",
    formats: ["jpg"],
    videoEnabled: false,
    videoMaxSeconds: 0,
    videoQualityLabel: "—",
    videoMonthlyQuota: 0,
    canUploadAvatar: false,
  },
  plus: {
    memberLabel: "Starter Member",
    crown: "bronze",
    crownColor: "#CD7F32",
    badgeColor: "#CD7F32",
    watermark: "small-corner",
    watermarkOpacity: 0.3,
    maxDimension: 1920, // 1080p
    qualityLabel: "1080p",
    formats: ["jpg", "png"],
    videoEnabled: true,
    videoMaxSeconds: 10,
    videoQualityLabel: "480p",
    videoMonthlyQuota: 5,
    canUploadAvatar: true,
  },
  pro: {
    memberLabel: "Plus Member",
    crown: "silver",
    crownColor: "#C0C0C0",
    badgeColor: "#C0C0C0",
    watermark: "tiny-corner",
    watermarkOpacity: 0.2,
    maxDimension: 2560, // 2K
    qualityLabel: "2K",
    formats: ["jpg", "png", "webp"],
    videoEnabled: true,
    videoMaxSeconds: 30,
    videoQualityLabel: "1080p",
    videoMonthlyQuota: 20,
    canUploadAvatar: true,
  },
  studio: {
    memberLabel: "Pro Member",
    crown: "gold",
    crownColor: "#FFD700",
    badgeColor: "#FFD700",
    watermark: "tiny-corner",
    watermarkOpacity: 0.12,
    maxDimension: 3840, // 4K
    qualityLabel: "4K",
    formats: ["jpg", "png", "webp"],
    videoEnabled: true,
    videoMaxSeconds: 60,
    videoQualityLabel: "4K",
    videoMonthlyQuota: 50,
    canUploadAvatar: true,
  },
  business: {
    memberLabel: "Business Member",
    crown: "diamond",
    crownColor: "#B9F2FF",
    badgeColor: "#B9F2FF",
    watermark: "none",
    watermarkOpacity: 0,
    maxDimension: 3840, // 4K Ultra
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
