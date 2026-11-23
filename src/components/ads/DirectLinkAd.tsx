import {
  DIRECT_LINK_URL,
  SPONSOR_DISPLAY_NAME,
  SPONSOR_TAGLINE,
  isAdRouteAllowed,
  adPlacementCategory,
  ADS_CONFIG,
} from "@/config/ads";
import { useAdsVisible } from "@/lib/site-settings";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { ExternalLink, Sparkles } from "lucide-react";

/** Sponsored Direct Link — free signed-in non-admin only. No credit grant on click. */
export function DirectLinkAd({
  placement = "in-content",
  className = "",
  variant = "default",
  title,
}: {
  placement?: string;
  className?: string;
  variant?: "default" | "compact";
  /** Optional unique title so multiple placements are not identical. */
  title?: string;
}) {
  const category = adPlacementCategory(placement);
  const adsOn = useAdsVisible(category ?? undefined);
  const { profile, user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!ADS_CONFIG.enabled) return null;
  if (loading) return null;
  if (!user || !profile) return null;

  const admin = isAdminEmail(profile.email);
  if (!shouldShowAds({ plan: profile.plan, email: profile.email, isAdmin: admin })) return null;
  if (!isAdRouteAllowed(pathname)) return null;
  if (!adsOn && profile.plan !== "free") return null;

  const compact = variant === "compact";
  const headline = title ?? "Partner offers available";

  return (
    <div
      className={`${compact ? "my-4" : "my-6"} flex justify-center ${className}`}
      data-ad-placement={placement}
      role="complementary"
      aria-label="Sponsored advertisement"
    >
      <a
        href={DIRECT_LINK_URL}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group relative block w-full max-w-lg overflow-hidden rounded-2xl border border-orange-500/25 bg-gradient-to-br from-card via-card to-orange-500/5 shadow-md transition hover:border-orange-500/50 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
      >
        <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" />
        <div className={`relative flex items-center gap-3 ${compact ? "p-3.5" : "p-4 sm:p-5"}`}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-violet-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">
              Sponsored · {SPONSOR_DISPLAY_NAME}
            </span>
            <p className="mt-1 text-sm font-bold leading-snug text-foreground sm:text-[15px]">{headline}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{SPONSOR_TAGLINE}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition group-hover:bg-primary/90">
            Visit
            <ExternalLink className="h-3.5 w-3.5" />
          </span>
        </div>
      </a>
    </div>
  );
}
