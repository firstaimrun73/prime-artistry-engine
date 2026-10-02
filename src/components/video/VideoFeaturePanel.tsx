import type { ReactNode } from "react";
import { Volume2, VolumeX, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoResolution, VideoAspect } from "@/lib/video-model-registry";

const GLASS =
  "rounded-[22px] border border-white/70 bg-white/55 shadow-[0_8px_32px_rgba(80,60,140,0.12)] backdrop-blur-xl saturate-150 ring-1 ring-black/5";

const CHIP_ON =
  "bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] text-white border-transparent shadow-[0_6px_18px_rgba(244,63,94,0.35)]";
const CHIP_OFF =
  "border border-slate-300/80 bg-white/50 text-slate-600 hover:border-[#FF7A45]/50";

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: {
    id: T;
    label: string;
    node?: ReactNode;
    disabled?: boolean;
    reason?: string;
    locked?: boolean;
  }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  if (!options?.length) return null;
  const note =
    options.find((o) => o.id === value && (o.disabled || o.locked))?.reason ??
    options.find((o) => o.disabled || o.locked)?.reason;
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const isOff = Boolean(disabled || o.disabled || o.locked);
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              disabled={isOff}
              title={o.reason}
              onClick={() => {
                if (!isOff) onChange(o.id);
              }}
              className={cn(
                "inline-flex min-h-[44px] min-w-[64px] items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-semibold",
                "transition-all duration-150 ease-out select-none active:scale-95",
                active ? CHIP_ON : CHIP_OFF,
                isOff && "pointer-events-none opacity-45",
              )}
            >
              {o.locked && <Lock className="h-3 w-3" aria-hidden />}
              {o.node}
              <span className="whitespace-nowrap">{o.label}</span>
            </button>
          );
        })}
      </div>
      {note && <p className="mt-1.5 text-[11px] text-slate-500">{note}</p>}
    </div>
  );
}

function AspectShape({ ratio, active }: { ratio: string; active: boolean }) {
  const map: Record<string, { w: number; h: number }> = {
    "16:9": { w: 22, h: 12 },
    "9:16": { w: 10, h: 16 },
    "1:1": { w: 14, h: 14 },
    "4:3": { w: 18, h: 14 },
    "3:4": { w: 12, h: 16 },
    "21:9": { w: 24, h: 10 },
  };
  const s = map[ratio] ?? { w: 16, h: 12 };
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-[2px] border transition-colors duration-150",
        active ? "border-white/80 bg-white/25" : "border-current/40 bg-current/10",
      )}
      style={{ width: s.w, height: s.h }}
      aria-hidden
    />
  );
}

/**
 * Live page uses on*Change + *Locks + audioOn.
 * Legacy uses set* + soundOn. Both supported.
 */
