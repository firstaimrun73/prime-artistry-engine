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

/** Deep navy shell — high-contrast light text. */
export const premiumShellClass =
  "studio-tier-premium studio-exp-ultra bg-[#0B1220] text-slate-100 [--muted-foreground:theme(colors.slate.300)]";

/**
 * Cards / panels: lighter navy surface, gold border, strong text contrast.
 * Secondary labels use text-slate-300 via muted override on shell.
 */
export const premiumCardClass =
  "rounded-2xl border border-[#D4AF37]/30 bg-[#121C30] text-slate-100 shadow-[0_0_0_1px_rgba(47,174,130,0.06),0_20px_40px_-18px_rgba(11,18,32,0.85)] backdrop-blur-md";

/** Accent text — luxury gold for Ultra AI identity. */
export const premiumAccentClass = "text-[#E8C547]";

/**
 * Primary Ultra AI action: solid luxury gold with dark navy text.
 */
export const premiumGenerateClass =
  "bg-[#D4AF37] text-[#0B1220] hover:bg-[#E8C547] font-semibold shadow-[0_0_24px_-6px_rgba(212,175,55,0.45)]";

export const premiumMeta = {
  id: PREMIUM_TIER,
  label: "Ultra AI",
  short: "Maximum",
  blurb: "Max quality · advanced AI path.",
} as const;
