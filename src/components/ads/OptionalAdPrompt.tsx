/**
 * Optional ad prompts for free users (first Image Studio open / first download).
 * Does not grant credits. Opens partner Direct Link in a new tab when user opts in.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";
import { DIRECT_LINK_URL } from "@/config/ads";
import { Button } from "@/components/ui/button";
import { ExternalLink, Sparkles, X } from "lucide-react";

const KEY_STUDIO = "motio_opt_ad_studio_v1";
const KEY_DOWNLOAD = "motio_opt_ad_download_v1";

function isFreeEligible(plan: string | undefined, email: string | undefined) {
  if (!plan || isPaidPlan(plan)) return false;
  if (isAdminEmail(email)) return false;
  return true;
}

export function FreeStudioAdPrompt() {
  const { user, profile, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || !user || !profile) return;
    if (!isFreeEligible(profile.plan, profile.email)) return;
    try {
      if (localStorage.getItem(KEY_STUDIO) === "1") return;
    } catch {
      return;
    }
    setOpen(true);
  }, [user, profile, loading]);

  if (!open) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY_STUDIO, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl sm:bottom-6"
      role="dialog"
      aria-label="Optional advertisement"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold">Create more with Motio2edit!</p>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
              Ad
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Watch an optional advertisement to discover additional free-generation opportunities.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={DIRECT_LINK_URL}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={dismiss}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              Watch Ad
              <ExternalLink className="h-3 w-3" />
            </a>
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function FreeDownloadAdPrompt({
  trigger,
  onContinue,
}: {
  /** When true, show once if free user has not seen download prompt */
  trigger: boolean;
  onContinue: () => void;
}) {
  const { user, profile, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!trigger || loading || !user || !profile) return;
    if (!isFreeEligible(profile.plan, profile.email)) {
      onContinue();
      return;
    }
    try {
      if (localStorage.getItem(KEY_DOWNLOAD) === "1") {
        onContinue();
        return;
      }
    } catch {
      onContinue();
      return;
    }
    setOpen(true);
  }, [trigger, user, profile, loading, onContinue]);

  if (!open) return null;

  const mark = () => {
    try {
      localStorage.setItem(KEY_DOWNLOAD, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-center gap-2">
          <p className="text-base font-bold">Enjoying Motio2edit?</p>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
            Ad
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Watch an optional advertisement and support more free creative tools.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <a
            href={DIRECT_LINK_URL}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => {
              mark();
              onContinue();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Watch Ad
            <ExternalLink className="h-4 w-4" />
          </a>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              mark();
              onContinue();
            }}
          >
            Continue without Ad
          </Button>
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Or explore more on{" "}
          <Link to="/offers" className="font-semibold text-primary underline-offset-2 hover:underline">
            Gifts & Rewards
          </Link>
        </p>
      </div>
    </div>
  );
}
