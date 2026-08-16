import {
  IMAGE_QUALITY_OPTIONS,
  type ImageQuality,
} from "@/lib/quality-options";
import { cn } from "@/lib/utils";

type Props = {
  value: ImageQuality;
  onChange: (q: ImageQuality) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * First-class image quality control.
 * Selected value must be passed to generateMedia as `imageQuality`
 * (existing pipeline applies Topaz upscale factor + credit cost).
 */
export function OutputQualitySelector({ value, onChange, disabled, className }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Quality
      </p>
      <div className="flex flex-wrap gap-2">
        {IMAGE_QUALITY_OPTIONS.map((q) => {
          const active = value === q.id;
          return (
            <button
              key={q.id}
              type="button"
              disabled={disabled}
              title={q.hint}
              onClick={() => onChange(q.id)}
              className={cn(
                "min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground",
                disabled && "opacity-50",
              )}
            >
              {q.label} · {q.credits}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {IMAGE_QUALITY_OPTIONS.find((q) => q.id === value)?.hint}
      </p>
    </div>
  );
}
