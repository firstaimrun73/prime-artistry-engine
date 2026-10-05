import { useEffect } from "react";

/**
 * Strip legacy third-party ad scripts only. Never injects Monetag, AdSense,
 * vignette, tag.min.js, or notification push. Direct Link ads are pure
 * intentional-click UI (see DirectLinkAd) — no automatic opens.
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
    if ("serviceWorker" in navigator) {
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
        keys.filter((k) => /push|sw|workbox|monetag|ads/i.test(k)).map((k) => caches.delete(k)),
      );
    }
  } catch {
    /* noop */
  }
}

export function AdPolicyGate() {
  useEffect(() => {
    removeAdScripts();
    void cleanupPushAndWorkers();
    const t = window.setTimeout(removeAdScripts, 1500);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
