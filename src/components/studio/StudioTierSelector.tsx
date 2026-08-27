import { cn } from "@/lib/utils";
import {
  STUDIO_TIER_META,
  STUDIO_TIERS,
  type StudioTier,
} from "@/lib/studio/studio-tier";
import { Sparkles, Zap, Crown } from "lucide-react";

const TIER_DETAIL: Record<
  StudioTier,
  { capability: string; Icon: typeof Zap }
> = {
  standard: {
    capability: "Fast · Clear · Reliable",
    Icon: Zap,
  },
  pro: {
    capability: "HD+ · Multi-ref",
    Icon: Crown,
  },
  premium: {
    capability: "Flagship · Max quality",
    Icon: Sparkles,
  },
};

export function StudioTierSelector({
  value,
  onChange,
  className,
  visibleTiers,
  showPremiumTiers = false,
}: {
  value: StudioTier;
  onChange: (t: StudioTier) => void;
  className?: string;
  visibleTiers?: readonly StudioTier[];
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
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Experience
      </p>
      <div
        className={cn(
          "grid min-w-0 gap-2",
          tiers.length === 1
            ? "mx-auto grid-cols-1 max-w-[280px]"
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
                "relative flex min-h-[64px] min-w-0 flex-col items-start gap-0.5 rounded-xl border px-2 py-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[72px] sm:px-2.5 sm:py-2.5",
                active &&
                  id === "standard" &&
                  "border-primary bg-primary/15 ring-1 ring-primary/35",
                active &&
                  id === "pro" &&
                  "border-orange-500 bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-orange-600/15 ring-1 ring-orange-500/45",
                active &&
                  id === "premium" &&
                  "border-[#D4AF37] bg-[#121C30] ring-1 ring-[#D4AF37]/50 text-slate-100",
                !active &&
                  "border-border/80 bg-card/70 text-foreground hover:border-primary/40 hover:bg-card",
              )}
              aria-pressed={active}
              aria-label={`${meta.label} experience`}
            >
              <span
                className={cn(
                  "pointer-events-none absolute right-2 top-2 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2",
                  active
                    ? id === "premium"
                      ? "border-[#E8C547]"
                      : id === "pro"
                        ? "border-orange-500"
                        : "border-primary"
                    : "border-muted-foreground/40",
                )}
                aria-hidden
              >
                {active && (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      id === "premium"
                        ? "bg-[#E8C547]"
                        : id === "pro"
                          ? "bg-orange-500"
                          : "bg-primary",
                    )}
                  />
                )}
              </span>

              <div className="relative flex items-center gap-1 pr-5">
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    active && id === "standard" && "text-primary",
                    active && id === "pro" && "text-orange-500",
                    active && id === "premium" && "text-[#E8C547]",
                    !active && "text-muted-foreground",
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[11px] font-bold leading-tight sm:text-xs",
                    active && id === "premium" && "text-[#E8C547]",
                  )}
                >
                  {meta.label}
                </span>
              </div>
              <p
                className={cn(
                  "relative mt-auto line-clamp-2 text-[9px] leading-snug sm:text-[10px]",
                  active && id === "premium" ? "text-[#E2E8F0]" : "text-muted-foreground",
                )}
              >
                {detail.capability}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
