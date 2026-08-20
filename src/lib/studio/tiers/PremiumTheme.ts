/**
 * PREMIUM internal id → user-facing Ultra AI experience (flagship).
 * Midnight Navy · Luxury Gold · Emerald accent — highest Image Studio path.
 * Internal id remains "premium" for plan gates / registry.
 *
 * Public hierarchy: Standard → Premium → Ultra AI
 *
 * Palette roles:
 * - Deep Navy / Midnight — primary background & major surfaces
 * - Luxury Gold — Ultra AI highlights, premium borders, selected states
 * - Emerald / Ice accents — AI activity, secondary interactive accents
 */

export const PREMIUM_TIER = "premium";

/** Deep navy shell — navy dominates; gold as strategic accent. */
export const premiumShellClass =
  "studio-tier-premium studio-exp-ultra bg-[#0B1220] text-slate-100";

/** Cards / panels: slightly lighter navy with subtle gold border. */
export const premiumCardClass =
  "rounded-2xl border border-[#D4AF37]/25 bg-[#111B2E]/95 text-slate-100 shadow-[0_0_0_1px_rgba(47,174,130,0.08),0_20px_40px_-18px_rgba(11,18,32,0.85)] backdrop-blur-md";

/** Accent text — luxury gold for Ultra AI identity. */
export const premiumAccentClass = "text-[#E8C547]";

/**
 * Primary Ultra AI action: solid luxury gold with dark navy text.
 * No rainbow gradients — gold communicates exclusive.
 */
export const premiumGenerateClass =
  "bg-[#D4AF37] text-[#0B1220] hover:bg-[#E8C547] font-semibold shadow-[0_0_24px_-6px_rgba(212,175,55,0.45)]";

export const premiumMeta = {
  id: PREMIUM_TIER,
  label: "Ultra AI",
  short: "Maximum",
  blurb: "Max quality · advanced AI path.",
} as const;
