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

/** Glassy Motio2edit mark — UI preview only on OUTPUT; server policy unchanged. */
function WatermarkMark({ large = false }: { large?: boolean }) {
  return (
    <span
      className={
        large
          ? "pointer-events-none absolute bottom-4 right-4 rounded-lg border border-white/15 bg-black/55 px-3 py-1.5 text-sm font-bold tracking-wide text-white/95 shadow-lg backdrop-blur-md"
          : "pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/45 px-2 py-1 text-[11px] font-bold tracking-wide text-white/90 backdrop-blur-[2px]"
      }
    >
      Motio<span className="text-[#FF5A1F]">2</span>edit
    </span>
  );
}

/**
 * Preview / result surface.
 * Generation UI branches by Experience:
 * - Standard: clean progress bar
 * - Premium (pro): orange energy / flame atmosphere
 * - Ultra AI (premium): deep navy + luxury gold + electric cyan — high contrast
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
  const showWm = !isAdmin && (isFree || keepWatermark);

  if (state === "analyzing") {
    return (
      <div
        className={cn(
          "relative flex min-h-56 flex-col items-center justify-center overflow-hidden rounded-2xl border p-6 text-center shadow-sm backdrop-blur-md animate-scale-in",
          vip
            ? "border-[#D4AF37]/30 bg-[#0B1220] text-slate-100"
            : premiumExp
              ? "border-orange-500/30 bg-gradient-to-b from-orange-950/30 to-card/80 text-foreground"
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
              vip ? "text-[#E8C547]" : premiumExp ? "text-orange-400" : "text-primary",
            )}
          />
          <p
            className={cn(
              "mt-3 text-sm font-semibold",
              vip ? "text-[#F5E6B8]" : premiumExp ? "text-orange-100" : "text-primary",
            )}
          >
            {vip
              ? "Initialising Ultra AI creative engine"
              : premiumExp
                ? "Analysing your image"
                : "Analyzing your request…"}
          </p>
          <p className={cn("mt-1 text-xs", vip ? "text-slate-300" : "text-muted-foreground")}>
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
            ? "border-[#D4AF37]/30 bg-[#0B1220] text-slate-100"
            : premiumExp
              ? "border-orange-500/30 bg-gradient-to-b from-orange-950/40 to-card/80 text-foreground"
              : "border-border/60 bg-card/70",
        )}
        role="status"
        aria-live="polite"
      >
        {premiumExp && !reduceMotion && (
          <div className="studio-premium-flame pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        )}
        {vip && !reduceMotion && (
          <>
            <div className="studio-vip-field pointer-events-none absolute inset-0" aria-hidden />
            <div className="studio-gold-particles pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          </>
        )}
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <Loader2
              className={cn(
                "h-5 w-5 shrink-0 animate-spin",
                vip ? "text-[#22D3EE]" : premiumExp ? "text-orange-400" : "text-primary",
              )}
            />
            <div className="min-w-0">
              <p className={cn("text-sm font-semibold", vip ? "text-[#F5E6B8]" : "text-foreground")}>
                {loadingMessage}
              </p>
              <p className={cn("text-xs", vip ? "text-slate-400" : "text-muted-foreground")}>
                {Math.round(progress)}%
              </p>
            </div>
          </div>
          <div
            className={cn(
              "h-1.5 overflow-hidden rounded-full",
              vip ? "bg-[#111B2E]" : "bg-secondary",
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                vip
                  ? "bg-gradient-to-r from-[#D4AF37] via-[#22D3EE] to-[#D4AF37]"
                  : premiumExp
                    ? "bg-gradient-to-r from-orange-500 to-amber-400"
                    : "bg-primary",
              )}
              style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
            />
          </div>
          <ul className="space-y-1.5">
            {stages.map((s, i) => {
              const done = i < stage;
              const active = i === stage;
              return (
                <li key={s} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      done &&
                        (vip
                          ? "bg-[#D4AF37]/20 text-[#E8C547]"
                          : premiumExp
                            ? "bg-orange-500/20 text-orange-300"
                            : "bg-primary/15 text-primary"),
                      active &&
                        (vip
                          ? "bg-[#D4AF37]/25 text-[#E8C547] animate-pulse shadow-[0_0_8px_-2px_rgba(34,211,238,0.4)]"
                          : premiumExp
                            ? "bg-orange-500/25 text-orange-50 animate-pulse"
                            : "bg-primary/20 text-primary animate-pulse"),
                      !done &&
                        !active &&
                        (vip ? "bg-[#111B2E] text-slate-400" : "bg-secondary text-muted-foreground"),
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      done || active
                        ? vip
                          ? "text-slate-100"
                          : premiumExp
                            ? "text-orange-50"
                            : "text-foreground"
                        : vip
                          ? "text-slate-400"
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
      <div className="relative animate-scale-in overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-2 shadow-sm backdrop-blur-md">
        <CompareSlider before={inputPreview} after={output} />
        {showWm && <WatermarkMark large={isFree} />}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm backdrop-blur-md animate-scale-in">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Result</p>
      <div className="relative flex min-h-[200px] items-center justify-center overflow-hidden rounded-xl bg-muted/30">
        {outputIsVideo ? (
          <video
            src={output}
            controls
            className="max-h-[min(70vh,520px)] w-full object-contain"
            playsInline
          />
        ) : (
          <>
            <img
              src={output}
              alt="output"
              className="max-h-[min(70vh,520px)] w-full object-contain select-none"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
            />
            {showWm && <WatermarkMark large={isFree} />}
          </>
        )}
      </div>
    </div>
  );
}
