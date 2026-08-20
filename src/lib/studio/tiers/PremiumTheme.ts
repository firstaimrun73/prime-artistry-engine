/**
 * PREMIUM internal id → user-facing VIP experience.
 * Indigo · violet · cyan (high contrast) — not flat black/white.
 * Internal id remains "premium" for plan gates / registry.
 */

export const PREMIUM_TIER = "premium";

export const premiumShellClass =
  "studio-tier-premium studio-exp-vip bg-gradient-to-b from-indigo-950 via-violet-950 to-slate-950 text-indigo-50";

export const premiumCardClass =
  "rounded-2xl border border-cyan-400/35 bg-indigo-950/80 text-indigo-50 shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_24px_48px_-20px_rgba(79,70,229,0.55)] backdrop-blur-md";

export const premiumAccentClass = "text-cyan-300";

export const premiumGenerateClass =
  "bg-gradient-to-r from-cyan-400 via-violet-500 to-indigo-500 text-white hover:opacity-95 font-semibold shadow-lg shadow-violet-500/30";

export const premiumMeta = {
  id: PREMIUM_TIER,
  label: "VIP",
  short: "Elite",
  blurb: "Cinematic elite · highest fidelity path.",
} as const;
