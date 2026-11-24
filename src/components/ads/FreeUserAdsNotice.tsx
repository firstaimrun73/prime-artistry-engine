/**
 * One-time (per session) glass notification for free users after login.
 * Paid users never see this.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { X, Sparkles } from "lucide-react";

const SESSION_KEY = "motio2edit-free-ads-notice-seen";

export function FreeUserAdsNotice() {
  const { user, profile, loading } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || !user || !profile) return;
    const admin = isAdminEmail(profile.email);
    if (!shouldShowAds({ plan: profile.plan, email: profile.email, isAdmin: admin })) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(t);
  }, [user, profile, loading]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-3 sm:bottom-6 md:bottom-8"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto relative w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-2xl border border-orange-500/30 bg-background/85 p-4 shadow-xl backdrop-blur-xl dark:bg-background/80">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-3 pr-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-violet-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Free plan notice</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Advertisements are displayed for free users. Enjoy your free access to Motio2edit!
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
