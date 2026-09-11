/** Compact capability-driven controls for scroll-free Video Studio. */
import { cn } from "@/lib/utils";
import type { VideoResolution, VideoAspect, VideoTier } from "@/lib/video-model-registry";
import { VIDEO_STYLE_MODIFIERS, qualityShortLabel, resolutionUiLabel } from "@/lib/video-model-registry";

function AspectIcon({ ratio, active }: { ratio: VideoAspect; active: boolean }) {
  const map: Record<string, { w: number; h: number }> = {
    "16:9": { w: 18, h: 10 },
    "9:16": { w: 9, h: 16 },
    "1:1": { w: 12, h: 12 },
  };
  const s = map[ratio] ?? { w: 14, h: 10 };
  return (
    <span
      className={cn("inline-block rounded-[2px] border", active ? "border-white/90 bg-white/25" : "border-current/50 bg-current/10")}
      style={{ width: s.w, height: s.h }}
      aria-hidden
    />
  );
}

export function VideoStudioControls({
  tier, setTier, premiumLocked, onPremiumLockedClick,
  aspects, resolutions, aspect, setAspect, resolution, setResolution,
  duration, setDuration, durations,
  audioOn, setAudioOn, audioSupported,
  styleId, setStyleId, disabled,
}: {
  tier: VideoTier;
  setTier: (t: VideoTier) => void;
  premiumLocked: boolean;
  onPremiumLockedClick?: () => void;
  aspects: VideoAspect[];
  resolutions: VideoResolution[];
  aspect: VideoAspect;
  setAspect: (a: VideoAspect) => void;
  resolution: VideoResolution;
  setResolution: (r: VideoResolution) => void;
  duration: number;
  setDuration: (d: number) => void;
  durations: number[];
  audioOn: boolean;
  setAudioOn: (v: boolean) => void;
  audioSupported: boolean;
  styleId: string;
  setStyleId: (id: string) => void;
  disabled?: boolean;
}) {
  const primaryAspects = aspects.filter((a) => a === "16:9" || a === "9:16" || a === "1:1");
  const resList = resolutions.filter((r) => r === "480p" || r === "720p" || r === "1080p");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-white/10 bg-black/35 p-0.5">
          <button type="button" disabled={disabled} onClick={() => setTier("standard")} aria-pressed={tier === "standard"}
            className={cn("min-h-[36px] rounded-full px-3.5 py-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400",
              tier === "standard" ? "bg-white text-zinc-900" : "text-zinc-400")}>Standard</button>
          <button type="button" disabled={disabled} aria-pressed={tier === "premium"}
            aria-label={premiumLocked ? "Premium locked — view plans" : "Premium"}
            onClick={() => { if (premiumLocked) onPremiumLockedClick?.(); else setTier("premium"); }}
            className={cn("min-h-[36px] rounded-full px-3.5 py-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
              tier === "premium" ? "bg-gradient-to-r from-amber-400 to-orange-500 text-zinc-900 shadow shadow-amber-500/25" : "text-zinc-400",
              premiumLocked && "opacity-60")}>Premium{premiumLocked ? " 🔒" : ""}</button>
        </div>
        <button type="button" disabled={disabled || !audioSupported}
          onClick={() => audioSupported && setAudioOn(!audioOn)}
          aria-pressed={audioOn && audioSupported}
          aria-label={!audioSupported ? "Audio unavailable" : audioOn ? "Audio on" : "Audio off"}
          className={cn("min-h-[36px] rounded-full border px-3.5 py-1 text-[11px] font-semibold transition",
            audioOn && audioSupported ? "border-red-400/50 bg-red-500/20 text-red-200" : "border-white/10 bg-black/30 text-zinc-400",
            !audioSupported && "opacity-40")}>
          Audio {audioOn && audioSupported ? "On" : "Off"}
        </button>
      </div>

      {resList.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {resList.map((r) => {
            const active = resolution === r;
            return (
              <button key={r} type="button" disabled={disabled} onClick={() => setResolution(r)}
                className={cn("flex min-h-[40px] min-w-[3.5rem] flex-col items-center justify-center rounded-xl border px-2.5 py-1 transition",
                  active ? "border-red-500 bg-red-500/20 text-white" : "border-white/10 bg-black/25 text-zinc-400")}>
                <span className="text-[11px] font-bold leading-none">{qualityShortLabel(r)}</span>
                <span className="text-[9px] opacity-70">{r}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {primaryAspects.map((a) => {
          const active = aspect === a;
          return (
            <button key={a} type="button" disabled={disabled} onClick={() => setAspect(a)}
              className={cn("inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                active ? "border-red-500 bg-red-500/20 text-white" : "border-white/10 bg-black/25 text-zinc-400")}>
              <AspectIcon ratio={a} active={active} />{a}
            </button>
          );
        })}
        <span className="mx-0.5 h-4 w-px bg-white/10" aria-hidden />
        {durations.map((d) => (
          <button key={d} type="button" disabled={disabled} onClick={() => setDuration(d)}
            className={cn("min-h-[36px] rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums",
              duration === d ? "border-red-500 bg-red-500/20 text-white" : "border-white/10 bg-black/25 text-zinc-400")}>
            {d}s
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <button type="button" disabled={disabled} onClick={() => setStyleId("")}
          className={cn("min-h-[32px] shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
            !styleId ? "border-red-500/60 bg-red-500/15 text-red-200" : "border-white/10 text-zinc-500")}>Style · None</button>
        {Object.keys(VIDEO_STYLE_MODIFIERS).slice(0, 8).map((id) => (
          <button key={id} type="button" disabled={disabled} onClick={() => setStyleId(id)}
            className={cn("min-h-[32px] shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize",
              styleId === id ? "border-red-500/60 bg-red-500/15 text-red-200" : "border-white/10 text-zinc-500")}>{id}</button>
        ))}
      </div>
    </div>
  );
}
