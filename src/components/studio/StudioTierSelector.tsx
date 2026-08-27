import { cn } from "@/lib/utils";
import {
  STUDIO_TIER_META,
  STUDIO_TIERS,
  type StudioTier,
} from "@/lib/studio/studio-tier";
import { Sparkles, Circle, Crown } from "lucide-react";

const TIER_DETAIL: Record<
  StudioTier,
  { capability: string; Icon: typeof Circle }
> = {
  standard: {
    capability: "Fast · Clear · Reliable",
    Icon: Circle,
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
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Experience
      </p>
      <div
        className={cn(
          "grid min-w-0 gap-2 sm:gap-2.5",
          tiers.length === 1
            ? "mx-auto grid-cols-1 max-w-[300px] sm:max-w-[280px]"
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
                "relative flex min-h-[88px] min-w-0 flex-col items-start gap-0.5 overflow-hidden rounded-xl border px-2.5 py-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[104px] sm:gap-1 sm:px-3 sm:py-3 md:min-h-[112px]",
                active &&
                  id === "standard" &&
                  "border-primary bg-primary/15 ring-2 ring-primary/35 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]",
                active &&
                  id === "pro" &&
                  "border-orange-500 bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-orange-600/15 ring-1 ring-orange-500/45 shadow-[0_0_20px_-8px_rgba(249,115,22,0.45)]",
                active &&
                  id === "premium" &&
                  "border-[#D4AF37] bg-[#121C30] ring-1 ring-[#D4AF37]/60 text-[#F8F1D8] shadow-[0_0_22px_-8px_rgba(212,175,55,0.55)]",
                !active &&
                  "border-border/80 bg-card/70 text-foreground hover:border-primary/40 hover:bg-card",
              )}
              aria-pressed={active}
              aria-label={`${meta.label} experience`}
            >
              {id === "standard" && (
                <span
                  className={cn(
                    "pointer-events-none absolute right-2 top-2 h-7 w-7 rounded-full border-2",
                    active
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/60 bg-muted/40",
                  )}
                  aria-hidden
                >
                  <span
                    className={cn(
                      "absolute inset-1.5 rounded-full",
                      active ? "bg-primary/40" : "bg-muted-foreground/20",
                    )}
                  />
                </span>
              )}
              {id === "pro" && active && (
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-80"
                  aria-hidden
                />
              )}
              {id === "premium" && (
                <span
                  className={cn(
                    "pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-[#D4AF37]/10 blur-xl",
                    active && "bg-[#D4AF37]/20",
                  )}
                  aria-hidden
                />
              )}

              <div className="relative flex items-center gap-1.5">
                {id === "pro" ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      active
                        ? "bg-orange-500/20 text-orange-600 dark:text-orange-400"
                        : "text-muted-foreground",
                    )}
                  >
                    <Crown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>Premium</span>
                  </span>
                ) : (
                  <>
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        active && id === "standard" && "text-primary",
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
                  </>
                )}
              </div>
              <p
                className={cn(
                  "relative line-clamp-1 text-[9px] leading-snug sm:text-[10px] md:text-[11px]",
                  active && id === "premium" ? "text-[#E2E8F0]" : "text-muted-foreground",
                )}
              >
                {detail.capability}
              </p>
              <p
                className={cn(
                  "relative mt-auto line-clamp-2 text-[9px] leading-snug opacity-90 sm:text-[10px] md:text-[11px]",
                  active && id === "premium" && "text-[#E8C547]/90",
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
