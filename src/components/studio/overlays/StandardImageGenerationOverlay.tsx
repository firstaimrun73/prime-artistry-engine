/**
 * STANDARD Image Studio — full-viewport generation environment.
 * Clean, professional, minimal. Motio2edit identity.
 * Holds until parent signals success AND (optionally) image has loaded.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Image as ImageIcon, Loader2, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StandardGenPhase = "analyzing" | "loading" | "success" | "error";

const STAGES = [
  { title: "Preparing", support: "Setting up your request" },
  { title: "Processing", support: "AI is enhancing your image" },
  { title: "Refining", support: "Polishing detail and clarity" },
  { title: "Almost ready", support: "Finalising output" },
] as const;

export function StandardImageGenerationOverlay({
  phase,
  error,
  onRetry,
  onDismiss,
}: {
  phase: StandardGenPhase;
  error?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const fn = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    if (phase === "success" || phase === "error") return;
    setStageIdx(0);
    const id = window.setInterval(() => {
      setStageIdx((i) => Math.min(STAGES.length - 1, i + 1));
    }, reduceMotion ? 2800 : 2200);
    return () => window.clearInterval(id);
  }, [phase, reduceMotion]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  const isError = phase === "error";
  const isComplete = phase === "success";
  const stage = STAGES[Math.min(stageIdx, STAGES.length - 1)];

  const ui = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background text-foreground isolation-isolate"
      style={{
        width: "100vw",
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      role="status"
      aria-live="polite"
      aria-busy={!isComplete && !isError}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, hsl(var(--primary) / 0.12), transparent 55%)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-5 text-center">
        <div
          className={cn(
            "mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10",
            !reduceMotion && !isComplete && !isError && "animate-pulse",
          )}
        >
          {isComplete ? (
            <Check className="h-7 w-7 text-primary" strokeWidth={2.25} />
          ) : isError ? (
            <Loader2 className="h-6 w-6 text-destructive" />
          ) : stageIdx < 1 ? (
            <Wand2 className="h-6 w-6 text-primary" />
          ) : stageIdx < 3 ? (
            <Sparkles className="h-6 w-6 text-primary" />
          ) : (
            <ImageIcon className="h-6 w-6 text-primary" />
          )}
        </div>

        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
          {isError
            ? "Generation failed"
            : isComplete
              ? "Your image is ready"
              : "Creating your image"}
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {isError
            ? error || "Something went wrong. Credits were not charged if the job failed."
            : isComplete
              ? "Opening your result"
              : stage.support}
        </p>

        {!isError && !isComplete && (
          <>
            <ol className="mt-8 w-full space-y-2.5 text-left">
              {STAGES.map((s, i) => {
                const done = i < stageIdx;
                const active = i === stageIdx;
                return (
                  <li
                    key={s.title}
                    className={cn(
                      "flex items-center gap-3 text-sm",
                      done && "text-primary",
                      active && "font-semibold text-foreground",
                      !done && !active && "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px]",
                        done && "border-primary bg-primary/15",
                        active && "border-primary bg-primary/10",
                        !done && !active && "border-border",
                      )}
                    >
                      {done ? "✓" : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : i + 1}
                    </span>
                    <span>{s.title}</span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{
                  width: `${Math.min(92, ((stageIdx + 1) / STAGES.length) * 100)}%`,
                }}
              />
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground">
              Usually takes around 10–20 seconds
            </p>
          </>
        )}

        {isError && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/15"
              >
                Try again
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted"
              >
                Close
              </button>
            )}
          </div>
        )}

        {!isError && (
          <p className="mt-10 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Motio2edit · Standard
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
