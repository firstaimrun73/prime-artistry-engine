/**
 * Ad policy gate — strips legacy automatic providers only.
 * Does NOT inject AdSense, Monetag, vignette, or push scripts.
 * Static banners are rendered by StaticBanner / FooterAd when allowed.
 */
import { useEffect } from "react";

function removeLegacyAdScripts() {
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
    if (window.adsbygoogle) window.adsbygoogle = [];
  } catch {
    /* noop */
  }
}

export function AdPolicyGate() {
  useEffect(() => {
    removeLegacyAdScripts();
    const t = window.setInterval(removeLegacyAdScripts, 5000);
    return () => window.clearInterval(t);
  }, []);
  return null;
}
