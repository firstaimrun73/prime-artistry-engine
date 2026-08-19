/**
 * Shared editor tier system for Image / Video / Music studios.
 * STANDARD = clean white · PRO = glass · PREMIUM = black/white/gold
 * Credits only in normal UI — never provider USD.
 */

export type StudioEditorKind = "image" | "video" | "music";
export type StudioTier = "standard" | "pro" | "premium";

export const STUDIO_TIERS: readonly StudioTier[] = ["standard", "pro", "premium"] as const;

export type StudioTierMeta = {
  id: StudioTier;
  label: string;
  short: string;
  blurb: string;
};

export const STUDIO_TIER_META: Record<StudioTier, StudioTierMeta> = {
  standard: {
    id: "standard",
    label: "Standard",
    short: "Fast",
    blurb: "Clean, focused, reliable generation.",
  },
  pro: {
    id: "pro",
    label: "Pro",
    short: "Glass",
    blurb: "Immersive controls and higher quality models.",
  },
  premium: {
    id: "premium",
    label: "Premium",
    short: "Elite",
    blurb: "Maximum quality, advanced controls, cinematic UI.",
  },
};

/** CSS class sets applied to the editor content shell (not global nav). */
export function studioShellClass(tier: StudioTier): string {
  switch (tier) {
    case "standard":
      return "studio-tier-standard bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50";
    case "pro":
      return "studio-tier-pro bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-950 dark:to-slate-900";
    case "premium":
      return "studio-tier-premium bg-zinc-950 text-zinc-50";
  }
}

export function studioCardClass(tier: StudioTier): string {
  switch (tier) {
    case "standard":
      return "rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
    case "pro":
      return "rounded-2xl border border-white/40 bg-white/60 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5";
    case "premium":
      return "rounded-2xl border border-amber-500/25 bg-zinc-900/80 shadow-[0_0_0_1px_rgba(212,175,55,0.12)]";
  }
}

export function studioAccentClass(tier: StudioTier): string {
  switch (tier) {
    case "standard":
      return "text-primary";
    case "pro":
      return "text-violet-600 dark:text-violet-400";
    case "premium":
      return "text-amber-400";
  }
}

export function studioGenerateClass(tier: StudioTier): string {
  switch (tier) {
    case "standard":
      return "bg-primary text-primary-foreground hover:opacity-95";
    case "pro":
      return "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-95";
    case "premium":
      return "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-zinc-950 hover:opacity-95";
  }
}

/** Map studio tier → existing backend quality / model preference keys where applicable. */
export function studioTierToMusicQuality(tier: StudioTier): "standard" | "premium" {
  return tier === "standard" ? "standard" : "premium";
}

export function studioTierToVideoUi(tier: StudioTier): "standard" | "advanced" {
  return tier === "standard" ? "standard" : "advanced";
}
