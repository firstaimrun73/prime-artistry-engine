import { useEffect } from "react";

/**
 * One-time and ongoing cleanup of legacy ad-provider artifacts.
 * Monetag vignette / tag / publisher scripts and AdSense loaders are
 * permanently removed. This component never injects advertising scripts.
 * Static Direct Link ads are pure UI (see DirectLinkAd) and require no scripts.
 */
function removeAdScripts() {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll(
      [
        'script[src*="n6wxm.com"]',
        'script[src*="nap5k.com"]',
        'script[src*="monetag"]',
        'script[src*="pagead2.googlesyndication.com"]',
        'script[src*="adsbygoogle.js"]',
        'script[src*="googlesyndication"]',
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
    if ((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle) {
      (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle = [];
    }
  } catch {
    /* noop */
  }
}

/** Unregister any service workers that may have been installed by old ad scripts. */
async function cleanupServiceWorkers() {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* noop */
  }
}

export function AdPolicyGate() {
  useEffect(() => {
    removeAdScripts();
    void cleanupServiceWorkers();
    // Re-strip if any late-injected scripts appear (defensive).
    const observer = new MutationObserver(() => removeAdScripts());
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
