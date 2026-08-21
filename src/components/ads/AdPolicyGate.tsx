import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { useAppSettings } from "@/lib/site-settings";
import { ADS_CONFIG } from "@/config/ads";

const MONETAG_VIGNETTE = "https://n6wxm.com/vignette.min.js";
const MONETAG_TAG = "https://nap5k.com/tag.min.js";
const ZONE_VIGNETTE = "11504738";
const ZONE_TAG = "11504740";
const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
  ADS_CONFIG.publisherId;

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
        "#monetag-vignette",
        "#monetag-tag",
        "#monetag-loader",
        "#adsense-loader",
      ].join(", "),
    )
    .forEach((el) => el.remove());
  try {
    if (window.adsbygoogle) window.adsbygoogle = [];
  } catch {
    /* noop */
  }
}

/**
 * Single gate for ad-provider scripts.
 * Admin Ads = OFF  → never inject AdSense or Monetag; strip existing scripts.
 * Admin Ads = ON   → inject only for the audience allowed by settings + plan policy.
 */
export function AdPolicyGate() {
  const { profile, user, loading } = useAuth();
  const settings = useAppSettings();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (typeof document === "undefined") return;

    const admin = isAdminEmail(profile?.email);
    const masterOn = ADS_CONFIG.enabled && settings.ads.enabled !== false;
    const audienceOk = shouldShowAds({
      plan: profile?.plan ?? (user ? "free" : "free"),
      email: profile?.email,
      isAdmin: admin,
    });
    const target = settings.ads.target;
    const plan = profile?.plan ?? "free";
    const targetOk =
      target !== "none" &&
      (target === "all" ||
        (target === "free" && plan === "free") ||
        (target === "paid" && !!user && plan !== "free"));

    const finalAllow = masterOn && audienceOk && targetOk && !admin;

    if (!finalAllow) {
      removeAdScripts();
      loadedRef.current = false;
      return;
    }

    if (loadedRef.current) return;

    const inject = (src: string, id: string, extra?: (s: HTMLScriptElement) => void) => {
      if (document.getElementById(id)) return;
      const s = document.createElement("script");
      s.id = id;
      s.src = src;
      s.async = true;
      extra?.(s);
      document.head.appendChild(s);
    };

    inject(ADSENSE_SRC, "adsense-loader", (s) => {
      s.crossOrigin = "anonymous";
    });

    if (document.querySelector('meta[name="monetag"]')) {
      inject(MONETAG_VIGNETTE, "monetag-vignette", (s) => {
        s.setAttribute("data-zone", ZONE_VIGNETTE);
      });
      inject(MONETAG_TAG, "monetag-tag", (s) => {
        s.setAttribute("data-zone", ZONE_TAG);
      });
    }

    loadedRef.current = true;
  }, [
    profile?.plan,
    profile?.email,
    user,
    loading,
    settings.ads.enabled,
    settings.ads.target,
  ]);

  return null;
}
