import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  available: number;
  used: number;
  allocation: number;
  className?: string;
  /** Compact single-line variant for headers/side panels */
  compact?: boolean;
};

/**
 * Shared credit usage display. Always uses real profile numbers — never invents balances.
 */
export function CreditsUsageBar({
  available,
  used,
  allocation,
  className,
  compact = false,
}: Props) {
  const pct =
    allocation > 0 ? Math.min(100, Math.round((used / Math.max(allocation, 1)) * 100)) : 0;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        <Coins className="h-4 w-4 shrink-0 text-primary" />
        <span className="font-semibold tabular-nums">{available.toLocaleString()}</span>
        <span className="text-muted-foreground">credits</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">AI Credits</h2>
        </div>
        {allocation > 0 && (
          <span className="text-xs font-medium text-muted-foreground">{pct}% used</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Available
          </p>
          <p className="mt-0.5 text-2xl font-extrabold tabular-nums tracking-tight">
            {available.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Used
          </p>
          <p className="mt-0.5 text-2xl font-extrabold tabular-nums tracking-tight">
            {used.toLocaleString()}
          </p>
        </div>
        {allocation > 0 && (
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Plan pool
            </p>
            <p className="mt-0.5 text-2xl font-extrabold tabular-nums tracking-tight">
              {allocation.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {allocation > 0 && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${pct}% of plan credits used`}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Credits are shared across Image, Video, and Music tools.
          </p>
        </div>
      )}
    </div>
  );
}
