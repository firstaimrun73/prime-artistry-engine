import { cn } from "@/lib/utils";
import {
  STUDIO_TIER_META,
  STUDIO_TIERS,
  type StudioTier,
} from "@/lib/studio/studio-tier";
import { Lock } from "lucide-react";

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
      <div className="grid grid-cols-3 gap-2">
        {STUDIO_TIERS.map((id) => {
          const meta = STUDIO_TIER_META[id];
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
                "relative flex min-w-0 flex-col items-start rounded-xl border px-2.5 py-2.5 text-left transition-all duration-200 sm:px-3",
                active && id === "standard" && "border-primary bg-primary/10 ring-1 ring-primary/30",
                active &&
                  id === "pro" &&
                  "border-orange-500/60 bg-orange-500/10 ring-1 ring-orange-500/40 shadow-[0_0_20px_-6px_rgba(249,115,22,0.45)]",
                active &&
                  id === "premium" &&
                  "border-[#D4AF37]/45 bg-[#0B1220] ring-1 ring-[#D4AF37]/35 text-slate-100 shadow-[0_0_20px_-8px_rgba(212,175,55,0.35),0_0_12px_-6px_rgba(34,211,238,0.2)]",
                !active && "border-border/80 bg-card/80 backdrop-blur-sm hover:border-primary/40",
                isLocked && "cursor-not-allowed opacity-50",
              )}
              aria-pressed={active}
            >
              {isLocked && (
                <Lock className="absolute right-2 top-2 h-3 w-3 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-xs font-bold sm:text-sm",
                  active && id === "premium" && "text-[#E8C547]",
                )}
              >
                {meta.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 line-clamp-2 text-[10px] sm:text-[11px]",
                  active && id === "premium" ? "text-slate-300" : "text-muted-foreground",
                )}
              >
                {meta.blurb}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
