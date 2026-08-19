/**
 * PREMIUM tier — black + white + gold elite workstation.
 * Separate file so Premium visual changes never rewrite Standard/Pro.
 */

export const PREMIUM_TIER = "premium";

export const premiumShellClass =
  "studio-tier-premium bg-zinc-950 text-zinc-50";

export const premiumCardClass =
  "rounded-2xl border border-amber-500/25 bg-zinc-900/80 shadow-[0_0_0_1px_rgba(212,175,55,0.12)]";

export const premiumAccentClass = "text-amber-400";

export const premiumGenerateClass =
  "bg-gradient-to-r from-amber-600 to-yellow-600 text-zinc-950 hover:opacity-95 font-semibold";

export const premiumMeta = {
  id: PREMIUM_TIER,
  label: "Premium",
  short: "Elite",
  blurb: "Maximum quality, advanced controls, cinematic UI.",
} as const;
