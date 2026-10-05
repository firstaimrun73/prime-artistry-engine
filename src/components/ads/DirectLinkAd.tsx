import { useAdsVisible } from "@/lib/site-settings";
import { DIRECT_LINK_URL, isAdRouteAllowed } from "@/config/ads";
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
 *
 * Destination research (2026-10-05):
 * https://omg10.com/4/10768443 is an opaque ad-network redirect (omg10.com).
 * Browser follow landed on Google homepage; network is known for variable
 * destinations (affiliate / adult / casino / VPN traffic). No stable
 * advertiser brand, logo, or creative could be verified. Therefore this
 * card uses neutral sponsored copy only — no fabricated brand or claims.
 */
export function DirectLinkAd({
  placement = "in-content",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  const adsOn = useAdsVisible();
  const { profile, user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const admin = isAdminEmail(profile?.email);
  const audienceOk = shouldShowAds({
    plan: profile?.plan ?? (user ? "free" : "free"),
    email: profile?.email,
    isAdmin: admin,
  });

  if (!adsOn) return null;
  if (!audienceOk) return null;
  if (!isAdRouteAllowed(pathname)) return null;

  return (
    <div
      className={`my-6 flex justify-center ${className}`}
      data-ad-placement={placement}
      role="complementary"
      aria-label="Advertisement"
    >
      <a
        href={DIRECT_LINK_URL}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group relative block w-full max-w-md overflow-hidden rounded-xl border border-dashed border-orange-400/70 bg-card/80 px-4 py-3 text-left shadow-sm transition hover:border-orange-500 hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
      >
        <span className="absolute right-2 top-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Ad
        </span>
        <p className="pr-10 text-sm font-medium text-foreground">
          Sponsored offer
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Explore this partner offer. Opens in a new tab.
        </p>
      </a>
    </div>
  );
}
