/**
 * PREMIUM internal id → user-facing VIP experience.
 * Midnight Navy · Luxury Gold · Electric Cyan — premium AI studio, not gaming UI.
 * Internal id remains "premium" for plan gates / registry.
 *
 * Palette roles:
 * - Deep Navy / Midnight Blue — primary background & major surfaces
 * - Luxury Gold — VIP highlights, premium borders, selected states, primary VIP actions
 * - Electric Cyan / Ice Blue — AI / active controls, secondary interactive accents
 */

export const PREMIUM_TIER = "premium";

/** Deep navy shell — navy dominates; gold & cyan only as strategic accents. */
export const premiumShellClass =
  "studio-tier-premium studio-exp-vip bg-[#0B1220] text-slate-100";

/** Cards / panels: slightly lighter navy with subtle gold border + cyan edge glow. */
export const premiumCardClass =
  "rounded-2xl border border-[#D4AF37]/25 bg-[#111B2E]/95 text-slate-100 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_20px_40px_-18px_rgba(11,18,32,0.85)] backdrop-blur-md";

/** Accent text — luxury gold for VIP identity. */
export const premiumAccentClass = "text-[#E8C547]";

/**
 * Primary VIP action: solid luxury gold with dark navy text (high contrast, premium feel).
 * No rainbow gradients — gold communicates exclusive.
 */
export const premiumGenerateClass =
  "bg-[#D4AF37] text-[#0B1220] hover:bg-[#E8C547] font-semibold shadow-[0_0_24px_-6px_rgba(212,175,55,0.45)]";

export const premiumMeta = {
  id: PREMIUM_TIER,
  label: "VIP",
  short: "Elite",
  blurb: "Cinematic elite · highest fidelity path.",
} as const;
