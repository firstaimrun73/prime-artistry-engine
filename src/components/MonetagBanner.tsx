import { useEffect } from "react";

/**
 * Small, tasteful ad slot shown ONLY to free-plan users, and ONLY when the
 * Monetag verification meta tag is present in <head>. When Monetag is not
 * connected the component renders nothing at all — no placeholder, no text.
 */
export function MonetagBanner({ show }: { show: boolean }) {
  useEffect(() => {
    if (!show) return;
    if (typeof document === "undefined") return;
    // Only load the ad script if the Monetag meta tag has been verified.
    if (!document.querySelector('meta[name="monetag"]')) return;
    if (document.getElementById("monetag-loader")) return;
    const s = document.createElement("script");
    s.id = "monetag-loader";
    s.src = "//monetag.com/publisher.js";
    s.async = true;
    s.setAttribute("data-zone", "auto");
    document.head.appendChild(s);
  }, [show]);

  if (!show) return null;
  // Hide completely when Monetag is not connected.
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
