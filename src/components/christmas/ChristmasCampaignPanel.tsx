/**
 * Campaign claim UI — non-blocking, dismissible, server-verified timer.
 * Congrats only after confirmed successful claim.
 */
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CHRISTMAS_REWARD_CREDITS,
  CHRISTMAS_SESSION_SECONDS,
  formatRemaining,
} from "@/lib/christmas-campaign";
import { getActiveCampaignConfig, isChristmasGiftActive } from "@/lib/campaign-config";
import {
  startChristmasCampaign,
  getChristmasCampaignStatus,
  claimChristmasGift,
} from "@/lib/christmas-campaign.functions";
import { ClaimCelebration } from "@/components/christmas/ClaimCelebration";
import { Gift, Loader2, CheckCircle2, Clock } from "lucide-react";

type Props = {
  onClose?: () => void;
  signedIn: boolean;
};

export function ChristmasCampaignPanel({ onClose, signedIn }: Props) {
  const startFn = useServerFn(startChristmasCampaign);
  const statusFn = useServerFn(getChristmasCampaignStatus);
  const claimFn = useServerFn(claimChristmasGift);
  const campaign = getActiveCampaignConfig();

  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [celebration, setCelebration] = useState<{
    creditsGranted: number;
    newBalance?: number;
  } | null>(null);
  const [status, setStatus] = useState<{
    hasSession: boolean;
    claimed: boolean;
    remainingSeconds: number;
    eligible: boolean;
    creditsGranted?: number | null;
  } | null>(null);

  const refresh = useCallback(async () => {
    if (!signedIn) return;
    try {
      const s = await statusFn();
      if (!s.ok) return;
      setStatus({
        hasSession: !!s.hasSession,
        claimed: !!s.claimed,
        remainingSeconds: s.remainingSeconds ?? CHRISTMAS_SESSION_SECONDS,
        eligible: !!s.eligible,
        creditsGranted: s.creditsGranted,
      });
    } catch {
      /* ignore network blips */
    }
  }, [signedIn, statusFn]);

  useEffect(() => {
    void refresh();
    if (!signedIn) return;
    const id = window.setInterval(() => void refresh(), 15000);
    return () => clearInterval(id);
  }, [signedIn, refresh]);

  const onStart = async () => {
    if (!signedIn) {
      toast.message("Sign in to start the campaign");
      return;
    }
    if (!isChristmasGiftActive()) {
      toast.message("This seasonal gift campaign has ended");
      return;
    }
    setLoading(true);
    try {
      const res = await startFn();
      if (!res.ok) {
        if (res.reason === "campaign_inactive") {
          toast.error(res.message || "This campaign is not active right now.");
        } else {
          toast.error(res.message || "Could not start campaign");
        }
        await refresh();
        return;
      }
      if (res.alreadyClaimed) {
        toast.message("You already claimed this Christmas gift");
      } else {
        toast.success("Campaign started — explore Motio2edit for 10 minutes");
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start campaign");
    } finally {
      setLoading(false);
    }
  };

  const onClaim = async () => {
    setClaiming(true);
    try {
      const res = await claimFn();
      if (res.ok) {
        const granted = res.creditsGranted ?? CHRISTMAS_REWARD_CREDITS;
        setCelebration({
          creditsGranted: granted,
          newBalance: res.newBalance,
        });
        toast.success(res.message || `+${granted} credits added!`);
        await refresh();
      } else if (res.reason === "too_early") {
        toast.message(res.message || "Keep exploring a little longer");
        await refresh();
      } else if (res.reason === "already_claimed") {
        toast.message(res.message || "Already claimed");
        await refresh();
      } else if (res.reason === "campaign_inactive") {
        toast.error(res.message || "This campaign is not active right now.");
        await refresh();
      } else {
        toast.error(res.message || "Could not claim gift");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  };

  if (celebration) {
    return (
      <ClaimCelebration
        creditsGranted={celebration.creditsGranted}
        newBalance={celebration.newBalance}
        onDismiss={() => {
          setCelebration(null);
          onClose?.();
        }}
      />
    );
  }

  if (!isChristmasGiftActive()) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
        <p className="font-semibold text-foreground">{campaign.headline}</p>
        <p className="text-muted-foreground">{campaign.body}</p>
        <Button asChild className="w-full">
          <Link to="/pricing">{campaign.ctaStart}</Link>
        </Button>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 text-2xl">
            🎅
          </div>
          <div>
            <p className="font-semibold text-foreground">{campaign.headline}</p>
            <p className="mt-1 text-sm text-muted-foreground">{campaign.body}</p>
          </div>
        </div>
        <Button asChild className="w-full">
          <Link to="/auth" search={{ mode: "signin", redirect: "/" }}>
            Sign in to start
          </Link>
        </Button>
      </div>
    );
  }

  if (status?.claimed) {
    return (
      <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">Gift claimed</span>
        </div>
        <p className="text-sm text-muted-foreground">
          You received {status.creditsGranted ?? CHRISTMAS_REWARD_CREDITS} credits. Enjoy creating!
        </p>
        {onClose ? (
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-green-500/10 p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-background/80 text-3xl shadow-sm">
          🎅
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            {campaign.emoji} {campaign.headline}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{campaign.body}</p>
        </div>
      </div>

      {!status?.hasSession ? (
        <Button type="button" className="w-full gap-2" disabled={loading} onClick={() => void onStart()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
          {campaign.ctaStart}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              Session timer
            </span>
            <span className="font-mono font-semibold tabular-nums">
              {status.eligible ? "Ready to claim" : formatRemaining(status.remainingSeconds)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Browse freely — the timer continues while you use Motio2edit. Return here when ready.
          </p>
          <Button
            type="button"
            className="w-full gap-2"
            disabled={!status.eligible || claiming}
            onClick={() => void onClaim()}
          >
            {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
            {status.eligible ? campaign.ctaClaim : "Keep exploring…"}
          </Button>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        One claim per account for this campaign. Credits are granted server-side after the qualifying
        session. This is separate from the optional Sponsored no-watermark unlock.
      </p>
    </div>
  );
}
