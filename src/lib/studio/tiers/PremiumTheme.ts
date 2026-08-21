/**
 * PREMIUM internal id → user-facing Ultra AI experience (flagship).
 * Midnight Navy · Luxury Gold — highest Image Studio path.
 * Internal id remains "premium" for plan gates / registry.
 *
 * Public hierarchy: Standard → Premium → Ultra AI
 *
 * Readability: light text on navy surfaces; secondary uses slate-300 (not muted-dark).
 */

export const PREMIUM_TIER = "premium";

/** Deep navy shell — high-contrast light text. CSS vars live in styles.css. */
export const premiumShellClass =
  "studio-tier-premium studio-exp-ultra bg-[#0B1220] text-slate-100";

/**
 * Cards / panels: charcoal-navy surface, muted gold border, strong text contrast.
 */
export const premiumCardClass =
  "rounded-2xl border border-[#D4AF37]/28 bg-[#121C30] text-slate-100 shadow-[0_20px_40px_-18px_rgba(11,18,32,0.85)] backdrop-blur-md";

/** Accent text — champagne gold for Ultra AI identity. */
export const premiumAccentClass = "text-[#E8C547]";

/**
 * Primary Ultra AI action: darker bronze-gold, champagne text — not a yellow slab.
 */
export const premiumGenerateClass =
  "bg-gradient-to-b from-[#C9A227] via-[#A07C1C] to-[#7A5C0A] text-[#F8F1D8] hover:from-[#D4AF37] hover:via-[#B8941F] hover:to-[#8B6914] active:from-[#8B6914] active:to-[#6B4F08] font-semibold border border-[#E8C547]/35 shadow-[0_8px_28px_-10px_rgba(160,124,28,0.55)]";

export const premiumMeta = {
  id: PREMIUM_TIER,
  label: "Ultra AI",
  short: "Maximum",
  blurb: "Highest quality path and advanced AI.",
} as const;
