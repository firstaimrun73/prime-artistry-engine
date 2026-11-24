/**
 * Internal Ad Placement Manager — privacy-conscious aggregated events only.
 * No prompts, images, keystrokes, payment data, or browser fingerprinting.
 */

export type AdEventType = "impression" | "sponsor_click" | "dismiss" | "gift_open";

export type DeviceCategory = "mobile" | "tablet" | "desktop";

export type AdEvent = {
  type: AdEventType;
  placement: string;
  device: DeviceCategory;
  ts: number;
};

const STORAGE_KEY = "motio2edit-ad-events-v1";
const MAX_EVENTS = 80;
const CLICK_COOLDOWN_MS = 2500;

let lastClickAt = 0;
let lastClickPlacement = "";

function deviceCategory(): DeviceCategory {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function readEvents(): AdEvent[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdEvent[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_EVENTS) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: AdEvent[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* ignore */
  }
}

/** Record an aggregated placement event (no PII). */
export function trackAdEvent(type: AdEventType, placement: string) {
  const event: AdEvent = {
    type,
    placement: String(placement || "unknown").slice(0, 64),
    device: deviceCategory(),
    ts: Date.now(),
  };
  const next = [...readEvents(), event];
  writeEvents(next);
}

/** True if a sponsor click is allowed (cooldown + dedupe). */
export function canOpenSponsor(placement: string): boolean {
  const now = Date.now();
  if (now - lastClickAt < CLICK_COOLDOWN_MS && lastClickPlacement === placement) {
    return false;
  }
  return true;
}

/** Mark a sponsor open attempt (call after user-initiated open). */
export function markSponsorOpened(placement: string) {
  lastClickAt = Date.now();
  lastClickPlacement = placement;
  trackAdEvent("sponsor_click", placement);
}

/** Safe popup-blocker-aware open of a sponsored URL. Returns whether a window was opened. */
export function openSponsorUrl(url: string, placement: string): boolean {
  if (!canOpenSponsor(placement)) return false;
  markSponsorOpened(placement);
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    return !!w;
  } catch {
    return false;
  }
}

/** Aggregated stats for internal placement optimization (no third-party send). */
export function getAdPlacementStats(): {
  impressions: number;
  clicks: number;
  dismissals: number;
  byPlacement: Record<string, { impressions: number; clicks: number; dismissals: number }>;
  byDevice: Record<DeviceCategory, number>;
} {
  const events = readEvents();
  const byPlacement: Record<string, { impressions: number; clicks: number; dismissals: number }> = {};
  const byDevice: Record<DeviceCategory, number> = { mobile: 0, tablet: 0, desktop: 0 };
  let impressions = 0;
  let clicks = 0;
  let dismissals = 0;

  for (const e of events) {
    byDevice[e.device] = (byDevice[e.device] || 0) + 1;
    if (!byPlacement[e.placement]) {
      byPlacement[e.placement] = { impressions: 0, clicks: 0, dismissals: 0 };
    }
    if (e.type === "impression") {
      impressions += 1;
      byPlacement[e.placement].impressions += 1;
    } else if (e.type === "sponsor_click" || e.type === "gift_open") {
      clicks += 1;
      byPlacement[e.placement].clicks += 1;
    } else if (e.type === "dismiss") {
      dismissals += 1;
      byPlacement[e.placement].dismissals += 1;
    }
  }

  return { impressions, clicks, dismissals, byPlacement, byDevice };
}
