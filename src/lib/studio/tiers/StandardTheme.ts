/**
 * STANDARD tier — clean white, simple, focused.
 * Separate file so Standard visual changes never rewrite Pro/Premium.
 */

export const STANDARD_TIER = "standard";

export const standardShellClass =
  "studio-tier-standard bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50";

export const standardCardClass =
  "rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export const standardAccentClass = "text-primary";

export const standardGenerateClass =
  "bg-primary text-primary-foreground hover:opacity-95";

export const standardMeta = {
  id: STANDARD_TIER,
  label: "Standard",
  short: "Fast",
  blurb: "Clean, focused, reliable generation.",
} as const;
