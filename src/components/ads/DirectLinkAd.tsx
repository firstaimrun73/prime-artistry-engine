import { DIRECT_LINK_URL, isAdRouteAllowed } from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { ADS_CONFIG } from "@/config/ads";

/**
 * Static in-page Direct Link sponsor card.
 * - One clickable target → DIRECT_LINK_URL
 * - Visible "Ad" / Sponsored label
 * - No auto-open, popup, vignette, or page-push
 * - Free signed-in non-admin only
 * - Never on excluded routes
 */
export function DirectLinkAd({
  placement = "in-content",
  className = "",
  variant = "default",
}: {
  placement?: string;
  className?: string;
  variant?: "default" | "compact";
}) {
  const { profile, user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!ADS_CONFIG.enabled) return null;
  if (loading) return null;
  if (!user || !profile) return null;

  const admin = isAdminEmail(profile.email);
  const audienceOk = shouldShowAds({
    plan: profile.plan,
    email: profile.email,
    isAdmin: admin,
  });
  if (!audienceOk) return null;
  if (!isAdRouteAllowed(pathname)) return null;

  const pad = variant === "compact" ? "px-3 py-2.5" : "px-4 py-3";
  const my = variant === "compact" ? "my-3" : "my-5";

  return (
    <div
      className={`${my} flex justify-center ${className}`}
      data-ad-placement={placement}
      role="complementary"
      aria-label="Sponsored advertisement"
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
          Partner offer · Opens in a new tab · Not a Motio2edit paid plan
        </p>
      </a>
    </div>
  );
}
