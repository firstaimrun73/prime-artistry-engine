import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { VideoResolution, VideoAspect, VideoTier } from "@/lib/video-model-registry";
import {
  VIDEO_STYLE_MODIFIERS,
  PRODUCT_VIDEO_DURATIONS,
  is4kDurationLocked,
  MAX_4K_DURATION_SEC,
  resolutionUiLabel,
} from "@/lib/video-model-registry";

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { id: T; label: string; node?: ReactNode; locked?: boolean }[];
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
            disabled={disabled || o.locked}
            onClick={() => {
              if (!o.locked) onChange(o.id);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              value === o.id
                ? "border-red-500 bg-red-500 text-white"
                : "border-border bg-background text-muted-foreground hover:border-red-400/50",
              (disabled || o.locked) && "opacity-40",
            )}
          >
            {o.node}
            {o.label}
            {o.locked ? " 🔒" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function AspectShape({ ratio, active }: { ratio: VideoAspect; active: boolean }) {
  const map: Record<VideoAspect, { w: number; h: number }> = {
    "16:9": { w: 22, h: 12 },
    "9:16": { w: 10, h: 18 },
    "1:1": { w: 14, h: 14 },
    "4:3": { w: 18, h: 14 },
    "3:4": { w: 12, h: 16 },
    "21:9": { w: 24, h: 10 },
  };
  const s = map[ratio] ?? { w: 16, h: 12 };
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-[2px] border",
        active ? "border-white/80 bg-white/25" : "border-current/40 bg-current/10",
      )}
      style={{ width: s.w, height: s.h }}
      aria-hidden
    />
  );
}

const ASPECT_LABELS: Partial<Record<VideoAspect, string>> = {
  "16:9": "16:9",
  "9:16": "9:16",
  "1:1": "1:1",
  "4:3": "4:3",
  "3:4": "3:4",
  "21:9": "21:9",
};

export function VideoFeaturePanel({
  tier,
  setTier,
  premiumLocked,
  onPremiumLockedClick,
  aspects,
  resolutions,
  aspect,
  setAspect,
  resolution,
  setResolution,
  duration,
  setDuration,
  soundOn,
  setSoundOn,
  styleId,
  setStyleId,
  disabled,
}: {
  tier: VideoTier;
  setTier: (t: VideoTier) => void;
  premiumLocked?: boolean;
  onPremiumLockedClick?: () => void;
  aspects: VideoAspect[];
  resolutions: VideoResolution[];
  aspect: VideoAspect;
  setAspect: (v: VideoAspect) => void;
  resolution: VideoResolution;
  setResolution: (v: VideoResolution) => void;
  duration: number;
  setDuration: (v: number) => void;
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
  styleId: string;
  setStyleId: (v: string) => void;
  disabled?: boolean;
}) {
  const safeAspect = (aspects.includes(aspect) ? aspect : aspects[0] ?? "16:9") as VideoAspect;
  const safeRes = (resolutions.includes(resolution) ? resolution : resolutions[0] ?? "720p") as VideoResolution;

  const durationOpts = PRODUCT_VIDEO_DURATIONS.map((d) => ({
    id: String(d) as `${number}`,
    label: `${d}s`,
    locked: is4kDurationLocked(d, safeRes),
  }));

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
            <p className="text-sm font-bold">Premium{premiumLocked ? " 🔒" : ""}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Higher quality, longer clips, audio, and advanced capabilities.
            </p>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Sound</p>
          <p className="text-[11px] text-muted-foreground">
            {soundOn ? "Synchronized audio when supported" : "Silent video"}
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

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Aspect ratio</p>
        <div className="flex flex-wrap gap-2">
          {aspects.map((a) => {
            const active = safeAspect === a;
            return (
              <button
                key={a}
                type="button"
                disabled={disabled}
                onClick={() => setAspect(a)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                  active
                    ? "border-red-500 bg-red-500 text-white"
                    : "border-border bg-background text-muted-foreground hover:border-red-400/50",
                  disabled && "opacity-40",
                )}
              >
                <AspectShape ratio={a} active={active} />
                {ASPECT_LABELS[a] ?? a}
              </button>
            );
          })}
        </div>
      </div>

      <ChipGroup
        label="Quality"
        options={resolutions.map((r) => ({
          id: r,
          label: resolutionUiLabel(r),
          locked: r === "4k" && tier !== "premium",
        }))}
        value={safeRes}
        onChange={(v) => {
          if (v === "4k" && tier !== "premium") return;
          setResolution(v);
          if (is4kDurationLocked(duration, v)) setDuration(MAX_4K_DURATION_SEC);
        }}
        disabled={disabled}
      />

      <ChipGroup
        label="Duration"
        options={durationOpts}
        value={String(duration) as `${number}`}
        onChange={(v) => {
          const d = parseInt(v, 10);
          if (is4kDurationLocked(d, safeRes)) return;
          setDuration(d);
        }}
        disabled={disabled}
      />

      {safeRes === "4k" && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          4K is limited to {MAX_4K_DURATION_SEC}s maximum (Premium).
        </p>
      )}

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Style</p>
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
    </div>
  );
}
