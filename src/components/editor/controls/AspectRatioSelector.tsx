import { ASPECT_RATIOS, type AspectRatio } from "@/lib/prompt-suggestions";
import { cn } from "@/lib/utils";

type Props = {
  value: AspectRatio;
  onChange: (a: AspectRatio) => void;
  disabled?: boolean;
  /** When true, control is hidden (e.g. image-to-image keeps source framing). */
  textToImageOnly?: boolean;
  hasSourceImage?: boolean;
  className?: string;
};

/**
 * Aspect ratio for text-to-image.
 * Mapped by aspectToImageSize() in generate.functions → FAL image_size.
 */
export function AspectRatioSelector({
  value,
  onChange,
  disabled,
  textToImageOnly = true,
  hasSourceImage,
  className,
}: Props) {
  if (textToImageOnly && hasSourceImage) {
    return (
      <div className={cn("space-y-1", className)}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Aspect ratio
        </p>
        <p className="text-[11px] text-muted-foreground">
          Uses your uploaded image framing. Aspect applies to text-to-image only.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Output size / aspect
      </p>
      <div className="flex flex-wrap gap-2">
        {ASPECT_RATIOS.map((a) => {
          const active = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(a.id)}
              className={cn(
                "min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground",
                disabled && "opacity-50",
              )}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
