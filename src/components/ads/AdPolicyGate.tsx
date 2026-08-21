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
const MONETAG_META_CONTENT = "33e021a97699ebb3967c7b1d695f16d4";
const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
  ADS_CONFIG.publisherId;

/**
 * Strip every known ad provider artifact from the DOM.
 * Used when Admin Ads = OFF or the current visitor is not in the ad audience.
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
    if (window.adsbygoogle) window.adsbygoogle = [];
  } catch {
    /* noop */
  }
}

function ensureMonetagMeta() {
  if (typeof document === "undefined") return;
  if (document.querySelector('meta[name="monetag"]')) return;
  const m = document.createElement("meta");
  m.name = "monetag";
  m.content = MONETAG_META_CONTENT;
  document.head.appendChild(m);
}

/**
 * Single gate for ad-provider scripts.
 * Admin Ads = OFF  → never inject AdSense or Monetag; strip existing scripts + meta.
 * Admin Ads = ON   → inject only for the audience allowed by settings + plan policy.
 *
 * No SSR injection of AdSense/Monetag. This client gate is the only injector.
 */
export function AdPolicyGate() {
  const { profile, user, loading } = useAuth();
  const settings = useAppSettings();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (typeof document === "undefined") return;

    const admin = isAdminEmail(profile?.email);
    // Master switch: compile-time kill switch AND admin persisted setting.
    // settings.ads.enabled === false must always win.
    const masterOn = ADS_CONFIG.enabled && settings.ads.enabled === true;
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

    // Monetag meta is intentionally NOT in the static document shell.
    // Only present when Ads are ON so verification + scripts stay gated.
    ensureMonetagMeta();
    inject(MONETAG_VIGNETTE, "monetag-vignette", (s) => {
      s.setAttribute("data-zone", ZONE_VIGNETTE);
    });
    inject(MONETAG_TAG, "monetag-tag", (s) => {
      s.setAttribute("data-zone", ZONE_TAG);
    });

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