export function VideoFeaturePanel({
  aspects,
  resolutions,
  durations,
  aspect,
  setAspect,
  onAspectChange,
  resolution,
  setResolution,
  onResolutionChange,
  duration,
  setDuration,
  onDurationChange,
  soundOn,
  setSoundOn,
  audioOn,
  onAudioChange,
  soundAvailable = true,
  audioSupported,
  disabled,
  disabledDurations,
  disabledResolutions,
  durationLocks,
  resolutionLocks,
  capabilityNote,
}: {
  aspects: VideoAspect[];
  resolutions: VideoResolution[];
  durations?: number[];
  aspect: VideoAspect;
  setAspect?: (v: VideoAspect) => void;
  onAspectChange?: (v: VideoAspect) => void;
  resolution: VideoResolution;
  setResolution?: (v: VideoResolution) => void;
  onResolutionChange?: (v: VideoResolution) => void;
  duration: number;
  setDuration?: (v: number) => void;
  onDurationChange?: (v: number) => void;
  soundOn?: boolean;
  setSoundOn?: (v: boolean) => void;
  audioOn?: boolean;
  onAudioChange?: (v: boolean) => void;
  soundAvailable?: boolean;
  audioSupported?: boolean;
  disabled?: boolean;
  disabledDurations?: Partial<Record<number, string>>;
  disabledResolutions?: Partial<Record<string, string>>;
  durationLocks?: Record<number, string | undefined>;
  resolutionLocks?: Record<string, string | undefined>;
  capabilityNote?: string;
}) {
  const aspectList = aspects?.length ? aspects : (["16:9", "9:16", "1:1"] as VideoAspect[]);
  const resList: VideoResolution[] =
    resolutions?.length >= 1 ? resolutions : (["480p", "720p", "1080p"] as VideoResolution[]);
  const safeAspect = (aspectList.includes(aspect) ? aspect : aspectList[0]) as VideoAspect;
  const safeRes = (resList.includes(resolution) ? resolution : resList[0]) as VideoResolution;
  const durationOpts = durations?.length ? durations : [5, 10, 15];

  const sound = audioOn ?? soundOn ?? false;
  const showSound = audioSupported ?? soundAvailable;
  const changeAspect = onAspectChange ?? setAspect ?? (() => {});
  const changeRes = onResolutionChange ?? setResolution ?? (() => {});
  const changeDur = onDurationChange ?? setDuration ?? (() => {});
  const changeSound = onAudioChange ?? setSoundOn ?? (() => {});

  const durLocks = durationLocks ?? disabledDurations ?? {};
  const resLocks = resolutionLocks ?? disabledResolutions ?? {};

  return (
    <div className={cn(GLASS, "space-y-4 p-4")}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Features</p>

      {showSound && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {sound ? (
              <Volume2 className="h-4 w-4 text-[#F43F5E]" aria-hidden />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-400" aria-hidden />
            )}
            <div>
              <p className="text-sm font-medium text-slate-800">Sound</p>
              <p className="text-[11px] text-slate-500">
                {sound ? "On when supported" : "Silent (default)"}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={sound}
            aria-label={sound ? "Sound on" : "Sound off"}
            disabled={disabled}
            onClick={() => changeSound(!sound)}
            className={cn(
              "relative h-8 w-14 shrink-0 rounded-full border transition-colors duration-200 ease-out",
              "active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F43F5E]/40",
              sound
                ? "border-transparent bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] shadow-[0_6px_18px_rgba(244,63,94,0.35)]"
                : "border-slate-300/80 bg-white/60",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <span
              className={cn(
                "pointer-events-none absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-md",
                "transition-transform duration-200 ease-out will-change-transform",
                sound ? "translate-x-6" : "translate-x-0",
              )}
            />
          </button>
        </div>
      )}

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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
                onClick={() => changeAspect(a)}
                className={cn(
                  "inline-flex min-h-[44px] min-w-[72px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold",
                  "transition-all duration-150 ease-out select-none active:scale-95",
                  active ? CHIP_ON : CHIP_OFF,
                  disabled && "pointer-events-none opacity-40",
                )}
              >
                <AspectShape ratio={a} active={active} />
                <span className="whitespace-nowrap tabular-nums">{a}</span>
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
          disabled: Boolean(resLocks[r]),
          reason: resLocks[r],
          locked: Boolean(resLocks[r]),
        }))}
        value={safeRes}
        onChange={changeRes}
        disabled={disabled}
      />

      <ChipGroup
        label="Duration"
        options={durationOpts.map((d) => ({
          id: String(d) as `${number}`,
          label: `${d}s`,
          disabled: Boolean(durLocks[d]),
          reason: durLocks[d],
          locked: Boolean(durLocks[d]),
        }))}
        value={String(duration) as `${number}`}
        onChange={(v) => {
          const n = parseInt(v, 10);
          if (!Number.isNaN(n)) changeDur(n);
        }}
        disabled={disabled}
      />

      {capabilityNote && <p className="text-[11px] text-slate-500">{capabilityNote}</p>}
    </div>
  );
}
