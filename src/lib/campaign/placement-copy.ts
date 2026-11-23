/**
 * Universal seasonal campaign placement copy.
 * UI components read labels from the active campaign config — not hard-coded seasons.
 */

export type PlacementId =
  | "header"
  | "home_hero"
  | "home_restore"
  | "studio_image"
  | "studio_video"
  | "studio_music"
  | "result"
  | "pricing"
  | "prize";

export type CampaignPlacementCopy = Record<PlacementId, string>;

/** Default English placement strings for the Christmas gift campaign. */
export const CHRISTMAS_2026_PLACEMENTS: CampaignPlacementCopy = {
  header: "Your Free Gift Awaits",
  home_hero: "Bring Your Memories Back. Enjoy a Special Gift Too!",
  home_restore: "Bring Your Memories Back. Enjoy a Special Gift Too!",
  studio_image: "Create Something Amazing — Check Today's Free Reward.",
  studio_video: "Turn Your Ideas Into Motion. Explore Today's Rewards.",
  studio_music: "Create Your Sound. Discover Available Rewards.",
  result: "Your Creation Is Ready! Don't Miss Your Free Gift.",
  pricing: "More Ways to Create — Explore Optional Rewarded Ads.",
  prize: "Try Your Luck for Premium Prizes.",
};

/** Neutral fallback when no seasonal campaign is active. */
export const FALLBACK_PLACEMENTS: CampaignPlacementCopy = {
  header: "Free credits",
  home_hero: "Start creating with Motio2edit",
  home_restore: "Restore memories with AI",
  studio_image: "Create something amazing",
  studio_video: "Turn ideas into motion",
  studio_music: "Create your sound",
  result: "Your creation is ready",
  pricing: "More ways to create",
  prize: "Premium prize campaigns — Coming soon",
};

export function placementLabel(
  placement: PlacementId,
  copy: CampaignPlacementCopy | null | undefined,
): string {
  if (copy && copy[placement]) return copy[placement];
  return FALLBACK_PLACEMENTS[placement];
}
