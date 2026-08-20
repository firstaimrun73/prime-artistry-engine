import { useEffect, useState } from "react";
import { Wand2, Check, Loader2 } from "lucide-react";
import { CompareSlider } from "@/components/CompareSlider";
import type { GenState } from "@/lib/editor/editor.types";
import type { StudioTier } from "@/lib/studio/studio-tier";
import { cn } from "@/lib/utils";

interface EditorPreviewProps {
  state: GenState;
  loadingMessage: string;
  progress: number;
  stage: number;
  stages: string[];
  output: string | null;
  outputIsVideo: boolean;
  mediaType: "image" | "video";
  inputPreview: string | null;
  inputKind: "image" | "video" | null;
  isAdmin: boolean;
  isFree: boolean;
  keepWatermark: boolean;
  /** Image Studio experience — drives generation presentation. */
  studioTier?: StudioTier;
}

/**
 * Preview / result surface.
 * Generation UI branches by Experience:
 * - Standard: clean progress bar
 * - Premium (pro): orange energy / flame atmosphere
 * - VIP (premium): dark cinematic field
 */
export function EditorPreview({
  state,
  loadingMessage,
  progress,
  stage,
  stages,
  output,
  outputIsVideo,
  mediaType,
  inputPreview,
  inputKind,
  isAdmin,
  isFree,
  keepWatermark,
  studioTier = "standard",
}: EditorPreviewProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const fn = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const vip = studioTier === "premium";
  const premiumExp = studioTier === "pro";

  if (state === "analyzing") {
    return (
      <div
        className={cn(
          "relative flex min-h-56 flex-col items-center justify-center overflow-hidden rounded-2xl border p-6 text-center shadow-sm backdrop-blur-md animate-scale-in",
          vip
            ? "border-amber-500/25 bg-zinc-950 text-zinc-50"
            : premiumExp
              ? "border-orange-500/30 bg-gradient-to-b from-orange-950/30 to-card/80"
              : "border-border/60 bg-card/70",
        )}
      >
        {premiumExp && !reduceMotion && (
          <div className="studio-premium-flame pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        )}
        {vip && !reduceMotion && (
          <>
            <div className="studio-vip-field pointer-events-none absolute inset-0" aria-hidden />
            <div className="studio-gold-particles pointer-events-none absolute inset-0 opacity-50" aria-hidden />
          </>
        )}
        <div className="relative">
          <Wand2
            className={cn(
              "mx-auto h-8 w-8 animate-pulse",
              vip ? "text-amber-300" : premiumExp ? "text-orange-400" : "text-primary",
            )}
          />
          <p
            className={cn(
              "mt-3 text-sm font-semibold",
              vip ? "text-amber-100" : premiumExp ? "text-orange-100" : "text-primary",
            )}
          >
            {vip
              ? "Initialising VIP creative engine"
              : premiumExp
                ? "Analysing your image"
                : "Analyzing your request…"}
          </p>
          <p className={cn("mt-1 text-xs", vip ? "text-zinc-400" : "text-muted-foreground")}>
            {vip
              ? "Understanding visual structure"
              : premiumExp
                ? "Understanding the edit"
                : "Understanding exactly what you mean"}
          </p>
        </div>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-5 shadow-sm backdrop-blur-md animate-scale-in",
          vip
            ? "border-amber-500/25 bg-zinc-950 text-zinc-50"
            : premiumExp
              ? "border-orange-500/30 bg-gradient-to-b from-orange-950/40 to-card/80"
              : "border-border/60 bg-card/70",
        )}
        role="status"
        aria-live="polite"
      >
        {premiumExp && !reduceMotion && (
          <div className="studio-premium-flame pointer-events-none absolute inset-0" aria-hidden />
        )}
        {vip && !reduceMotion && (
          <>
            <div className="studio-vip-field pointer-events-none absolute inset-0" aria-hidden />
            <div className="studio-gold-particles pointer-events-none absolute inset-0" aria-hidden />
          </>
        )}

        <div className="relative">
          <p
            className={cn(
              "flex items-center gap-2 text-sm font-semibold",
              vip ? "text-amber-100" : premiumExp ? "text-orange-50" : "text-primary",
            )}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            {vip
              ? loadingMessage.replace(/^./, (c) => c.toUpperCase())
              : premiumExp
                ? loadingMessage
                : loadingMessage}
          </p>

          {/* Standard: progress bar */}
          {studioTier === "standard" && (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Premium: soft energy bar */}
          {premiumExp && (
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-orange-950/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-400 transition-all duration-500"
                style={{ width: `${Math.min(96, progress)}%` }}
              />
            </div>
          )}

          {/* VIP: thin metallic bar */}
          {vip && (
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-600/80 via-amber-200 to-amber-500/80 transition-all duration-700"
                style={{ width: `${Math.min(96, progress)}%` }}
              />
            </div>
          )}

          <ul className="mt-4 space-y-2">
            {stages.map((s, i) => {
              const done = i < stage;
              const active = i === stage;
              return (
                <li key={s} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] transition-all",
                      done &&
                        (vip
                          ? "bg-amber-500/25 text-amber-200"
                          : premiumExp
                            ? "bg-orange-500/30 text-orange-100"
                            : "bg-primary text-primary-foreground"),
                      active &&
                        (vip
                          ? "bg-amber-500/20 text-amber-100 animate-pulse"
                          : premiumExp
                            ? "bg-orange-500/25 text-orange-50 animate-pulse"
                            : "bg-primary/20 text-primary animate-pulse"),
                      !done &&
                        !active &&
                        (vip ? "bg-zinc-800 text-zinc-500" : "bg-secondary text-muted-foreground"),
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      done || active
                        ? vip
                          ? "text-amber-50"
                          : premiumExp
                            ? "text-orange-50"
                            : "text-foreground"
                        : vip
                          ? "text-zinc-500"
                          : "text-muted-foreground",
                      active && "font-semibold",
                    )}
                  >
                    {s}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  if (!output) {
    return null;
  }

  if (!outputIsVideo && mediaType === "image" && inputPreview) {
    return (
      <div className="animate-scale-in overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-2 shadow-sm backdrop-blur-md">
        <CompareSlider before={inputPreview} after={output} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm backdrop-blur-md animate-scale-in">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Result</p>
      <div className="flex min-h-[200px] items-center justify-center overflow-hidden rounded-xl bg-background/40">
        {outputIsVideo ? (
          <div className="relative h-full w-full min-h-[200px]">
            <video
              src={output}
              className="h-full w-full object-contain"
              controls
              autoPlay
              loop
              muted
            />
            {!isAdmin && (isFree || keepWatermark) && (
              <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/55 px-2 py-1 text-[11px] font-bold tracking-wide text-white/95">
                Motio2edit
              </span>
            )}
          </div>
        ) : (
          <img
            src={output}
            alt="output"
            className="max-h-[480px] w-full object-contain select-none"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
          />
        )}
      </div>
    </div>
  );
}
