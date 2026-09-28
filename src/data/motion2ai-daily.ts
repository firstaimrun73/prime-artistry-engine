/**
 * Motion2Ai — Daily Top 10 image sets for the homepage strip + archive.
 *
 * To publish the next daily Top 10:
 *   1. Add a new set object at the TOP of `dailySets` (newest first).
 *   2. Do NOT delete previous sets — they become the archive automatically.
 *   3. Set `dailyRatio` to the actual ratio of that day's images (e.g. "1:1", "16:9").
 *   4. Each image must include the real mode used to create it (standard | pro | premium).
 *
 * Mode mapping (internal → user label):
 *   standard → Standard
 *   pro      → Premium
 *   premium  → Ultra AI
 *
 * Image URLs are public R2 assets — do not duplicate files into another bucket.
 */

export type DailyImageMode = "standard" | "pro" | "premium";

export type DailyImage = {
  url: string;
  mode: DailyImageMode;
  /** User-facing label; keep in sync with mode. */
  label: "Standard" | "Premium" | "Ultra AI";
};

export type DailySet = {
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Aspect ratio key for CSS aspect-ratio, e.g. "1:1", "16:9" */
  dailyRatio: string;
  images: DailyImage[];
};

/** Newest set first. Index 0 = active Top 10; rest = archive. */
export const dailySets: DailySet[] = [
  {
    date: "2026-09-28",
    dailyRatio: "1:1",
    images: [
      {
        url: "https://assets.motio2edit.com/history/2UlhyylkrXHVDhBupywL__bvgUzcDc.png",
        mode: "standard",
        label: "Standard",
      },
      {
        url: "https://assets.motio2edit.com/history/L2nrkCWbxC63jRaxaHRY__gGldyhVL.png",
        mode: "standard",
        label: "Standard",
      },
      {
        url: "https://assets.motio2edit.com/history/UMsI58YJjKNruNjzanREQ_tpFngOSi.png",
        mode: "standard",
        label: "Standard",
      },
      {
        url: "https://assets.motio2edit.com/history/VHaS995Vgjb5i0ZEcPVEu_gbl7Tzrt.png",
        mode: "standard",
        label: "Standard",
      },
      {
        url: "https://assets.motio2edit.com/history/W_37CxqmPUugai0So25w2_1bcAYuul.png",
        mode: "pro",
        label: "Premium",
      },
      {
        url: "https://assets.motio2edit.com/history/XFpXNpEV1WfXZipkAbpzQ_ROLvh95W.png",
        mode: "pro",
        label: "Premium",
      },
      {
        url: "https://assets.motio2edit.com/history/aoG834P2VYhTlKCM8vo9X_Zx6giB1m.png",
        mode: "pro",
        label: "Premium",
      },
      {
        url: "https://assets.motio2edit.com/history/eL-v6BoTzF6nQ6gNCJ4Zu_7N2joClt.png",
        mode: "premium",
        label: "Ultra AI",
      },
      {
        url: "https://assets.motio2edit.com/history/ilLqzjcdIIvgTIf_mhtgH_vVW4aOUh.png",
        mode: "premium",
        label: "Ultra AI",
      },
      {
        url: "https://assets.motio2edit.com/history/xcGrPOM57xd6IeqIQROM4_eAGWfFZE.png",
        mode: "premium",
        label: "Ultra AI",
      },
    ],
  },
];

export function getActiveDailySet(): DailySet | null {
  return dailySets[0] ?? null;
}

/** All sets except the active one (newest remaining first). */
export function getArchiveDailySets(): DailySet[] {
  return dailySets.slice(1);
}

export function modeIcon(mode: DailyImageMode): string {
  if (mode === "standard") return "⚡";
  if (mode === "pro") return "👑";
  return "💎";
}

/** Convert "16:9" → CSS aspect-ratio value "16 / 9" */
export function ratioToCss(ratio: string): string {
  const parts = ratio.split(":").map((p) => p.trim());
  if (parts.length === 2 && parts[0] && parts[1]) {
    return `${parts[0]} / ${parts[1]}`;
  }
  return "1 / 1";
}
