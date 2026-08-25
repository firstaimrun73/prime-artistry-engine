import { cn } from "@/lib/utils";
import {
  STUDIO_TIER_META,
  STUDIO_TIERS,
  type StudioTier,
} from "@/lib/studio/studio-tier";
import { Lock, Sparkles, Zap, Circle } from "lucide-react";

const TIER_DETAIL: Record<
  StudioTier,
  { capability: string; Icon: typeof Circle }
> = {
  standard: {
    capability: "Essential",
    Icon: Circle,
  },
  pro: {
    capability: "Upgraded",
    Icon: Zap,
  },
  premium: {
    capability: "Flagship",
    Icon: Sparkles,
  },
};

export function StudioTierSelector({
  value,
  onChange,
  locked,
  className,
  /** When false, Premium (pro) + Ultra AI (premium) are hidden — admin only. */
  showPremiumTiers = false,
}: {
  value: StudioTier;
  onChange: (t: StudioTier) => void;
  locked?: Partial<Record<StudioTier, boolean>>;
  className?: string;
  showPremiumTiers?: boolean;
}) {
  const tiers = showPremiumTiers
    ? STUDIO_TIERS
    : (["standard"] as const satisfies readonly StudioTier[]);

  return (
    <div className={cn("w-full min-w-0", className)}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Experience
      </p>
      <div className={cn(
        "grid gap-1.5 sm:gap-2.5",
        tiers.length === 1 ? "grid-cols-1 max-w-[200px]" : "grid-cols-3",
      )}>
        {tiers.map((id) => {
          const meta = STUDIO_TIER_META[id];
          const detail = TIER_DETAIL[id];
          const Icon = detail.Icon;
          const isLocked = !!locked?.[id];
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              disabled={isLocked}
              onClick={() => {
                if (!isLocked) onChange(id);
              }}
              className={cn(
                "relative flex min-h-[108px] min-w-0 flex-col items-start gap-1 rounded-xl border px-2 py-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[112px] sm:px-3 sm:py-3",
                active &&
                  id === "standard" &&
                  "border-primary bg-primary/15 ring-1 ring-primary/40",
                active &&
                  id === "pro" &&
                  "border-orange-500 bg-orange-500/15 ring-1 ring-orange-500/40",
                active &&
                  id === "premium" &&
                  "border-[#D4AF37] bg-[#121C30] ring-1 ring-[#D4AF37]/60 text-[#F8F1D8] shadow-[0_0_22px_-8px_rgba(212,175,55,0.55)]",
                !active &&
                  "border-border/80 bg-card/70 text-foreground hover:border-primary/40 hover:bg-card",
                isLocked && "cursor-not-allowed opacity-50",
              )}
              aria-pressed={active}
              aria-label={`${meta.label} experience`}
            >
              {isLocked && (
                <Lock className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              )}
              <div className="flex items-center gap-1.5">
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    active && id === "standard" && "text-primary",
                    active && id === "pro" && "text-orange-500",
                    active && id === "premium" && "text-[#E8C547]",
                    !active && "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-bold leading-tight sm:text-sm",
                    active && id === "premium" && "text-[#E8C547]",
                  )}
                >
                  {meta.label}
                </span>
              </div>
              <p
                className={cn(
                  "text-[10px] leading-snug sm:text-[11px]",
                  active && id === "premium" ? "text-[#E2E8F0]" : "text-muted-foreground",
                )}
              >
                {detail.capability}
              </p>
              <p
                className={cn(
                  "mt-auto text-[10px] leading-snug opacity-90 sm:text-[11px]",
                  active && id === "premium" && "text-[#E8C547]",
                )}
              >
                {meta.short}
              </p>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground sm:text-[11px]">
        {showPremiumTiers ? "Standard → Premium → Ultra AI" : "Standard"}
      </p>
    </div>
  );
}
