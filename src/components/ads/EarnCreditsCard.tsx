import { ExternalLink, Sparkles } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { MONETAG_MULTITAG_URL, SPONSOR_DISPLAY_NAME, isAdRouteAllowed } from "@/config/ads";

/**
 * Compact partner recommendation — never promises automatic free credits.
 */
export function EarnCreditsCard({ className = "" }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!isAdRouteAllowed(pathname)) return null;

  return (
    <div
      className={`my-5 flex justify-center ${className}`}
      data-ad-placement="partner-recommend"
      role="complementary"
      aria-label="Sponsored partner recommendation"
    >
      <a
        href={MONETAG_MULTITAG_URL}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group flex w-full max-w-lg items-center gap-3 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/5 via-card to-card px-4 py-3.5 shadow-sm transition hover:border-primary/45 hover:from-primary/10"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
            Sponsored · {SPONSOR_DISPLAY_NAME}
          </p>
          <p className="text-sm font-bold text-foreground">Discover something useful</p>
          <p className="text-xs text-muted-foreground">
            Explore partner offers · opens in a new tab
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
          Explore Offer
          <ExternalLink className="h-3.5 w-3.5" />
        </span>
      </a>
    </div>
  );
}
