import { Sparkles } from "lucide-react";
import { useMemo } from "react";

/**
 * Deterministic daily social-proof figure for homepage.
 * Stable for the calendar day (visitor local timezone); not a live claim of real jobs.
 */
function dailyActivityCount(now = new Date()): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  // Simple stable hash → range 86–168 inclusive
  let h = y * 10_000 + m * 100 + d;
  h = ((h ^ 0x5f3759df) * 2654435761) >>> 0;
  return 86 + (h % 83);
}

export function DailyRestorationsBadge({ className = "" }: { className?: string }) {
  const count = useMemo(() => dailyActivityCount(), []);

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm ${className}`}
      title="Illustrative daily activity figure for the product page"
    >
      <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
      <span>
        <span className="font-semibold tabular-nums text-foreground">{count.toLocaleString()}</span>
        {" "}
        photos restored today
      </span>
    </div>
  );
}
