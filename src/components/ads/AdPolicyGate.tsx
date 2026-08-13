import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";

const MONETAG_VIGNETTE = "https://n6wxm.com/vignette.min.js";
const MONETAG_TAG = "https://nap5k.com/tag.min.js";
const ZONE_VIGNETTE = "11504738";
const ZONE_TAG = "11504740";

/**
 * Loads Monetag vignette / in-page scripts ONLY when the authoritative
 * ad policy allows it (free, non-admin). Paid and admin users never get
 * these scripts injected.
 *
 * Mount once near the app root (inside AuthProvider). Does not alter layout.
 */
export function AdPolicyGate() {
  const { profile, user, loading } = useAuth();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (typeof document === "undefined") return;

    const admin = isAdminEmail(profile?.email);
    const allow = shouldShowAds({
      plan: profile?.plan ?? (user ? "free" : null),
      email: profile?.email,
      isAdmin: admin,
    });

    // Unauthenticated visitors may see ads on public pages (treat as free).
    // Authenticated paid/admin must never load Monetag.
    const finalAllow = user ? allow : true;

    if (!finalAllow) {
      // Remove any previously injected Monetag scripts (e.g. after upgrade).
      document
        .querySelectorAll(
          'script[src*="n6wxm.com"], script[src*="nap5k.com"], script[src*="monetag"]',
        )
        .forEach((el) => el.remove());
      loadedRef.current = false;
      return;
    }

    if (loadedRef.current) return;

    // Only load if Monetag meta verification tag is present.
    if (!document.querySelector('meta[name="monetag"]')) return;

    const inject = (src: string, zone: string, id: string) => {
      if (document.getElementById(id)) return;
      const s = document.createElement("script");
      s.id = id;
      s.src = src;
      s.async = true;
      s.setAttribute("data-zone", zone);
      document.head.appendChild(s);
    };

    inject(MONETAG_VIGNETTE, ZONE_VIGNETTE, "monetag-vignette");
    inject(MONETAG_TAG, ZONE_TAG, "monetag-tag");
    loadedRef.current = true;
  }, [profile?.plan, profile?.email, user, loading]);

  return null;
}
