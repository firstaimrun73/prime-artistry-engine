/**
 * PREMIUM internal id → user-facing Ultra AI experience (flagship).
 */

export const PREMIUM_TIER = "premium";

export const premiumShellClass =
  "studio-tier-premium studio-exp-ultra bg-[#0B1220] text-slate-100 [color-scheme:dark]";

export const premiumCardClass =
  "rounded-2xl border border-[#D4AF37]/28 bg-[#121C30] text-slate-100 shadow-[0_20px_40px_-18px_rgba(11,18,32,0.85)] backdrop-blur-md";

export const premiumAccentClass = "text-[#E8C547]";

export const premiumGenerateClass =
  "bg-gradient-to-b from-[#C9A227] via-[#A07C1C] to-[#7A5C0A] text-[#F8F1D8] hover:from-[#D4AF37] hover:via-[#B8941F] hover:to-[#8B6914] active:from-[#8B6914] active:to-[#6B4F08] font-semibold border border-[#E8C547]/35 shadow-[0_8px_28px_-10px_rgba(160,124,28,0.55)]";

export const premiumMeta = {
  id: PREMIUM_TIER,
  label: "Ultra AI",
  short: "Maximum quality path",
  blurb: "Flagship generation, multi-reference intelligence, and high-resolution delivery.",
} as const;
