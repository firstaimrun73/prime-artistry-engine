import {
  IMAGE_QUALITY_OPTIONS,
  imageQualityDimensionLabel,
  type ImageQuality,
} from "@/lib/quality-options";
import { cn } from "@/lib/utils";

type Props = {
  value: ImageQuality;
  onChange: (q: ImageQuality) => void;
  disabled?: boolean;
  className?: string;
  /** Aspect ratio used to show truthful pixel dimensions */
  aspectRatio?: string;
  /** Limit which qualities appear (per experience) */
  allowed?: ImageQuality[];
};

/**
 * Quality selects output resolution / upscale — NOT an extra credit charge.
 * Labels use actual pipeline long-side targets (see quality-options.ts).
 */
export function OutputQualitySelector({
  value,
  onChange,
  disabled,
  className,
  aspectRatio = "1:1",
  allowed,
}: Props) {
  const options = allowed?.length
    ? IMAGE_QUALITY_OPTIONS.filter((q) => allowed.includes(q.id))
    : IMAGE_QUALITY_OPTIONS;

  const active = options.find((q) => q.id === value) ?? options[0];
  const dimLabel = active ? imageQualityDimensionLabel(active.id, aspectRatio) : "";

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Quality
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((q) => {
          const isActive = value === q.id;
          return (
            <button
              key={q.id}
              type="button"
              disabled={disabled}
              title={`${q.title} · ${imageQualityDimensionLabel(q.id, aspectRatio)}`}
              onClick={() => onChange(q.id)}
              className={cn(
                "min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground",
                disabled && "opacity-50",
              )}
            >
              {q.label}
            </button>
          );
        })}
      </div>
      {active && (
        <p className="text-[11px] text-muted-foreground">
          {active.title}
          {dimLabel ? ` · ${dimLabel}` : ""}
        </p>
      )}
    </div>
  );
}
