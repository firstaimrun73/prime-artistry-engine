import { useEffect } from "react";

/**
 * One-time client cleanup: strip every known third-party ad / push artifact.
 * Never injects Monetag, AdSense, vignette, tag.min.js, or notification scripts.
 * Returning users stop getting old push/popunder behavior.
 */
function removeAdScripts() {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll(
      [
        'script[src*="n6wxm.com"]',
        'script[src*="nap5k.com"]',
        'script[src*="monetag"]',
        'script[src*="omg10.com"]',
        'script[src*="pagead2.googlesyndication.com"]',
        'script[src*="adsbygoogle.js"]',
        'script[src*="googlesyndication"]',
        'script[src*="tag.min.js"]',
        'script[src*="vignette"]',
        'iframe[src*="googlesyndication"]',
        'iframe[src*="doubleclick"]',
        "#monetag-vignette",
        "#monetag-tag",
        "#monetag-loader",
        "#adsense-loader",
        "ins.adsbygoogle",
      ].join(", "),
    )
    .forEach((el) => el.remove());
  document.querySelectorAll('meta[name="monetag"]').forEach((el) => el.remove());
  try {
    if (window.adsbygoogle) window.adsbygoogle = [];
  } catch {
    /* noop */
  }
}

/** Unregister service workers + clear push subscriptions (one-time). */
async function cleanupPushAndWorkers() {
  if (typeof navigator === "undefined") return;
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* noop */
  }
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.ready) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager?.getSubscription?.();
      if (sub) await sub.unsubscribe();
    }
  } catch {
    /* noop */
  }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => /push|sw|workbox|monetag|ads/i.test(k))
          .map((k) => caches.delete(k)),
      );
    }
  } catch {
    /* noop */
  }
}

/**
 * Gate that ONLY strips third-party ads. Never injects scripts.
 * Never calls Notification.requestPermission.
 */
export function AdPolicyGate() {
  useEffect(() => {
    removeAdScripts();
    void cleanupPushAndWorkers();
    // Re-strip after a short delay in case late loaders race
    const t = window.setTimeout(removeAdScripts, 1500);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
