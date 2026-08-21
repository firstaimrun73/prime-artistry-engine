/**
 * STANDARD tier — clean, focused Image Studio.
 */

export const STANDARD_TIER = "standard";

export const standardShellClass =
  "studio-tier-standard bg-background text-foreground";

export const standardCardClass =
  "rounded-2xl border border-border/80 bg-card/80 shadow-sm backdrop-blur-sm";

export const standardAccentClass = "text-primary";

export const standardGenerateClass =
  "bg-primary text-primary-foreground hover:opacity-95";

export const standardMeta = {
  id: STANDARD_TIER,
  label: "Standard",
  short: "Essential",
  blurb: "Simple, essential editing.",
} as const;
