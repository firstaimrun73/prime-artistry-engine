// Google Analytics (GA4) client helper.
//
// The measurement ID is a public value, safe to ship in the bundle. The GA
// snippet itself is injected via the root route <head>. These helpers provide
// a typed, SSR-safe wrapper around gtag for tracking custom events.

export const GA_MEASUREMENT_ID = "G-3NCVLG63JR";

type GtagArgs = unknown[];

declare global {
  interface Window {
    dataLayer?: GtagArgs[];
    gtag?: (...args: GtagArgs) => void;
  }
}

function gtagSafe(...args: GtagArgs) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag(...args);
}

/** Track a custom GA4 event. */
export function trackEvent(
  name: string,
  params: Record<string, string | number | boolean | undefined> = {},
) {
  gtagSafe("event", name, params);
}

/** Track an SPA page view (call on route change). */
export function trackPageView(path: string) {
  gtagSafe("event", "page_view", {
    page_path: path,
    page_location: typeof window !== "undefined" ? window.location.href : path,
  });
}

// Convenience wrappers for the events requested across the app.
export const analytics = {
  buttonClick: (label: string) => trackEvent("button_click", { label }),
  paymentStarted: (plan: string, method: string) =>
    trackEvent("payment_started", { plan, method }),
  paymentCompleted: (plan: string, amount: number, currency: string) =>
    trackEvent("payment_completed", { plan, amount, currency }),
  paymentFailed: (plan: string, reason?: string) =>
    trackEvent("payment_failed", { plan, reason }),
  signup: (method: string) => trackEvent("sign_up", { method }),
  imageGenerated: () => trackEvent("image_generated", {}),
  videoGenerated: () => trackEvent("video_generated", {}),
};
