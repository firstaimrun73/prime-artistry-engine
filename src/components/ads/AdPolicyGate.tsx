import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { ADS_CONFIG } from "@/config/ads";

/**
 * Cleanup disallowed ad-provider artifacts.
 * - Always strips AdSense / googlesyndication / doubleclick.
 * - Strips Monetag vignette / IPP (forced formats stay OFF).
 * - Does NOT strip Multitag scripts marked data-motio-allowed="1" when the user is eligible.
 * - Static Direct Link ads are pure UI and need no scripts.
 */
function removeDisallowedAdScripts(stripAllowedMultitag: boolean) {
  if (typeof document === "undefined") return;

  const selectors = [
    'script[src*="pagead2.googlesyndication.com"]',
    'script[src*="adsbygoogle.js"]',
    'script[src*="googlesyndication"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="doubleclick"]',
    "#adsense-loader",
    "ins.adsbygoogle",
    "#monetag-vignette",
    "#motio-monetag-vignette",
    "#motio-monetag-ipp",
    "#monetag-tag",
    "#monetag-loader",
  ];

  document.querySelectorAll(selectors.join(", ")).forEach((el) => el.remove());
  document.querySelectorAll('meta[name="monetag"]').forEach((el) => el.remove());

  // Strip forced vignette / IPP hosts always
  document
    .querySelectorAll('script[src*="n6wxm.com"], script[src*="nap5k.com"]')
    .forEach((el) => el.remove());

  // Multitag (quge5): keep only when allowed + eligible
  document.querySelectorAll('script[src*="quge5.com"]').forEach((el) => {
    const allowed = el.getAttribute("data-motio-allowed") === "1";
    if (!allowed || stripAllowedMultitag) {
      el.remove();
    }
  });

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
