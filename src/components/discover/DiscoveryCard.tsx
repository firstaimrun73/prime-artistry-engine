import { cn } from "@/lib/utils";
import { inputRequirementLabel } from "@/lib/discover/catalog";
import type { DiscoverItem } from "@/lib/discover/types";
import { Sparkles } from "lucide-react";

type Props = {
  item: DiscoverItem;
  onSelect: (item: DiscoverItem) => void;
  className?: string;
  /** Wider card in horizontal carousels */
  size?: "sm" | "md";
};

export function DiscoveryCard({ item, onSelect, className, size = "md" }: Props) {
  const inputHint = inputRequirementLabel(item.inputRequirement);

  return (
    <article
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all",
        "hover:border-primary/40 hover:shadow-md active:scale-[0.99]",
        size === "sm" ? "w-[148px] sm:w-[168px]" : "w-[168px] sm:w-[200px]",
        className,
      )}
    >
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => onSelect(item)}
        aria-label={`${item.title} — ${item.badge}`}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
          <img
            src={item.previewUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            <span className="rounded-full border border-white/15 bg-background/75 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur-md">
              {item.badge}
            </span>
            {item.isStaffPick && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/30 bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100 backdrop-blur-md">
                <Sparkles className="h-2.5 w-2.5" /> Pick
              </span>
            )}
            {item.isNew && (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-100 backdrop-blur-md">
                New
              </span>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-2.5">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow">
              {item.title}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-white/75">{inputHint}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-2.5 py-2">
          <span className="truncate text-[11px] text-muted-foreground">
            {item.durationSec ? `${item.durationSec}s · ${item.aspectRatio ?? ""}` : item.styleLabel || item.category}
          </span>
          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            Try
          </span>
        </div>
      </button>
    </article>
  );
}
