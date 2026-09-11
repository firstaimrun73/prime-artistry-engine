/**
 * Product-level generation stages — not provider internals.
 */
import { cn } from "@/lib/utils";
import { Video } from "lucide-react";

const STAGES = ["Preparing scene", "Building motion", "Rendering video", "Finishing"] as const;

export function VideoGeneratingOverlay({
  stageIndex,
  etaSeconds,
  prompt,
}: {
  stageIndex: number;
  etaSeconds?: number;
  prompt?: string;
}) {
  const idx = Math.min(Math.max(0, stageIndex), STAGES.length - 1);
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-zinc-950/90 px-6 backdrop-blur-md">
      <div
        className={cn(
          "relative grid h-16 w-16 place-items-center rounded-2xl border border-red-500/40 bg-red-500/10",
          "motion-safe:animate-pulse",
        )}
      >
        <Video className="h-7 w-7 text-red-400" />
        <span className="pointer-events-none absolute inset-0 rounded-2xl shadow-[0_0_28px_rgba(239,68,68,0.35)] motion-safe:animate-pulse" />
      </div>
      <div className="w-full max-w-xs space-y-2 text-center">
        <p className="text-sm font-semibold text-white">{STAGES[idx]}</p>
        {etaSeconds != null && etaSeconds > 0 && (
          <p className="text-[11px] text-zinc-400">About {etaSeconds}s · keep this tab open</p>
        )}
        {prompt && (
          <p className="line-clamp-2 text-[11px] text-zinc-500">“{prompt}”</p>
        )}
        <div className="mt-3 flex justify-center gap-1.5">
          {STAGES.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 w-6 rounded-full transition-colors",
                i <= idx ? "bg-red-500" : "bg-white/15",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
