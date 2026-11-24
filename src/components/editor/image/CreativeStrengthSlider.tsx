/**
 * Creative Strength Slider — UI-only playful control for Image Studio.
 * Free: 0–50%. Paid: 0–100%. Does NOT affect generation, API, credits, or quality.
 */
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";
import { cn } from "@/lib/utils";

export function CreativeStrengthSlider({
  className = "",
}: {
  className?: string;
}) {
  const { profile } = useAuth();
  const admin = isAdminEmail(profile?.email);
  const paid = admin || isPaidPlan(profile?.plan);
  const max = paid ? 100 : 50;
  const [value, setValue] = useState(Math.min(35, max));

  const onChange = (raw: number) => {
    const next = Math.max(0, Math.min(max, Math.round(raw)));
    setValue(next);
  };

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-xl rounded-2xl border border-orange-500/25 bg-background/70 px-3 py-2.5 shadow-sm backdrop-blur-xl dark:bg-background/60",
        className,
      )}
      data-ui-only="creative-strength"
      role="group"
      aria-label="Creative strength (visual only)"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-foreground">
            Creative strength
            <span className="ml-1.5 rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-600 dark:text-orange-400">
              Visual only
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            Studio control · does not change AI output or credits
            {!paid ? " · free plan max 50%" : ""}
          </p>
        </div>
        <span className="tabular-nums text-sm font-bold text-orange-600 dark:text-orange-400">
          {value}%
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-orange-500"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label="Creative strength percentage"
        />
      </div>
      {!paid && value >= 50 && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Upgrade for the full 0–100% range (still visual-only).
        </p>
      )}
    </div>
  );
}
