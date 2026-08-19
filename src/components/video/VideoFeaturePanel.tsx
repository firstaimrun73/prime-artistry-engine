import { cn } from "@/lib/utils";
import {
  VIDEO_STUDIO_ASPECTS,
  VIDEO_STUDIO_DURATIONS,
  VIDEO_STUDIO_QUALITIES,
  VIDEO_STUDIO_SIZES,
  type VideoStudioAspect,
  type VideoStudioDuration,
  type VideoStudioQuality,
  type VideoStudioSize,
} from "./video-studio-types";

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              value === o.id
                ? "border-red-500 bg-red-500 text-white"
                : "border-border bg-background text-muted-foreground hover:border-red-400/50",
              disabled && "opacity-40",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function VideoFeaturePanel({
  aspect,
  setAspect,
  quality,
  setQuality,
  size,
  setSize,
  duration,
  setDuration,
  showDuration,
  disabled,
  maxDuration,
}: {
  aspect: VideoStudioAspect;
  setAspect: (v: VideoStudioAspect) => void;
  quality: VideoStudioQuality;
  setQuality: (v: VideoStudioQuality) => void;
  size: VideoStudioSize;
  setSize: (v: VideoStudioSize) => void;
  duration: VideoStudioDuration;
  setDuration: (v: VideoStudioDuration) => void;
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
  showDuration: boolean;
  disabled?: boolean;
  maxDuration: number;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Features</p>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Sound</p>
          <p className="text-[11px] text-muted-foreground">
            Native audio not available on the base video model yet.
          </p>
        </div>
        <button
          type="button"
          disabled
          aria-pressed={false}
          className="relative h-7 w-12 rounded-full bg-muted opacity-60"
          title="Base model does not support native synchronized audio"
        >
          <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-background shadow" />
        </button>
      </div>

      <ChipGroup label="Aspect ratio" options={VIDEO_STUDIO_ASPECTS} value={aspect} onChange={setAspect} disabled={disabled} />

      <ChipGroup
        label="Size"
        options={VIDEO_STUDIO_SIZES.map((s) => ({ id: s.id, label: s.label }))}
        value={size}
        onChange={(v) => {
          setSize(v);
          const map = VIDEO_STUDIO_SIZES.find((s) => s.id === v);
          if (map) setQuality(map.quality);
        }}
        disabled={disabled}
      />

      <ChipGroup label="Quality" options={VIDEO_STUDIO_QUALITIES} value={quality} onChange={setQuality} disabled={disabled} />

      {showDuration && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
          <div className="flex flex-wrap gap-2">
            {VIDEO_STUDIO_DURATIONS.map((d) => {
              const ok = d <= maxDuration;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={!ok || disabled}
                  onClick={() => setDuration(d)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold",
                    duration === d
                      ? "border-red-500 bg-red-500 text-white"
                      : "border-border bg-background text-muted-foreground hover:border-red-400/50",
                    (!ok || disabled) && "cursor-not-allowed opacity-40",
                  )}
                >
                  {d}s
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Plan max: {maxDuration}s · Base model path</p>
        </div>
      )}
    </div>
  );
}
