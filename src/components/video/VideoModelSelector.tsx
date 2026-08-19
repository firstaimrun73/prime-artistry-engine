import { cn } from "@/lib/utils";
import {
  modelsForMode,
  type VideoGenMode,
  type VideoModelDef,
  estimateModelCredits,
} from "@/lib/video-model-registry";

export function VideoModelSelector({
  mode,
  value,
  onChange,
  duration,
  resolution,
  soundOn,
  disabled,
}: {
  mode: VideoGenMode;
  value: string;
  onChange: (id: string) => void;
  duration: number;
  resolution: "480p" | "720p" | "1080p" | "4k";
  soundOn: boolean;
  disabled?: boolean;
}) {
  const models = modelsForMode(mode);
  const standard = models.filter((m) => m.tier === "standard");
  const premium = models.filter((m) => m.tier === "premium");

  const Card = ({ m }: { m: VideoModelDef }) => {
    const active = value === m.id;
    const credits = estimateModelCredits({
      model: m,
      durationSec: duration,
      resolution: m.resolutions.includes(resolution) ? resolution : m.resolutions[0],
      soundOn: soundOn && m.nativeAudio,
    });
    return (
      <button
        type="button"
        disabled={disabled || !m.available}
        onClick={() => onChange(m.id)}
        className={cn(
          "w-full rounded-2xl border p-3 text-left transition-all",
          active
            ? "border-red-500 bg-red-500/10 ring-1 ring-red-500/30"
            : "border-border/70 bg-card hover:border-red-400/40",
          !m.available && "opacity-40",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">{m.name}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{m.bestUse}</p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums">
            ~{credits}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {m.modes.map((md) => (
            <span key={md} className="rounded bg-muted/80 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
              {md === "text" ? "T→V" : md === "image" ? "I→V" : "V→V"}
            </span>
          ))}
          {m.nativeAudio ? (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">
              Audio
            </span>
          ) : (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">Silent</span>
          )}
          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
            max {m.resolutions[m.resolutions.length - 1]}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {standard.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Standard</p>
          <div className="grid gap-2 sm:grid-cols-2">{standard.map((m) => <Card key={m.id} m={m} />)}</div>
        </div>
      )}
      {premium.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Premium</p>
          <div className="grid gap-2 sm:grid-cols-2">{premium.map((m) => <Card key={m.id} m={m} />)}</div>
        </div>
      )}
    </div>
  );
}
