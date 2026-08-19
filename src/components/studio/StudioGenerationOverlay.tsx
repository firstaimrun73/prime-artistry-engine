import { useEffect, useState } from "react";
import {
  AudioLines,
  Camera,
  Crop,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudioEditorKind, StudioTier } from "@/lib/studio/studio-tier";
import { studioCardClass } from "@/lib/studio/studio-tier";

/** Backend-aligned stages (Phase 2 §36). COMPLETE only when parent sets complete. */
export type StudioJobStage =
  | "QUEUED"
  | "ANALYSING"
  | "PREPARING"
  | "PROCESSING"
  | "GENERATING"
  | "VALIDATING"
  | "STORING"
  | "COMPLETE"
  | "ERROR";

const STAGE_ORDER: StudioJobStage[] = [
  "QUEUED",
  "ANALYSING",
  "PREPARING",
  "PROCESSING",
  "GENERATING",
  "VALIDATING",
  "STORING",
];

function stageLabel(stage: StudioJobStage, kind: StudioEditorKind): string {
  switch (stage) {
    case "QUEUED":
      return "Queued";
    case "ANALYSING":
      return "Analysing your input";
    case "PREPARING":
      return "Studying your prompt";
    case "PROCESSING":
      return kind === "video"
        ? "Planning camera movement"
        : kind === "music"
          ? "Shaping the arrangement"
          : "Selecting direction";
    case "GENERATING":
      return kind === "video"
        ? "Generating frames"
        : kind === "music"
          ? "Generating audio"
          : "Generating image";
    case "VALIDATING":
      return "Validating output";
    case "STORING":
      return "Saving to library";
    case "COMPLETE":
      return "Complete";
    case "ERROR":
      return "Failed";
  }
}

function StageIcon({
  stage,
  kind,
  active,
}: {
  stage: StudioJobStage;
  kind: StudioEditorKind;
  active: boolean;
}) {
  const cls = cn("h-4 w-4", active && "animate-pulse");
  if (stage === "ANALYSING") return <Search className={cls} />;
  if (stage === "PREPARING") return <FileText className={cls} />;
  if (stage === "PROCESSING") {
    if (kind === "video") return <Camera className={cls} />;
    if (kind === "music") return <AudioLines className={cls} />;
    return <Sparkles className={cls} />;
  }
  if (stage === "GENERATING") {
    if (kind === "video") return <Film className={cls} />;
    if (kind === "music") return <AudioLines className={cls} />;
    return <ImageIcon className={cls} />;
  }
  if (stage === "VALIDATING") return <Wand2 className={cls} />;
  if (stage === "STORING") return <Crop className={cls} />;
  return <Loader2 className={cn(cls, active && "animate-spin")} />;
}

/**
 * Standard: simple progress list.
 * Pro/Premium: overlay card with richer motion (CSS only).
 * Never shows COMPLETE until parent passes stage=COMPLETE (Phase 2 §37).
 */
export function StudioGenerationOverlay({
  kind,
  tier,
  stage,
  error,
  onRetry,
  className,
}: {
  kind: StudioEditorKind;
  tier: StudioTier;
  stage: StudioJobStage;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const fn = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const isError = stage === "ERROR" || !!error;
  const isComplete = stage === "COMPLETE";
  const currentIdx = Math.max(0, STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]));

  if (isComplete) return null;

  const premium = tier === "premium";
  const pro = tier === "pro" || premium;

  return (
    <div
      className={cn(
        "relative overflow-hidden p-5",
        studioCardClass(tier),
        premium && "border-amber-500/30",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {pro && !reduceMotion && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-40",
            premium
              ? "bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.15),_transparent_60%)]"
              : "bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.12),_transparent_60%)]",
          )}
        />
      )}

      <div className="relative">
        <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
          {!isError && <Loader2 className="h-4 w-4 animate-spin" />}
          {isError ? "Generation failed" : stageLabel(stage, kind)}
        </p>

        {isError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error || "Something went wrong."}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          <ol className="space-y-2.5">
            {STAGE_ORDER.map((s, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <li
                  key={s}
                  className={cn(
                    "flex items-center gap-3 text-sm",
                    done && "text-primary",
                    active && "font-semibold text-foreground",
                    !done && !active && "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border",
                      done && "border-primary bg-primary/15",
                      active && "border-primary bg-primary/10",
                      premium && active && "border-amber-500/50 bg-amber-500/10",
                    )}
                  >
                    {done ? (
                      <span className="text-xs">✓</span>
                    ) : (
                      <StageIcon stage={s} kind={kind} active={active && !reduceMotion} />
                    )}
                  </span>
                  <span>{stageLabel(s, kind)}</span>
                </li>
              );
            })}
          </ol>
        )}

        {tier === "standard" && !isError && (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${Math.min(95, ((currentIdx + 1) / STAGE_ORDER.length) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Advance through stages on a timer while waiting for real backend completion. */
export function useSimulatedStages(active: boolean, onError?: boolean): StudioJobStage {
  const [stage, setStage] = useState<StudioJobStage>("QUEUED");
  useEffect(() => {
    if (!active) {
      setStage("QUEUED");
      return;
    }
    if (onError) {
      setStage("ERROR");
      return;
    }
    setStage("QUEUED");
    const timers = [
      setTimeout(() => setStage("ANALYSING"), 800),
      setTimeout(() => setStage("PREPARING"), 2800),
      setTimeout(() => setStage("PROCESSING"), 6000),
      setTimeout(() => setStage("GENERATING"), 10000),
      setTimeout(() => setStage("VALIDATING"), 22000),
      setTimeout(() => setStage("STORING"), 32000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active, onError]);
  return stage;
}
