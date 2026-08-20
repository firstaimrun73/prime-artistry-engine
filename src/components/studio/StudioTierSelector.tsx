import { cn } from "@/lib/utils";
import {
  STUDIO_TIER_META,
  STUDIO_TIERS,
  type StudioTier,
} from "@/lib/studio/studio-tier";
import { Lock, Sparkles, Zap, Circle } from "lucide-react";

const TIER_DETAIL: Record<
  StudioTier,
  { capability: string; Icon: typeof Circle; rank: number }
> = {
  standard: {
    capability: "Essential tools",
    Icon: Circle,
    rank: 1,
  },
  pro: {
    capability: "More tools · HD+",
    Icon: Zap,
    rank: 2,
  },
  premium: {
    capability: "Max quality path",
    Icon: Sparkles,
    rank: 3,
  },
};

export function StudioTierSelector({
  value,
  onChange,
  locked,
  className,
}: {
  value: StudioTier;
  onChange: (t: StudioTier) => void;
  locked?: Partial<Record<StudioTier, boolean>>;
  className?: string;
}) {
  return (
    <div className={cn("w-full min-w-0", className)}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Experience
      </p>
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {STUDIO_TIERS.map((id) => {
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
                "relative flex min-h-[92px] min-w-0 flex-col items-start gap-1 rounded-xl border px-2 py-2.5 text-left transition-all duration-200 sm:min-h-[100px] sm:px-3 sm:py-3",
                active &&
                  id === "standard" &&
                  "border-primary bg-primary/10 ring-1 ring-primary/30",
                active &&
                  id === "pro" &&
                  "border-orange-500/60 bg-orange-500/10 ring-1 ring-orange-500/40 shadow-[0_0_20px_-6px_rgba(249,115,22,0.45)]",
                active &&
                  id === "premium" &&
                  "border-[#D4AF37]/55 bg-[#121C30] ring-1 ring-[#D4AF37]/45 text-slate-100 shadow-[0_0_22px_-8px_rgba(212,175,55,0.4)]",
                !active &&
                  "border-border/70 bg-card/70 backdrop-blur-sm hover:border-primary/35 hover:bg-card",
                isLocked && "cursor-not-allowed opacity-50",
              )}
              aria-pressed={active}
            >
              {isLocked && (
                <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-muted-foreground" />
              )}
              <div className="flex w-full items-center gap-1.5">
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    active && id === "standard" && "text-primary",
                    active && id === "pro" && "text-orange-500",
                    active && id === "premium" && "text-[#E8C547]",
                    !active && "text-muted-foreground",
                  )}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span
                  className={cn(
                    "truncate text-xs font-bold sm:text-sm",
                    active && id === "premium" && "text-[#E8C547]",
                  )}
                >
                  {meta.label}
                </span>
              </div>
              <span
                className={cn(
                  "line-clamp-2 text-[10px] leading-snug sm:text-[11px]",
                  active && id === "premium" ? "text-slate-300" : "text-muted-foreground",
                )}
              >
                {meta.blurb}
              </span>
              <span
                className={cn(
                  "mt-auto pt-0.5 text-[9px] font-medium uppercase tracking-wide sm:text-[10px]",
                  active && id === "standard" && "text-primary/80",
                  active && id === "pro" && "text-orange-600/90 dark:text-orange-400/90",
                  active && id === "premium" && "text-[#E8C547]/80",
                  !active && "text-muted-foreground/70",
                )}
              >
                {detail.capability}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground sm:text-[11px]">
        Standard → Premium → Ultra AI
      </p>
    </div>
  );
}
