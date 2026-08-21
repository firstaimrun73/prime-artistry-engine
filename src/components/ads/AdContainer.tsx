import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ADS_CONFIG } from "@/config/ads";
import { useAdsVisible } from "@/lib/site-settings";

type AdContainerProps = {
  slot?: string;
  format?: string;
  layoutKey?: string;
  responsive?: boolean;
  style?: CSSProperties;
  className?: string;
  width?: number;
  height?: number;
};

/**
 * Base AdSense container.
 * Does not render or push ads when the admin master switch is OFF.
 */
export function AdContainer({
  slot,
  format = "auto",
  layoutKey,
  responsive = true,
  style,
  className = "",
  width,
  height,
}: AdContainerProps) {
  const adsOn = useAdsVisible();
  const wrapRef = useRef<HTMLDivElement>(null);
  const insRef = useRef<HTMLModElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [pushed, setPushed] = useState(false);

  useEffect(() => {
    if (!adsOn) return;
    const node = wrapRef.current;
    if (!node || pushed) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
              setPushed(true);
            } catch {
              /* noop */
            }
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [pushed, adsOn]);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const mo = new MutationObserver(() => {
      const el = node.querySelector("ins.adsbygoogle");
      if (!el) return;
      const status = el.getAttribute("data-ad-status");
      if (status === "unfilled") setCollapsed(true);
      if (status === "filled") setCollapsed(false);
    });
    mo.observe(node, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-ad-status"],
    });
    return () => mo.disconnect();
  }, []);

  if (!adsOn) return null;
  if (collapsed) return null;

  const insStyle: CSSProperties =
    width && height
      ? { display: "inline-block", width, height }
      : { display: "block", ...style };

  return (
    <div
      ref={wrapRef}
      className={`ad-slot rounded-lg bg-card/50 dark:bg-card/30 transition-colors ${className}`}
      style={{ minHeight: 0 }}
      aria-hidden="true"
    >
      <ins
        ref={(el) => {
          insRef.current = el;
        }}
        className="adsbygoogle"
        style={insStyle}
        data-ad-client={ADS_CONFIG.publisherId}
        {...(slot ? { "data-ad-slot": slot } : {})}
        {...(layoutKey ? { "data-ad-layout-key": layoutKey } : {})}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
