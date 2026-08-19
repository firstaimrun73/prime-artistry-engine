import { cn } from "@/lib/utils";
import { VIDEO_GEN_STAGES } from "./video-studio-types";

export function VideoGeneratingOverlay({
  stageIndex,
  etaSeconds,
}: {
  stageIndex: number;
  etaSeconds: number;
}) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-orange-500/5 p-5">
      <p className="mb-4 text-sm font-semibold">Generating video…</p>
      <ol className="space-y-3">
        {VIDEO_GEN_STAGES.map((s, i) => {
          const done = i < stageIndex;
          const active = i === stageIndex;
          return (
            <li
              key={s.id}
              className={cn(
                "flex items-center gap-3 text-sm",
                done && "text-red-600",
                active && "font-semibold text-foreground",
                !done && !active && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-[10px]",
                  done && "border-red-500 bg-red-500/15",
                  active && "border-red-500 bg-red-500/10 animate-pulse",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              {s.label}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Expected ~{etaSeconds}s — keep this tab open
      </p>
    </div>
  );
}
