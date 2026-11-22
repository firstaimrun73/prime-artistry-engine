/**
 * Shown only after a confirmed successful Supabase claim.
 * Not triggered by client timers or ad interactions.
 */
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  creditsGranted: number;
  newBalance?: number;
  onDismiss: () => void;
};

export function ClaimCelebration({ creditsGranted, newBalance, onDismiss }: Props) {
  useEffect(() => {
    try {
      const el = document.getElementById("christmas-claim-announce");
      if (el) el.focus();
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      id="christmas-claim-announce"
      tabIndex={-1}
      className="animate-in fade-in zoom-in-95 duration-300 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-background to-orange-500/10 p-5 shadow-lg outline-none"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-2xl">
          🎁
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Christmas gift claimed
          </p>
          <p className="mt-1 text-sm text-foreground">
            +{creditsGranted} credits added to your account.
          </p>
          {typeof newBalance === "number" ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Updated balance: <span className="font-semibold tabular-nums">{newBalance.toLocaleString()}</span>{" "}
              credits
            </p>
          ) : null}
        </div>
      </div>
      <Button type="button" size="sm" variant="outline" className="mt-4" onClick={onDismiss}>
        Continue creating
      </Button>
    </div>
  );
}
