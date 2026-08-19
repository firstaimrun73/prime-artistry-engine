/**
 * Shared editor tier types for Image / Video / Music studios.
 * Visual tokens live in separate theme files under lib/studio/tiers/
 * so a Standard change cannot break Pro or Premium (and vice versa).
 * Model selection lives in per-studio registries under lib/studio/{image,video,music}/.
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

/** CSS class sets applied to the editor content shell (not global nav). */
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

/** Map studio tier → video-pricing UI tier (standard | advanced). */
export function studioTierToVideoUi(tier: StudioTier): "standard" | "advanced" {
  return tier === "standard" ? "standard" : "advanced";
}

/** Map studio tier → existing music qualityTier (backend currently standard|premium). */
export function studioTierToMusicQuality(tier: StudioTier): "standard" | "premium" {
  return tier === "standard" ? "standard" : "premium";
}

/** Map studio tier → image quality preference for cost estimates. */
export function studioTierToImageQuality(tier: StudioTier): "hd" | "2k" | "4k" {
  switch (tier) {
    case "standard":
      return "hd";
    case "pro":
      return "2k";
    case "premium":
      return "4k";
  }
}
