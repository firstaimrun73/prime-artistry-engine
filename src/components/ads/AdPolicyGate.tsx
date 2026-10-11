import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { useAdsMasterEnabled } from "@/lib/site-settings";

/**
 * Cleanup of disallowed ad-provider artifacts.
 * - Always strips AdSense / googlesyndication / doubleclick.
 * - Strips Monetag scripts that are NOT marked data-motio-allowed="1".
 * - When the user is ineligible (paid / admin / logged-out / master off),
 *   also strips our allowed Monetag In-Page Push script so it cannot linger.
 * - Does NOT unregister arbitrary service workers (only those that may have
 *   been installed by known ad script origins are left alone; we no longer
 *   blanket-unregister all SWs).
 * Static Direct Link ads are pure UI and require no scripts.
 */
function removeDisallowedAdScripts(stripAllowedMonetag: boolean) {
  if (typeof document === "undefined") return;

  const selectors = [
    'script[src*="pagead2.googlesyndication.com"]',
    'script[src*="adsbygoogle.js"]',
    'script[src*="googlesyndication"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="doubleclick"]',
    "#adsense-loader",
    "ins.adsbygoogle",
    // Legacy Monetag markers without our allow flag
    "#monetag-vignette",
    "#monetag-tag",
    "#monetag-loader",
  ];

  document.querySelectorAll(selectors.join(", ")).forEach((el) => el.remove());
  document.querySelectorAll('meta[name="monetag"]').forEach((el) => el.remove());

  // Monetag scripts: keep only those explicitly allowed by our loader
  document.querySelectorAll('script[src*="n6wxm.com"], script[src*="nap5k.com"], script[src*="monetag"]').forEach((el) => {
    const allowed = el.getAttribute("data-motio-allowed") === "1";
    if (!allowed || stripAllowedMonetag) {
      el.remove();
    }
  });

  try {
    if ((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle) {
      (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle = [];
    }
  } catch {
    /* noop */
  }
}

export function AdPolicyGate() {
  const { user, profile, loading } = useAuth();
  const masterOn = useAdsMasterEnabled();

  useEffect(() => {
    const admin = isAdminEmail(profile?.email);
    const plan = profile?.plan ?? (user ? "free" : undefined);
    // Fail closed while loading or when master is off / not eligible
    const eligible =
      !loading &&
      masterOn &&
      !!user &&
      shouldShowAds({ plan: plan ?? "free", email: profile?.email, isAdmin: admin });

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
  }, [user, profile?.plan, profile?.email, loading, masterOn]);

  return null;
}
