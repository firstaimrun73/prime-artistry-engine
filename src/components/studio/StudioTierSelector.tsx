import { cn } from "@/lib/utils";
import {
  STUDIO_TIER_META,
  STUDIO_TIERS,
  type StudioTier,
} from "@/lib/studio/studio-tier";
import { Sparkles, Zap, Crown } from "lucide-react";

/**
 * User-facing experience copy only — never model/provider names.
 */
const TIER_DETAIL: Record<
  StudioTier,
  { capability: string; Icon: typeof Zap }
> = {
  standard: {
    capability:
      "Fast, dependable everyday image creation and editing with a balanced quality/speed experience.",
    Icon: Zap,
  },
  pro: {
    capability:
      "Higher-quality image creation and editing with stronger detail and support for more advanced workflows.",
    Icon: Crown,
  },
  premium: {
    capability:
      "Highest-tier image creation and editing for users who want the strongest available visual quality and refinement.",
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
          "grid min-w-0 gap-2.5",
          tiers.length === 1
            ? "mx-auto grid-cols-1 max-w-[320px]"
            : tiers.length === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-3",
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
                "relative flex min-h-[88px] min-w-0 flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[100px] sm:px-3.5 sm:py-3",
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
                  "pointer-events-none absolute right-2.5 top-2.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2",
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

              <div className="relative flex items-center gap-1.5 pr-6">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active && id === "standard" && "text-primary",
                    active && id === "pro" && "text-orange-500",
                    active && id === "premium" && "text-[#E8C547]",
                    !active && "text-muted-foreground",
                  )}
                  aria-hidden
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
                  "relative mt-0.5 text-[11px] leading-snug sm:text-xs",
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
