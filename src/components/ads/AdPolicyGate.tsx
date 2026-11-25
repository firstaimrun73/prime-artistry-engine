import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { ADS_CONFIG } from "@/config/ads";

/**
 * Cleanup disallowed ad artifacts.
 * - Always strips AdSense and Monetag Multitag (quge5) — Multitag is banned.
 * - Allows vignette / IPP / Adsterra (bauval) only when marked data-motio-allowed="1" and user is eligible free.
 */
function removeDisallowedAdScripts(stripAllowedMotio: boolean) {
  if (typeof document === "undefined") return;

  document
    .querySelectorAll(
      [
        'script[src*="pagead2.googlesyndication.com"]',
        'script[src*="adsbygoogle.js"]',
        'script[src*="googlesyndication"]',
        'iframe[src*="googlesyndication"]',
        'iframe[src*="doubleclick"]',
        "#adsense-loader",
        "ins.adsbygoogle",
      ].join(", "),
    )
    .forEach((el) => el.remove());

  // Multitag permanently banned — always remove regardless of eligibility
  document
    .querySelectorAll(
      [
        'script[src*="quge5.com"]',
        "#motio-multitag-314190",
        "#motio-multitag-sponsor",
        'script[data-zone="314190"]',
        'script[data-zone="305489"]',
      ].join(", "),
    )
    .forEach((el) => el.remove());

  // Vignette + IPP + Adsterra: keep only data-motio-allowed="1" when eligible
  document
    .querySelectorAll(
      [
        'script[src*="n6wxm.com"]',
        'script[src*="nap5k.com"]',
        'script[src*="monetag"]',
        'script[src*="bauval.org"]',
        'iframe[src*="bauval.org"]',
        "#motio-monetag-vignette",
        "#motio-monetag-ipp",
      ].join(", "),
    )
    .forEach((el) => {
      const allowed = el.getAttribute("data-motio-allowed") === "1";
      if (!allowed || stripAllowedMotio) {
        el.remove();
      }
    });

  document.querySelectorAll('meta[name="monetag"]').forEach((el) => el.remove());

  try {
    const w = window as Window & { adsbygoogle?: unknown[] };
    if (w.adsbygoogle) w.adsbygoogle = [];
  } catch {
    /* noop */
  }
}

export function AdPolicyGate() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    const admin = isAdminEmail(profile?.email);
    const eligible =
      ADS_CONFIG.enabled &&
      !loading &&
      !!user &&
      !!profile &&
      shouldShowAds({
        plan: profile.plan,
        email: profile.email,
        isAdmin: admin,
      });

    const stripAllowed = !eligible;
    removeDisallowedAdScripts(stripAllowed);

    const observer = new MutationObserver(() => {
      removeDisallowedAdScripts(stripAllowed);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [user, profile, loading]);

  return null;
}
