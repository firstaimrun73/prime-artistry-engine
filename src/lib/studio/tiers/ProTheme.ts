/**
 * PRO internal id → user-facing PREMIUM experience.
 */

export const PRO_TIER = "pro";

export const proShellClass =
  "studio-tier-pro studio-exp-premium mx-auto w-full max-w-3xl bg-gradient-to-b from-orange-50 via-background to-background px-3 text-foreground dark:from-orange-950/50 dark:via-background dark:to-background sm:max-w-4xl sm:px-5 lg:max-w-5xl lg:px-6 xl:max-w-6xl";

export const proCardClass =
  "rounded-2xl border border-orange-500/30 bg-card/90 text-card-foreground shadow-[0_0_28px_-10px_rgba(249,115,22,0.4)] backdrop-blur-md dark:border-orange-400/25 dark:bg-card/75";

export const proAccentClass = "text-orange-600 dark:text-orange-400";

export const proGenerateClass =
  "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:opacity-95 font-semibold";

export const proMeta = {
  id: PRO_TIER,
  label: "Premium",
  short: "Advanced editing",
  blurb:
    "More advanced image creation and editing with stronger detail, richer results, and support for reference-based workflows.",
} as const;
