import { Coins } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Compact credit balance + spend reminder for studio / dashboard surfaces.
 */
export function CreditSpendHint({
  costLabel,
  className,
}: {
  /** e.g. "Typical image edit: 2–8 credits" */
  costLabel?: string;
  className?: string;
}) {
  const { profile, user } = useAuth();
  if (!user || !profile) return null;

  const credits = profile.credits ?? 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/80 px-3 py-2.5 text-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-amber-500" />
        <span className="font-semibold tabular-nums">{credits.toLocaleString()}</span>
        <span className="text-muted-foreground">credits available</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {costLabel ? <span>{costLabel}</span> : null}
        <Link to="/pricing" className="font-semibold text-primary hover:underline">
          Get more
        </Link>
      </div>
    </div>
  );
}
