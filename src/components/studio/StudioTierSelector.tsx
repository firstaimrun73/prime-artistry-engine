import { cn } from "@/lib/utils";
import {
  STUDIO_TIER_META,
  STUDIO_TIERS,
  type StudioTier,
} from "@/lib/studio/studio-tier";
import { Sparkles, Zap, Circle } from "lucide-react";

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
  className,
  /** Explicit list of experiences to show. Preferred over showPremiumTiers. */
  visibleTiers,
  /** @deprecated Prefer visibleTiers from plan access matrix. */
  showPremiumTiers = false,
}: {
  value: StudioTier;
  onChange: (t: StudioTier) => void;
  className?: string;
  /** Allowed experiences for this plan/admin — inaccessible tiers are hidden, not locked. */
  visibleTiers?: readonly StudioTier[];
  /** When true and visibleTiers omitted, show all three experiences (legacy admin path). */
  showPremiumTiers?: boolean;
}) {
  const tiers: readonly StudioTier[] =
    visibleTiers && visibleTiers.length > 0
      ? visibleTiers
      : showPremiumTiers
        ? STUDIO_TIERS
        : (["standard"] as const);

  return (
    <div className={cn("w-full min-w-0", className)}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Experience
      </p>
      <div
        className={cn(
          "grid gap-1.5 sm:gap-2.5",
          tiers.length === 1
            ? "grid-cols-1 max-w-[200px]"
            : tiers.length === 2
              ? "grid-cols-2"
              : "grid-cols-3",
        )}
      >
        {tiers.map((id) => {
          const meta = STUDIO_TIER_META[id];
          const detail = TIER_DETAIL[id];
          const Icon = detail.Icon;
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                "relative flex min-h-[72px] min-w-0 flex-col items-start gap-0.5 rounded-xl border px-1.5 py-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[96px] sm:gap-1 sm:px-2.5 sm:py-2.5 md:min-h-[108px] md:px-3 md:py-3",
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
              )}
              aria-pressed={active}
              aria-label={`${meta.label} experience`}
            >
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
                    "text-[11px] font-bold leading-tight sm:text-xs md:text-sm",
                    active && id === "premium" && "text-[#E8C547]",
                  )}
                >
                  {meta.label}
                </span>
              </div>
              <p
                className={cn(
                  "line-clamp-1 text-[9px] leading-snug sm:text-[10px] md:text-[11px]",
                  active && id === "premium" ? "text-[#E2E8F0]" : "text-muted-foreground",
                )}
              >
                {detail.capability}
              </p>
              <p
                className={cn(
                  "mt-auto line-clamp-2 text-[9px] leading-snug opacity-90 sm:text-[10px] md:text-[11px]",
                  active && id === "premium" && "text-[#E8C547]",
                )}
              >
                {meta.short}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
