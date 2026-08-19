/**
 * PRO tier — Pro Studio Glass: depth, translucency, cinematic controls.
 * Separate file so Pro visual changes never rewrite Standard/Premium.
 */

export const PRO_TIER = "pro";

export const proShellClass =
  "studio-tier-pro bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-950 dark:to-slate-900";

export const proCardClass =
  "rounded-2xl border border-white/40 bg-white/60 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5";

export const proAccentClass = "text-violet-600 dark:text-violet-400";

export const proGenerateClass =
  "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-95";

export const proMeta = {
  id: PRO_TIER,
  label: "Pro",
  short: "Glass",
  blurb: "Immersive controls and higher quality models.",
} as const;
