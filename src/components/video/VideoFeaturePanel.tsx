import { cn } from "@/lib/utils";
import type { VideoResolution, VideoAspect, VideoTier } from "@/lib/video-model-registry";
import {
  VIDEO_STYLE_MODIFIERS,
  USER_MAX_DURATION_SEC,
  SCRIPT_MAX_DURATION_SEC,
} from "@/lib/video-model-registry";

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

const ASPECT_LABELS: Partial<Record<VideoAspect, string>> = {
  "9:16": "9:16 · TikTok / Reels",
  "16:9": "16:9 · Landscape",
  "1:1": "1:1 · Square",
  "21:9": "21:9 · Ultrawide",
};

const PRESET_DURATIONS = [5, 8, 10] as const;

export function VideoFeaturePanel({
  tier,
  setTier,
  premiumLocked,
  onPremiumLockedClick,
  aspects,
  resolutions,
  availableMaxDuration,
  nativeAudioAvailable,
  supportsNegativePrompt,
  aspect,
  setAspect,
  resolution,
  setResolution,
  duration,
  setDuration,
  customMode,
  setCustomMode,
  customInput,
  setCustomInput,
  soundOn,
  setSoundOn,
  styleId,
  setStyleId,
  negativePrompt,
  setNegativePrompt,
  disabled,
}: {
  tier: VideoTier;
  setTier: (t: VideoTier) => void;
  premiumLocked?: boolean;
  onPremiumLockedClick?: () => void;
  aspects: VideoAspect[];
  resolutions: VideoResolution[];
  availableMaxDuration: number;
  nativeAudioAvailable: boolean;
  supportsNegativePrompt: boolean;
  aspect: VideoAspect;
  setAspect: (v: VideoAspect) => void;
  resolution: VideoResolution;
  setResolution: (v: VideoResolution) => void;
  duration: number;
  setDuration: (v: number) => void;
  customMode: boolean;
  setCustomMode: (v: boolean) => void;
  customInput: string;
  setCustomInput: (v: string) => void;
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
  styleId: string;
  setStyleId: (v: string) => void;
  negativePrompt: string;
  setNegativePrompt: (v: string) => void;
  disabled?: boolean;
}) {
  const safeAspect = (aspects.includes(aspect) ? aspect : aspects[0] ?? "16:9") as VideoAspect;
  const safeRes = (resolutions.includes(resolution) ? resolution : resolutions[0] ?? "720p") as VideoResolution;
  const customCap = SCRIPT_MAX_DURATION_SEC;

  const customNum = customInput.trim() === "" ? null : parseInt(customInput, 10);
  const customInvalid =
    customMode &&
    customInput.trim() !== "" &&
    (customNum === null || Number.isNaN(customNum) || customNum < 1 || customNum > customCap);

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Features</p>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Generation</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setTier("standard")}
            className={cn(
              "rounded-2xl border p-3 text-left transition-colors",
              tier === "standard"
                ? "border-red-500 bg-red-500/10 ring-1 ring-red-500/30"
                : "border-border/70 bg-background hover:border-red-400/40",
            )}
          >
            <p className="text-sm font-bold">Standard</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Fast generation for everyday videos.</p>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (premiumLocked) onPremiumLockedClick?.();
              else setTier("premium");
            }}
            className={cn(
              "rounded-2xl border p-3 text-left transition-colors",
              tier === "premium"
                ? "border-red-500 bg-red-500/10 ring-1 ring-red-500/30"
                : "border-border/70 bg-background hover:border-red-400/40",
            )}
          >
            <p className="text-sm font-bold">
              Premium{premiumLocked ? " 🔒" : ""}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Higher quality, longer videos, audio, and advanced capabilities.
            </p>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Sound</p>
          <p className="text-[11px] text-muted-foreground">
            {soundOn ? "Synchronized audio when available" : "Silent video"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={soundOn}
          aria-label={soundOn ? "Sound on" : "Sound off"}
          disabled={disabled}
          onClick={() => setSoundOn(!soundOn)}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ease-out motion-reduce:transition-none",
            soundOn ? "bg-red-500" : "bg-muted",
            disabled && "opacity-50",
          )}
        >
          <span
            className={cn(
              "pointer-events-none absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ease-out motion-reduce:transition-none",
              soundOn && "translate-x-5",
            )}
          />
        </button>
      </div>

      <ChipGroup
        label="Aspect ratio"
        options={aspects.map((a) => ({ id: a, label: ASPECT_LABELS[a] ?? a }))}
        value={safeAspect}
        onChange={setAspect}
        disabled={disabled}
      />

      <ChipGroup
        label="Resolution"
        options={resolutions.map((r) => ({
          id: r,
          label: r === "4k" ? "4K" : r === "2k" ? "2K" : r,
        }))}
        value={safeRes}
        onChange={setResolution}
        disabled={disabled}
      />

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => {
                setCustomMode(false);
                setCustomInput("");
                setDuration(d);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                !customMode && duration === d
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
            onClick={() => {
              setCustomMode(true);
              if (customInput === "") setCustomInput(String(Math.min(duration, customCap) || 20));
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              customMode
                ? "border-red-500 bg-red-500 text-white"
                : "border-border bg-background text-muted-foreground",
            )}
          >
            Custom
          </button>
        </div>
        {customMode && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={customCap}
              value={customInput}
              disabled={disabled}
              placeholder="1–40"
              onChange={(e) => {
                const v = e.target.value;
                setCustomInput(v);
                if (v.trim() === "") return;
                const n = parseInt(v, 10);
                if (!Number.isNaN(n) && n >= 1 && n <= customCap) {
                  setDuration(n);
                }
              }}
              className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            />
            {customInput.trim() === "" && (
              <span className="text-xs text-muted-foreground">Enter duration</span>
            )}
            {customInvalid && (
              <span className="text-xs font-medium text-red-600">Max {customCap}s</span>
            )}
          </div>
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
      </div>

      {supportsNegativePrompt && (
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
