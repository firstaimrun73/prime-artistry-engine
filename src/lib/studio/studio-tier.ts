/**
 * Shared editor tier types for Image / Video / Music studios.
 * Visual tokens live under lib/studio/tiers/
 * Internal ids: standard | pro | premium
 * User-facing: Standard | Premium | Ultra AI (pro→Premium, premium→Ultra AI)
 * Model selection lives in per-studio registries under lib/studio/{image,video,music}/
 */

import {
  standardShellClass,
  standardCardClass,
  standardAccentClass,
  standardGenerateClass,
  standardMeta,
} from "@/lib/studio/tiers/StandardTheme";
import {
  proShellClass,
  proCardClass,
  proAccentClass,
  proGenerateClass,
  proMeta,
} from "@/lib/studio/tiers/ProTheme";
import {
  premiumShellClass,
  premiumCardClass,
  premiumAccentClass,
  premiumGenerateClass,
  premiumMeta,
} from "@/lib/studio/tiers/PremiumTheme";
import type { ImageQuality } from "@/lib/quality-options";

export type StudioEditorKind = "image" | "video" | "music";
export type StudioTier = "standard" | "pro" | "premium";

export const STUDIO_TIERS: readonly StudioTier[] = ["standard", "pro", "premium"] as const;

export type StudioTierMeta = {
  id: StudioTier;
  label: string;
  short: string;
  blurb: string;
};

export const STUDIO_TIER_META: Record<StudioTier, StudioTierMeta> = {
  standard: { ...standardMeta },
  pro: { ...proMeta },
  premium: { ...premiumMeta },
};

export function studioShellClass(tier: StudioTier): string {
  switch (tier) {
    case "standard":
      return standardShellClass;
    case "pro":
      return proShellClass;
    case "premium":
      return premiumShellClass;
  }
}

export function studioCardClass(tier: StudioTier): string {
  switch (tier) {
    case "standard":
      return standardCardClass;
    case "pro":
      return proCardClass;
    case "premium":
      return premiumCardClass;
  }
}

export function studioAccentClass(tier: StudioTier): string {
  switch (tier) {
    case "standard":
      return standardAccentClass;
    case "pro":
      return proAccentClass;
    case "premium":
      return premiumAccentClass;
  }
}

export function studioGenerateClass(tier: StudioTier): string {
  switch (tier) {
    case "standard":
      return standardGenerateClass;
    case "pro":
      return proGenerateClass;
    case "premium":
      return premiumGenerateClass;
  }
}

export function studioTierToVideoUi(tier: StudioTier): "standard" | "advanced" {
  return tier === "standard" ? "standard" : "advanced";
}

export function studioTierToMusicQuality(tier: StudioTier): "standard" | "premium" {
  return tier === "standard" ? "standard" : "premium";
}

/** Default quality preference when switching experience (before manual override). */
export function studioTierToImageQuality(tier: StudioTier): ImageQuality {
  switch (tier) {
    case "standard":
      return "hd";
    case "pro":
      return "2k";
    case "premium":
      return "4k";
  }
}

/** User-facing experience name (Standard / Premium / Ultra AI). */
export function studioExperienceLabel(tier: StudioTier): string {
  return STUDIO_TIER_META[tier].label;
}

/** Header title for Image Studio string consumers. */
export function imageStudioHeaderTitle(tier: StudioTier): string {
  switch (tier) {
    case "standard":
      return "Image Studio · Standard";
    case "pro":
      return "Image Studio · Premium";
    case "premium":
      return "Image Studio · Ultra AI";
  }
}

/**
 * Watermark line for backend stamp pipeline only (not shown in frontend UI).
 * Format: Motio2edit {Experience} — {plan display name}
 */
export function experienceWatermarkLine(tier: StudioTier, planDisplayName: string): string {
  const exp = studioExperienceLabel(tier);
  const plan = (planDisplayName || "Free").trim() || "Free";
  return `Motio2edit ${exp} — ${plan}`;
}

/**
 * Quality chips exposed per experience (labels only — no credit numbers).
 * Standard: SD, HD only.
 * Premium (pro): SD, HD, 2K only — 4K/8K are Ultra AI exclusive.
 * Ultra AI (premium): SD, HD, 2K, 4K, 8K.
 */
export function imageQualitiesForStudioTier(tier: StudioTier): ImageQuality[] {
  switch (tier) {
    case "standard":
      return ["sd", "hd"];
    case "pro":
      return ["sd", "hd", "2k"];
    case "premium":
      return ["sd", "hd", "2k", "4k", "8k"];
  }
}

/** Aspect ratios for text-to-image per experience. */
export function aspectRatiosForStudioTier(
  tier: StudioTier,
): Array<"1:1" | "4:3" | "16:9" | "9:16" | "3:4"> {
  switch (tier) {
    case "standard":
      return ["1:1", "16:9", "9:16"];
    case "pro":
    case "premium":
      return ["1:1", "4:3", "16:9", "9:16", "3:4"];
  }
}
