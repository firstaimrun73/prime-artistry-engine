/**
 * PREMIUM internal id → user-facing VIP experience.
 * Dark cinematic elite. Internal id remains "premium" for plan gates / registry.
 */

export const PREMIUM_TIER = "premium";

export const premiumShellClass =
  "studio-tier-premium studio-exp-vip bg-zinc-950 text-zinc-50";

export const premiumCardClass =
  "rounded-2xl border border-amber-500/20 bg-zinc-900/85 shadow-[0_0_0_1px_rgba(212,175,55,0.12),0_20px_50px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md";

export const premiumAccentClass = "text-amber-300";

export const premiumGenerateClass =
  "bg-gradient-to-r from-zinc-100 via-amber-100 to-amber-300 text-zinc-950 hover:opacity-95 font-semibold shadow-lg shadow-amber-900/30";

export const premiumMeta = {
  id: PREMIUM_TIER,
  label: "VIP",
  short: "Elite",
  blurb: "Cinematic elite interface · highest fidelity path.",
} as const;
