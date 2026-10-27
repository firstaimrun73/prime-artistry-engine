import { useAdsVisible } from "@/lib/site-settings";
import { DIRECT_LINK_URL, isAdRouteAllowed, adPlacementCategory } from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { ExternalLink, Sparkles } from "lucide-react";

/**
 * Sponsored Direct Link card — one clear clickable offer (not a tag).
 * Free signed-in non-admin only. Fail closed while loading.
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
  const category = adPlacementCategory(placement);
  const adsOn = useAdsVisible(category ?? undefined);
  const { profile, user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) return null;
  if (!user) return null;
  if (!profile) return null;
  if (!adsOn) return null;

  const admin = isAdminEmail(profile.email);
  const audienceOk = shouldShowAds({
    plan: profile.plan,
    email: profile.email,
    isAdmin: admin,
  });

  if (!audienceOk) return null;
  if (!isAdRouteAllowed(pathname)) return null;

  const compact = variant === "compact";

  return (
    <div
      className={`${compact ? "my-5" : "my-7"} flex justify-center ${className}`}
      data-ad-placement={placement}
      role="complementary"
      aria-label="Sponsored"
    >
      <a
        href={DIRECT_LINK_URL}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group relative block w-full max-w-lg overflow-hidden rounded-2xl border border-orange-500/25 bg-gradient-to-br from-card via-card to-orange-500/5 shadow-md transition hover:border-orange-500/50 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
      >
        <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" />
        <span className="pointer-events-none absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-violet-500/10 blur-2xl" />

        <div className={`relative flex items-center gap-3 ${compact ? "p-3.5" : "p-4 sm:p-5"}`}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-violet-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                Sponsored
              </span>
            </div>
            <p className="mt-1 text-sm font-bold leading-snug text-foreground sm:text-[15px]">
              Exclusive partner offer for Motio2edit users
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap to open · trusted partner link
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition group-hover:bg-primary/90">
            View
            <ExternalLink className="h-3.5 w-3.5" />
          </span>
        </div>
      </a>
    </div>
  );
}
