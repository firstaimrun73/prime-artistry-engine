// Client-side first-party page-view reporter.
// Debounces SPA navigations and never tracks /api or /admin routes.

import { shouldTrackPath } from "@/lib/traffic.functions";

const SESSION_KEY = "m2e_vid";
const LAST_PATH_KEY = "m2e_last_pv";

function deviceClass(): "mobile" | "tablet" | "desktop" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (ua) return "desktop";
  return "unknown";
}

function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (id && id.length >= 8) return id;
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 32)
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `anon_${Date.now().toString(36)}`;
  }
}

let lastSentPath = "";
let lastSentAt = 0;
const MIN_INTERVAL_MS = 1500;

/**
 * Fire-and-forget page view. Safe on SSR (no-op).
 * Skips duplicate path within a short window (SPA re-renders).
 */
export async function reportPageView(pathname: string, userId?: string | null) {
  if (typeof window === "undefined") return;
  if (!shouldTrackPath(pathname)) return;

  const now = Date.now();
  if (pathname === lastSentPath && now - lastSentAt < MIN_INTERVAL_MS) return;
  // Also skip if same path was last recorded in this tab session recently
  try {
    const prev = sessionStorage.getItem(LAST_PATH_KEY);
    if (prev === pathname && now - lastSentAt < 8000) return;
    sessionStorage.setItem(LAST_PATH_KEY, pathname);
  } catch {
    /* ignore */
  }
  lastSentPath = pathname;
  lastSentAt = now;

  try {
    const { recordPageView } = await import("@/lib/traffic.functions");
    await recordPageView({
      data: {
        sessionId: getOrCreateSessionId(),
        pathname,
        referrer: document.referrer || null,
        deviceClass: deviceClass(),
        userId: userId ?? null,
      },
    });
  } catch (err) {
    // Never break the site for analytics
    if (import.meta.env?.DEV) console.warn("[traffic-client]", err);
  }
}
