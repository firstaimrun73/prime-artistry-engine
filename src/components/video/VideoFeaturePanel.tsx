import { cn } from "@/lib/utils";
import type { VideoModelDef, VideoResolution, VideoAspect } from "@/lib/video-model-registry";
import { VIDEO_STYLE_MODIFIERS } from "@/lib/video-model-registry";

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
  if (options.length === 0) return null;
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
  model,
  aspect,
  setAspect,
  resolution,
  setResolution,
  duration,
  setDuration,
  customDuration,
  setCustomDuration,
  soundOn,
  setSoundOn,
  styleId,
  setStyleId,
  negativePrompt,
  setNegativePrompt,
  disabled,
}: {
  model: VideoModelDef;
  aspect: VideoAspect;
  setAspect: (v: VideoAspect) => void;
  resolution: VideoResolution;
  setResolution: (v: VideoResolution) => void;
  duration: number;
  setDuration: (v: number) => void;
  customDuration: string;
  setCustomDuration: (v: string) => void;
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
  styleId: string;
  setStyleId: (v: string) => void;
  negativePrompt: string;
  setNegativePrompt: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Features</p>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Sound</p>
          <p className="text-[11px] text-muted-foreground">
            {model.nativeAudio
              ? "Native synchronized audio (dialogue, ambience, SFX where supported)"
              : "Sound unavailable for this model"}
          </p>
        </div>
        {model.nativeAudio ? (
          <button
            type="button"
            disabled={disabled}
            aria-pressed={soundOn}
            onClick={() => setSoundOn(!soundOn)}
            className={cn(
              "relative h-7 w-12 rounded-full transition-colors",
              soundOn ? "bg-red-500" : "bg-muted",
              disabled && "opacity-50",
            )}
          >
            <span
              className={cn(
                "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
                soundOn ? "left-6" : "left-1",
              )}
            />
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">Off</span>
        )}
      </div>

      <ChipGroup
        label="Aspect ratio"
        options={model.aspects.map((a) => ({ id: a, label: a }))}
        value={(model.aspects.includes(aspect) ? aspect : model.aspects[0]) as VideoAspect}
        onChange={setAspect}
        disabled={disabled}
      />

      <ChipGroup
        label="Resolution"
        options={model.resolutions.map((r) => ({
          id: r,
          label: r === "4k" ? "4K" : r,
        }))}
        value={(model.resolutions.includes(resolution) ? resolution : model.resolutions[0]) as VideoResolution}
        onChange={setResolution}
        disabled={disabled}
      />

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
        <div className="flex flex-wrap gap-2">
          {model.durations.map((d) => (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => {
                setDuration(d);
                setCustomDuration("");
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                duration === d && !customDuration
                  ? "border-red-500 bg-red-500 text-white"
                  : "border-border bg-background text-muted-foreground",
                disabled && "opacity-40",
              )}
            >
              {d}s
            </button>
          ))}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCustomDuration(String(duration))}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              customDuration
                ? "border-red-500 bg-red-500 text-white"
                : "border-border bg-background text-muted-foreground",
            )}
          >
            Custom
          </button>
        </div>
        {customDuration !== "" && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={model.maxDuration}
              value={customDuration}
              disabled={disabled}
              onChange={(e) => {
                setCustomDuration(e.target.value);
                const n = parseInt(e.target.value, 10);
                if (!Number.isNaN(n) && n >= 1 && n <= model.maxDuration) setDuration(n);
              }}
              className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-muted-foreground">max {model.maxDuration}s for this model</span>
          </div>
        )}
        {duration > model.maxDuration && (
          <p className="mt-1 text-xs font-medium text-red-600">
            Duration exceeds this model's limit ({model.maxDuration}s). Generation blocked.
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Style / Filter</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setStyleId("")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              !styleId ? "border-red-500 bg-red-500 text-white" : "border-border bg-background text-muted-foreground",
            )}
          >
            None
          </button>
          {Object.keys(VIDEO_STYLE_MODIFIERS).map((id) => (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => setStyleId(id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold capitalize",
                styleId === id
                  ? "border-red-500 bg-red-500 text-white"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {id}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Styles are prompt modifiers, not separate model APIs.</p>
      </div>

      {model.supportsNegativePrompt && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Negative prompt</p>
          <input
            type="text"
            value={negativePrompt}
            disabled={disabled}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="blur, low quality, watermark…"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
}
