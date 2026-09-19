import type { ReactNode } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoResolution, VideoAspect } from "@/lib/video-model-registry";

/** @deprecated kept for type imports elsewhere */
export type VideoSizeOption = "small" | "medium" | "large";

const GLASS =
  "rounded-[20px] border border-border/40 bg-background/55 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-[16px] dark:border-white/15 dark:bg-white/10 dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]";

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { id: T; label: string; node?: ReactNode; disabled?: boolean; reason?: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  if (!options?.length) return null;
  const disabledReason = options.find((o) => o.id === value && o.disabled)?.reason
    ?? options.find((o) => o.disabled)?.reason;
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const isOff = Boolean(disabled || o.disabled);
          return (
            <button
              key={o.id}
              type="button"
              disabled={isOff}
              title={o.disabled ? o.reason : undefined}
              onClick={() => onChange(o.id)}
              className={cn(
                "inline-flex min-h-[44px] min-w-[64px] items-center justify-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-all",
                value === o.id
                  ? "border-red-500 bg-red-500/15 text-red-700 shadow-[0_0_12px_rgba(239,68,68,0.35)] dark:text-red-200"
                  : "border-border/50 bg-background/40 text-muted-foreground hover:border-red-400/40 dark:border-white/15 dark:bg-white/5",
                isOff && "pointer-events-none opacity-40",
              )}
            >
              {o.node}
              {o.label}
            </button>
          );
        })}
      </div>
      {disabledReason && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{disabledReason}</p>
      )}
    </div>
  );
}

function AspectShape({ ratio, active }: { ratio: string; active: boolean }) {
  const map: Record<string, { w: number; h: number }> = {
    "16:9": { w: 22, h: 12 },
    "9:16": { w: 10, h: 18 },
    "1:1": { w: 14, h: 14 },
  };
  const s = map[ratio] ?? { w: 16, h: 12 };
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-[2px] border",
        active ? "border-current/80 bg-current/20" : "border-current/40 bg-current/10",
      )}
      style={{ width: s.w, height: s.h }}
      aria-hidden
    />
  );
}

export function VideoFeaturePanel({
  aspects,
  resolutions,
  durations,
  aspect,
  setAspect,
  resolution,
  setResolution,
  duration,
  setDuration,
  soundOn,
  setSoundOn,
  soundAvailable = true,
  disabled,
  disabledDurations,
  disabledResolutions,
  capabilityNote,
}: {
  aspects: VideoAspect[];
  resolutions: VideoResolution[];
  durations?: number[];
  aspect: VideoAspect;
  setAspect: (v: VideoAspect) => void;
  resolution: VideoResolution;
  setResolution: (v: VideoResolution) => void;
  duration: number;
  setDuration: (v: number) => void;
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
  soundAvailable?: boolean;
  disabled?: boolean;
  /** Duration values that capability system cannot support for current mode/quality */
  disabledDurations?: Partial<Record<number, string>>;
  disabledResolutions?: Partial<Record<string, string>>;
  capabilityNote?: string;
}) {
  const aspectList = aspects?.length ? aspects : (["16:9", "9:16", "1:1"] as VideoAspect[]);
  const resList: VideoResolution[] =
    resolutions?.length >= 1 ? resolutions : (["480p", "720p", "1080p"] as VideoResolution[]);
  const safeAspect = (aspectList.includes(aspect) ? aspect : aspectList[0]) as VideoAspect;
  const safeRes = (resList.includes(resolution) ? resolution : resList[0]) as VideoResolution;
  const durationOpts = durations?.length ? durations : [5, 10, 15];

  return (
    <div className={cn(GLASS, "space-y-4 p-4")}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Features</p>

      {soundAvailable && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {soundOn ? (
              <Volume2 className="h-4 w-4 text-red-500" aria-hidden />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" aria-hidden />
            )}
            <div>
              <p className="text-sm font-medium">Sound</p>
              <p className="text-[11px] text-muted-foreground">
                {soundOn ? "On when supported" : "Silent (default)"}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={soundOn}
            aria-label={soundOn ? "Sound on" : "Sound off"}
            disabled={disabled}
            onClick={() => setSoundOn(!soundOn)}
            className={cn(
              "relative h-7 w-[48px] shrink-0 rounded-full border transition-all duration-300",
              soundOn
                ? "border-red-400/50 bg-red-500/90 shadow-[0_0_14px_rgba(239,68,68,0.45)]"
                : "border-border/50 bg-background/60 dark:border-white/20 dark:bg-white/10",
              disabled && "opacity-50",
            )}
          >
            <span
              className={cn(
                "pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-out dark:bg-zinc-100",
                soundOn ? "left-[22px]" : "left-0.5",
              )}
            />
          </button>
        </div>
      )}

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Aspect ratio
        </p>
        <div className="flex flex-wrap gap-2">
          {aspectList.map((a) => {
            const active = safeAspect === a;
            return (
              <button
                key={a}
                type="button"
                disabled={disabled}
                onClick={() => setAspect(a)}
                className={cn(
                  "inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all",
                  active
                    ? "border-red-500 bg-red-500/15 text-red-700 shadow-[0_0_12px_rgba(239,68,68,0.3)] dark:text-red-200"
                    : "border-border/50 bg-background/40 text-muted-foreground dark:border-white/15 dark:bg-white/5",
                  disabled && "opacity-40",
                )}
              >
                <AspectShape ratio={a} active={active} />
                {a}
              </button>
            );
          })}
        </div>
      </div>

      <ChipGroup
        label="Quality"
        options={resList.map((r) => ({
          id: r,
          label: r === "480p" ? "SD" : r,
          disabled: Boolean(disabledResolutions?.[r]),
          reason: disabledResolutions?.[r],
        }))}
        value={safeRes}
        onChange={setResolution}
        disabled={disabled}
      />

      <ChipGroup
        label="Duration"
        options={durationOpts.map((d) => ({
          id: String(d) as `${number}`,
          label: `${d}s`,
          disabled: Boolean(disabledDurations?.[d]),
          reason: disabledDurations?.[d],
        }))}
        value={String(duration) as `${number}`}
        onChange={(v) => {
          const n = parseInt(v, 10);
          if (!Number.isNaN(n)) setDuration(n);
        }}
        disabled={disabled}
      />

      {capabilityNote && (
        <p className="text-[11px] text-muted-foreground">{capabilityNote}</p>
      )}
    </div>
  );
}
