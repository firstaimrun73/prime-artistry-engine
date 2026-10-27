import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { useAdsMasterEnabled } from "@/lib/site-settings";
import { isAdRouteAllowed } from "@/config/ads";

/**
 * Cleanup of disallowed ad-provider artifacts.
 * - Always strips AdSense / googlesyndication / doubleclick.
 * - When ineligible: strips ALL Monetag scripts (n6wxm / nap5k / monetag).
 * - When eligible: keeps Monetag network scripts (loader + vignette children).
 *   (Previously we required data-motio-allowed on every child script, which
 *   deleted Monetag's injected files and killed the vignette.)
 */
function removeDisallowedAdScripts(stripMonetag: boolean) {
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
  ];

  document.querySelectorAll(selectors.join(", ")).forEach((el) => el.remove());
  document.querySelectorAll('meta[name="monetag"]').forEach((el) => el.remove());

  if (stripMonetag) {
    document
      .querySelectorAll(
        'script[src*="n6wxm.com"], script[src*="nap5k.com"], script[src*="monetag"], #motio-monetag-vignette, #monetag-vignette',
      )
      .forEach((el) => el.remove());
  }

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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const admin = isAdminEmail(profile?.email);
    const routeOk = isAdRouteAllowed(pathname);
    const eligible =
      !loading &&
      masterOn &&
      !!user &&
      !!profile &&
      routeOk &&
      shouldShowAds({
        plan: profile.plan,
        email: profile.email,
        isAdmin: admin,
      });

    const stripMonetag = !eligible;
    removeDisallowedAdScripts(stripMonetag);

    const observer = new MutationObserver(() => {
      removeDisallowedAdScripts(stripMonetag);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [user, profile, loading, masterOn, pathname]);

  return null;
}
