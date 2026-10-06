import { useAdsVisible } from "@/lib/site-settings";
import { DIRECT_LINK_URL, isAdRouteAllowed, adPlacementCategory } from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";

/**
 * Static in-page Direct Link ad card.
 * - ONE clickable target only → DIRECT_LINK_URL
 * - Visible "Ad" label
 * - No auto-open, popup, vignette, page-push, or notification behavior
 * - Free signed-in non-admin only (useAdsVisible + shouldShowAds)
 * - Never on excluded routes
 */
export function DirectLinkAd({
  placement = "in-content",
  className = "",
  variant = "default",
}: {
  placement?: string;
  className?: string;
  /** compact = tighter vertical rhythm for dense studio UIs */
  variant?: "default" | "compact";
}) {
  const category = adPlacementCategory(placement);
  const adsOn = useAdsVisible(category ?? undefined);
  const { profile, user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const admin = isAdminEmail(profile?.email);
  const audienceOk = shouldShowAds({
    plan: profile?.plan ?? (user ? "free" : "free"),
    email: profile?.email,
    isAdmin: admin,
  });

  if (!user) return null;
  if (!adsOn) return null;
  if (!audienceOk) return null;
  if (!isAdRouteAllowed(pathname)) return null;

  const pad = variant === "compact" ? "px-3 py-2.5" : "px-4 py-3";
  const my = variant === "compact" ? "my-4" : "my-6";

  return (
    <div
      className={`${my} flex justify-center ${className}`}
      data-ad-placement={placement}
      role="complementary"
      aria-label="Advertisement"
    >
      <a
        href={DIRECT_LINK_URL}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className={`group relative block w-full max-w-md overflow-hidden rounded-xl border border-border/80 bg-card/70 ${pad} text-left shadow-sm backdrop-blur-md transition hover:border-orange-400/60 hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500`}
      >
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-purple-500/5" />
        <span className="absolute right-2 top-2 rounded-md bg-muted/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Ad
        </span>
        <p className="relative pr-10 text-sm font-medium text-foreground">Sponsored offer</p>
        <p className="relative mt-0.5 text-xs text-muted-foreground">
          Explore this partner offer · Opens in a new tab
        </p>
      </a>
    </div>
  );
}
