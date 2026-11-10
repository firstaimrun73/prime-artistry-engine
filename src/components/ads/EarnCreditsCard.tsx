import { MONETAG_MULTITAG_URL, isAdRouteAllowed } from "@/config/ads";
import { useAdsVisible } from "@/lib/site-settings";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { useRouterState } from "@tanstack/react-router";
import { Coins, ExternalLink } from "lucide-react";

/**
 * Partner multitags / direct-link card — free users only.
 * Clearly sponsored; not fake "free unlimited credits".
 */
export function EarnCreditsCard({ className = "" }: { className?: string }) {
  const adsOn = useAdsVisible("home");
  const { profile, user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading || !user || !profile || !adsOn) return null;
  const admin = isAdminEmail(profile.email);
  if (!shouldShowAds({ plan: profile.plan, email: profile.email, isAdmin: admin })) return null;
  if (!isAdRouteAllowed(pathname)) return null;

  return (
    <div
      className={`my-5 flex justify-center ${className}`}
      data-ad-placement="earn-credits"
      role="complementary"
      aria-label="Partner offer"
    >
      <a
        href={MONETAG_MULTITAG_URL}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group flex w-full max-w-lg items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3.5 shadow-sm transition hover:border-primary/50 hover:bg-primary/10"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Coins className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Partner · Sponsored</p>
          <p className="text-sm font-bold text-foreground">Explore partner offers</p>
          <p className="text-xs text-muted-foreground">
            Optional partner link for free-plan users · not Motio2edit credits
          </p>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
      </a>
    </div>
  );
}
