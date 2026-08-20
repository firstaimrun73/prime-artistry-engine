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
  /** Tiers the user cannot select (plan gate). */
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
                "relative flex min-w-0 flex-col items-start rounded-xl border px-2.5 py-2.5 text-left transition-colors sm:px-3",
                active && id === "standard" && "border-primary bg-primary/10 ring-1 ring-primary/30",
                active && id === "pro" && "border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/30",
                active && id === "premium" && "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/40",
                !active && "border-border/80 bg-card/80 backdrop-blur-sm hover:border-primary/40",
                isLocked && "cursor-not-allowed opacity-50",
              )}
              aria-pressed={active}
            >
              {isLocked && (
                <Lock className="absolute right-2 top-2 h-3 w-3 text-muted-foreground" />
              )}
              <span className="text-xs font-bold sm:text-sm">{meta.label}</span>
              <span className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground sm:text-[11px]">
                {meta.blurb}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Same approved image models · Premium defaults to higher output quality.
      </p>
    </div>
  );
}
