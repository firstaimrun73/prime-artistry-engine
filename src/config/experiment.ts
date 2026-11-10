/**
 * Motio2edit — 7-day simplified studio experiment
 * Period: 2026-11-11 → 2026-11-18 (Asia/Kolkata)
 *
 * Visibility-only. Does not delete routes, APIs, plans, credits, or SEO pages.
 * Rollback: set `active` to false, or wait until after endDate (auto-off).
 */

export const SIMPLIFIED_STUDIO_EXPERIMENT = {
  /** Master switch. Set false for immediate full restore. */
  active: true,
  /** Inclusive start (Asia/Kolkata calendar day). */
  startDate: "2026-11-11",
  /** Inclusive end (Asia/Kolkata calendar day). After this day, experiment is off. */
  endDate: "2026-11-18",
  timezone: "Asia/Kolkata",
} as const;

/** Kolkata calendar YYYY-MM-DD for a given instant (default: now). */
export function kolkataYmd(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SIMPLIFIED_STUDIO_EXPERIMENT.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** True only during the experiment window while active is true. */
export function isSimplifiedStudioExperimentActive(now: Date = new Date()): boolean {
  if (!SIMPLIFIED_STUDIO_EXPERIMENT.active) return false;
  const ymd = kolkataYmd(now);
  return (
    ymd >= SIMPLIFIED_STUDIO_EXPERIMENT.startDate &&
    ymd <= SIMPLIFIED_STUDIO_EXPERIMENT.endDate
  );
}
