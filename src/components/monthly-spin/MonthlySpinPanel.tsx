/**
 * Monthly Credit Spin UI — result only after server confirmation.
 * No client-side prize selection.
 */
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Sparkles, Gift } from "lucide-react";
import {
  MONTHLY_SPIN_DISPLAY_PRIZES,
  MONTHLY_SPIN_TIMEZONE_POLICY,
} from "@/lib/monthly-spin/config";
import {
  getMonthlySpinStatus,
  spinMonthlyCredits,
  type MonthlySpinResult,
} from "@/lib/monthly-spin/functions";

type Props = { signedIn: boolean; onClose?: () => void };

export function MonthlySpinPanel({ signedIn, onClose }: Props) {
  const statusFn = useServerFn(getMonthlySpinStatus);
  const spinFn = useServerFn(spinMonthlyCredits);

  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [alreadySpun, setAlreadySpun] = useState(false);
  const [canSpin, setCanSpin] = useState(true);
  const [result, setResult] = useState<MonthlySpinResult | null>(null);
  const [wheelDeg, setWheelDeg] = useState(0);

  const refresh = useCallback(async () => {
    if (!signedIn) return;
    try {
      const s = await statusFn();
      if (!s.ok) return;
      setAlreadySpun(!!s.alreadySpun);
      setCanSpin(!!s.canSpin && !s.alreadySpun);
      if (s.alreadySpun) {
        setResult({
          ok: true,
          alreadySpun: true,
          creditsWon: s.lastCredits ?? 0,
          prizeId: s.lastPrizeId,
          message: s.message || "Already spun this month.",
        });
      }
    } catch {
      /* ignore */
    }
  }, [signedIn, statusFn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSpin = async () => {
    if (!signedIn) {
      toast.message("Sign in to spin");
      return;
    }
    setSpinning(true);
    setLoading(true);
    // Visual spin only — outcome still from server
    setWheelDeg((d) => d + 1440 + Math.floor(Math.random() * 360));
    try {
      const res = await spinFn();
      // Let the wheel animate briefly
      await new Promise((r) => setTimeout(r, 900));
      setResult(res);
      if (res.ok) {
        if ((res.creditsWon ?? 0) > 0) {
          toast.success(res.message);
        } else {
          toast.message(res.message);
        }
        setAlreadySpun(true);
        setCanSpin(false);
      } else {
        toast.error(res.message || "Could not complete spin");
        if (res.reason === "already_spun") {
          setAlreadySpun(true);
          setCanSpin(false);
        }
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSpinning(false);
      setLoading(false);
    }
  };

  if (!signedIn) {
    return (
      <div className="space-y-4 p-1">
        <p className="text-sm text-muted-foreground">
          Sign in for one free spin each month. Prizes up to 1,000 credits — results are random and
          not guaranteed.
        </p>
        <p className="text-xs text-muted-foreground">{MONTHLY_SPIN_TIMEZONE_POLICY}</p>
        <Button asChild className="w-full">
          <Link to="/auth" search={{ mode: "signin", redirect: "/" }}>
            Sign in to spin
          </Link>
        </Button>
      </div>
    );
  }

  const won = result?.ok && (result.creditsWon ?? 0) > 0;
  const lost = result?.ok && (result.creditsWon ?? 0) === 0 && !result.alreadySpun;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-lg font-bold tracking-tight">Monthly Credit Spin</p>
        <p className="mt-1 text-sm text-muted-foreground">
          One spin per month. Outcomes are chosen securely — no promises of a particular prize.
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{MONTHLY_SPIN_TIMEZONE_POLICY}</p>
      </div>

      {/* Wheel */}
      <div className="relative mx-auto flex h-52 w-52 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full border-4 border-primary/30 bg-gradient-to-br from-violet-500/20 via-orange-500/15 to-emerald-500/20 shadow-inner transition-transform duration-1000 ease-out"
          style={{ transform: `rotate(${wheelDeg}deg)` }}
          aria-hidden
        >
          <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 p-3 text-[10px] font-bold">
            {MONTHLY_SPIN_DISPLAY_PRIZES.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-center rounded-xl bg-background/70 px-1 text-center text-foreground/80"
              >
                {p.credits > 0 ? `${p.credits}` : "Miss"}
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <Gift className="h-7 w-7" />
        </div>
      </div>

      {result?.ok && won && (
        <div className="space-y-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center animate-in fade-in zoom-in-95">
          <Sparkles className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">Congratulations!</p>
          <p className="text-sm">
            You won <strong>{result.creditsWon?.toLocaleString()}</strong> credits
            {result.newBalance != null ? ` · Balance: ${result.newBalance.toLocaleString()}` : ""}
          </p>
        </div>
      )}

      {result?.ok && (lost || (result.alreadySpun && (result.creditsWon ?? 0) === 0)) && (
        <div className="space-y-2 rounded-2xl border border-border bg-muted/40 p-4 text-center">
          <p className="text-lg font-semibold">Better luck next time!</p>
          <p className="text-sm text-muted-foreground">{result.message}</p>
        </div>
      )}

      {result?.ok && result.alreadySpun && (result.creditsWon ?? 0) > 0 && !won && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-center text-sm">
          This month you received {result.creditsWon} credits. Next spin next month.
        </div>
      )}

      {!alreadySpun && canSpin && (
        <Button
          type="button"
          className="w-full gap-2"
          size="lg"
          disabled={spinning || loading}
          onClick={() => void onSpin()}
        >
          {spinning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {spinning ? "Spinning…" : "Spin now"}
        </Button>
      )}

      {(alreadySpun || !canSpin) && result && (
        <Button type="button" variant="outline" className="w-full" onClick={onClose}>
          Close
        </Button>
      )}

      <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground sm:grid-cols-3">
        {MONTHLY_SPIN_DISPLAY_PRIZES.map((p) => (
          <li key={p.id} className="rounded-lg border border-border/60 px-2 py-1 text-center">
            {p.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
