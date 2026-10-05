import { useAdsVisible } from "@/lib/site-settings";
import { DIRECT_LINK_URL, isAdRouteAllowed } from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";

type DirectLinkAdProps = {
  /** Optional placement key for analytics / future toggles. */
  placement?: string;
  className?: string;
};

/**
 * Single intentional-click in-page ad card.
 * Destination verified only as Direct Link URL (omg10 CPA). Advertiser brand
 * could not be confirmed from the live redirect (cloaked / empty response),
 * so copy stays neutral — no fabricated logo, claims, or product name.
 *
 * - One clickable surface only
 * - Opens DIRECT_LINK_URL in a new tab on user click
 * - Never auto-opens, never popup, never notification
 * - Visible "Ad" disclosure
 * - Free users only via useAdsVisible + admin master switch
 */
export function DirectLinkAd({ placement = "default", className = "" }: DirectLinkAdProps) {
  const adsOk = useAdsVisible();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!adsOk) return null;
  if (!isAdRouteAllowed(pathname)) return null;

  return (
    <aside
      className={`mx-auto my-6 w-full max-w-3xl ${className}`}
      data-ad-placement={placement}
      aria-label="Advertisement"
    >
      <a
        href={DIRECT_LINK_URL}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="relative block overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ minHeight: 88 }}
      >
        <span
          className="absolute left-3 top-3 rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
          style={{ background: "#6b7280", lineHeight: 1.2 }}
        >
          Ad
        </span>
        <div className="flex items-center gap-4 pl-10 pr-1 pt-1">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white"
            style={{ background: "linear-gradient(135deg,#64748b,#334155)" }}
            aria-hidden
          >
            ★
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Sponsored offer</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Explore this partner offer. Opens in a new tab.
            </p>
          </div>
          <span
            className="inline-flex shrink-0 items-center justify-center rounded-lg px-3 text-xs font-bold text-white"
            style={{ background: "#FF5A1F", minHeight: 40, minWidth: 72 }}
          >
            Open
          </span>
        </div>
      </a>
    </aside>
  );
}
