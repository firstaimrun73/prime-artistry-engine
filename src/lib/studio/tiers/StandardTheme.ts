/**
 * STANDARD tier — clean, focused Image Studio.
 * Desktop: centered max width so controls don't stretch edge-to-edge.
 */

export const STANDARD_TIER = "standard";

export const standardShellClass =
  "studio-tier-standard mx-auto w-full max-w-3xl bg-background px-3 text-foreground sm:max-w-4xl sm:px-5 lg:max-w-5xl lg:px-6 xl:max-w-6xl";

export const standardCardClass =
  "rounded-2xl border border-border/80 bg-card/80 shadow-sm backdrop-blur-sm";

export const standardAccentClass = "text-primary";

export const standardGenerateClass =
  "bg-primary text-primary-foreground hover:opacity-95";

export const standardMeta = {
  id: STANDARD_TIER,
  label: "Standard",
  short: "Everyday edits",
  blurb:
    "Fast and reliable image creation for everyday edits, enhancements, restyling, and creative generation.",
} as const;
