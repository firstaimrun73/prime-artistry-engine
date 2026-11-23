import { useEffect } from "react";

/**
 * Strip only unwanted third-party ad networks (e.g. AdSense).
 * Do NOT remove Monetag, Partner zone, Adsterra, or Direct Link assets.
 */
function stripUnwantedAdArtifacts() {
  if (typeof document === "undefined") return;

  const selectors = [
    'script[src*="pagead2.googlesyndication.com"]',
    'script[src*="adsbygoogle.js"]',
    'script[src*="googlesyndication"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="doubleclick"]',
    "#adsense-loader",
    "ins.adsbygoogle",
  ];

  document.querySelectorAll(selectors.join(", ")).forEach((el) => el.remove());

  try {
    const w = window as Window & { adsbygoogle?: unknown[] };
    if (w.adsbygoogle) w.adsbygoogle = [];
  } catch {
    /* noop */
  }
}

export function AdPolicyGate() {
  useEffect(() => {
    stripUnwantedAdArtifacts();
    const observer = new MutationObserver(() => stripUnwantedAdArtifacts());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
