/**
 * PRO internal id → user-facing PREMIUM experience.
 * Orange creative energy. Internal id remains "pro" for plan gates / registry.
 */

export const PRO_TIER = "pro";

export const proShellClass =
  "studio-tier-pro studio-exp-premium bg-gradient-to-b from-orange-50/90 via-background to-background dark:from-orange-950/40 dark:via-background dark:to-background";

export const proCardClass =
  "rounded-2xl border border-orange-500/25 bg-card/85 shadow-[0_0_24px_-8px_rgba(249,115,22,0.35)] backdrop-blur-md dark:border-orange-500/20 dark:bg-card/60";

export const proAccentClass = "text-orange-600 dark:text-orange-400";

export const proGenerateClass =
  "bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:opacity-95 font-semibold";

export const proMeta = {
  id: PRO_TIER,
  label: "Premium",
  short: "Energy",
  blurb: "Orange creative energy · advanced generation.",
} as const;
