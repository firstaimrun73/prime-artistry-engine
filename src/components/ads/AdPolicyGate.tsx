import { useEffect } from "react";

/**
 * EMERGENCY ad cleanup — always strip Monetag, AdSense, and known ad iframes.
 */
function stripAllAdArtifacts() {
  if (typeof document === "undefined") return;

  const selectors = [
    'script[src*="pagead2.googlesyndication.com"]',
    'script[src*="adsbygoogle.js"]',
    'script[src*="googlesyndication"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="doubleclick"]',
    "#adsense-loader",
    "ins.adsbygoogle",
    "#monetag-tag",
    "#monetag-loader",
    "#motio-monetag-vignette",
    "#motio-monetag-ipp",
    "#monetag-vignette",
    'script[src*="n6wxm.com"]',
    'script[src*="nap5k.com"]',
    'script[src*="monetag"]',
    'script[src*="omg10.com"]',
    'iframe[src*="n6wxm"]',
    'iframe[src*="nap5k"]',
    'iframe[src*="monetag"]',
  ];

  document.querySelectorAll(selectors.join(", ")).forEach((el) => el.remove());
  document.querySelectorAll('meta[name="monetag"]').forEach((el) => el.remove());

  try {
    const w = window as Window & { adsbygoogle?: unknown[] };
    if (w.adsbygoogle) w.adsbygoogle = [];
  } catch {
    /* noop */
  }
}

export function AdPolicyGate() {
  useEffect(() => {
    stripAllAdArtifacts();
    const observer = new MutationObserver(() => stripAllAdArtifacts());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
