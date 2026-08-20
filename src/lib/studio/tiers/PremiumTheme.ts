/**
 * PREMIUM internal id → user-facing VIP experience.
 * Black · white · gold + deep plum & champagne for clear text.
 * Internal id remains "premium" for plan gates / registry.
 */

export const PREMIUM_TIER = "premium";

export const premiumShellClass =
  "studio-tier-premium studio-exp-vip bg-[#0a0a0b] text-zinc-50";

export const premiumCardClass =
  "rounded-2xl border border-[#d4af37]/35 bg-[#121214]/95 text-zinc-50 shadow-[0_0_0_1px_rgba(212,175,55,0.18),0_24px_48px_-24px_rgba(0,0,0,0.75)] backdrop-blur-md";

export const premiumAccentClass = "text-[#e8c547]";

export const premiumGenerateClass =
  "bg-gradient-to-r from-[#f5e6b8] via-[#d4af37] to-[#c9a227] text-[#0a0a0b] hover:opacity-95 font-semibold shadow-lg shadow-[#d4af37]/25";

export const premiumMeta = {
  id: PREMIUM_TIER,
  label: "VIP",
  short: "Elite",
  blurb: "Cinematic elite · highest fidelity path.",
} as const;
