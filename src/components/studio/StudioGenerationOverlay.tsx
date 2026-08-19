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
import type { StudioJobStage } from "@/lib/generation-status";

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
      return kind === "music" ? "Analysing sound intent" : "Analysing your input";
    case "PREPARING":
      return kind === "music" ? "Inspecting composition brief" : "Studying your prompt";
    case "PROCESSING":
      return kind === "video"
        ? "Planning camera movement"
        : kind === "music"
          ? "Shaping rhythm & arrangement"
          : "Selecting visual direction";
    case "GENERATING":
      return kind === "video"
        ? "Generating frames"
        : kind === "music"
          ? "Generating audio"
          : "Generating image";
    case "VALIDATING":
      return kind === "music" ? "Mastering pass" : "Validating output";
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
 * Overlay driven by real job stage from generation-status / local parent state.
 * COMPLETE only when parent receives backend success — never invented by this component.
 */
export function StudioGenerationOverlay({
  kind,
  tier,
  stage,
  error,
  onRetry,
  className,
  coverEditor,
}: {
  kind: StudioEditorKind;
  tier: StudioTier;
  stage: StudioJobStage;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  /** Pro/Premium: cover editor content area */
  coverEditor?: boolean;
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
  if (stage === "COMPLETE") return null;

  const currentIdx = Math.max(
    0,
    STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]),
  );
  const premium = tier === "premium";
  const pro = tier === "pro" || premium;
  const immersive = coverEditor && pro;

  return (
    <div
      className={cn(
        "relative overflow-hidden p-5",
        studioCardClass(tier),
        premium && "border-amber-500/30 bg-zinc-950 text-zinc-50",
        immersive && "min-h-[280px]",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {pro && !reduceMotion && (
        <>
          <div
            className={cn(
              "pointer-events-none absolute inset-0 opacity-50",
              premium
                ? "bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.18),_transparent_55%)]"
                : "bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.14),_transparent_55%)]",
            )}
          />
          {premium && (
            <div className="studio-gold-particles pointer-events-none absolute inset-0" aria-hidden />
          )}
          {pro && !premium && (
            <div className="studio-pro-lines pointer-events-none absolute inset-0" aria-hidden />
          )}
        </>
      )}

      <div className="relative">
        <p
          className={cn(
            "mb-4 flex items-center gap-2 text-sm font-semibold",
            premium && "text-amber-100",
          )}
        >
          {!isError && <Loader2 className="h-4 w-4 animate-spin" />}
          {isError ? "Generation failed" : stageLabel(stage, kind)}
        </p>

        {isError ? (
          <div className="space-y-3">
            <p className="text-sm text-red-400">{error || "Something went wrong. Credits were not charged if the job failed."}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-semibold",
                  premium
                    ? "border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
                    : "border-border hover:bg-muted",
                )}
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
                    done && (premium ? "text-amber-400" : "text-primary"),
                    active && (premium ? "font-semibold text-amber-100" : "font-semibold text-foreground"),
                    !done && !active && (premium ? "text-zinc-500" : "text-muted-foreground"),
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border",
                      done && (premium ? "border-amber-500/50 bg-amber-500/15" : "border-primary bg-primary/15"),
                      active && (premium ? "border-amber-400 bg-amber-500/20" : "border-primary bg-primary/10"),
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
