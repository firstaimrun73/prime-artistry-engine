import { useEffect } from "react";
import { useAdsVisible } from "@/lib/site-settings";

/**
 * Small, tasteful ad slot shown ONLY when the admin master switch is ON
 * and the Monetag verification meta tag is present in <head>.
 * When Ads are OFF the script is not injected and any existing loader is removed.
 */
export function MonetagBanner({ show }: { show: boolean }) {
  const adsOn = useAdsVisible();
  const allow = show && adsOn;

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!allow) {
      document.getElementById("monetag-loader")?.remove();
      return;
    }
    if (!document.querySelector('meta[name="monetag"]')) return;
    if (document.getElementById("monetag-loader")) return;
    const s = document.createElement("script");
    s.id = "monetag-loader";
    s.src = "//monetag.com/publisher.js";
    s.async = true;
    s.setAttribute("data-zone", "auto");
    document.head.appendChild(s);
  }, [allow]);

  if (!allow) return null;
  if (typeof document !== "undefined" && !document.querySelector('meta[name="monetag"]')) {
    return null;
  }

  return (
    <div
      id="monetag-banner"
      style={{
        textAlign: "center",
        margin: "16px auto",
        maxWidth: 300,
        minHeight: 50,
      }}
    />
  );
}
