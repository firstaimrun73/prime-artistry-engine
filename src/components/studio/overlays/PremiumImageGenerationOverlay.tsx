/**
 * PREMIUM Image Studio — full-viewport generation environment.
 * Rigid edge-to-edge overlay. Zero transparency. Editor completely hidden.
 * Only used when studioTier === "pro" (Premium experience).
 *
 * Rendered via portal to document.body so parent overflow/transform cannot clip it.
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Brain,
  Check,
  Code2,
  Crosshair,
  Eye,
  Grid3X3,
  Layers,
  Loader2,
  Rocket,
  ScanSearch,
  Settings2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PremiumGenPhase =
  | "analyzing"
  | "loading"
  | "success"
  | "error";

type StageDef = {
  id: string;
  title: string;
  support: string;
  Icon: React.ComponentType<{ className?: string }>;
  /** Target display % when this stage is active (before real completion). */
  targetPct: number;
};

const STAGES: StageDef[] = [
  {
    id: "analyse",
    title: "Analysing image",
    support: "Understanding composition, lighting and visual structure",
    Icon: ScanSearch,
    targetPct: 8,
  },
  {
    id: "structure",
    title: "Reading image structure",
    support: "Mapping edges, depth and key visual regions",
    Icon: Eye,
    targetPct: 16,
  },
  {
    id: "prompt",
    title: "Understanding prompt",
    support: "Translating your instructions into editing actions",
    Icon: Brain,
    targetPct: 26,
  },
  {
    id: "launch",
    title: "Launching AI",
    support: "Warming the Premium creative engine",
    Icon: Rocket,
    targetPct: 34,
  },
  {
    id: "prepare",
    title: "Preparing edit",
    support: "Building the operation stack for this transform",
    Icon: Settings2,
    targetPct: 42,
  },
  {
    id: "instructions",
    title: "Building instructions",
    support: "Composing precise visual directives",
    Icon: Layers,
    targetPct: 50,
  },
  {
    id: "code",
    title: "Generating code",
    support: "Encoding the edit into model-ready operations",
    Icon: Code2,
    targetPct: 58,
  },
  {
    id: "treat",
    title: "AI is treating image",
    support: "Applying intelligent visual adjustments",
    Icon: Wand2,
    targetPct: 68,
  },
  {
    id: "pixels",
    title: "Processing pixels",
    support: "Reconstructing detail at target quality",
    Icon: Grid3X3,
    targetPct: 78,
  },
  {
    id: "refine",
    title: "Refining image",
    support: "Sharpening coherence and natural finish",
    Icon: Crosshair,
    targetPct: 88,
  },
  {
    id: "finalise",
    title: "Finalising edit",
    support: "Polishing the last pass before delivery",
    Icon: Sparkles,
    targetPct: 96,
  },
];

/** Hard cap while generation is still running — never show 100% early. */
const RUNNING_CAP = 96;

function CircularProgress({
  value,
  complete,
  reduceMotion,
}: {
  value: number;
  complete: boolean;
  reduceMotion: boolean;
}) {
  const size = 148;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = c - (clamped / 100) * c;

  return (
    <div
      className="relative mx-auto flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#premiumGoldRing)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: reduceMotion
              ? undefined
              : "stroke-dashoffset 0.85s cubic-bezier(0.22, 1, 0.36, 1)",
            filter: complete
              ? "drop-shadow(0 0 10px rgba(232, 197, 71, 0.55))"
              : "drop-shadow(0 0 6px rgba(212, 175, 55, 0.4))",
          }}
        />
        <defs>
          <linearGradient id="premiumGoldRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C9A227" />
            <stop offset="55%" stopColor="#E8C547" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {complete ? (
          <Check className="h-8 w-8 text-[#E8C547]" strokeWidth={2.5} />
        ) : (
          <span className="text-3xl font-semibold tracking-tight text-[#F5E6B8] tabular-nums">
            {Math.round(clamped)}
            <span className="text-base font-medium text-[#F5E6B8]/70">%</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function PremiumImageGenerationOverlay({
  phase,
  progress,
  error,
  onRetry,
  onDismiss,
}: {
  phase: PremiumGenPhase;
  /** Estimated 0–100 from parent; never trusted as complete until phase === success */
  progress: number;
  error?: string | null;
  onRetry?: () => void;
  /** Close overlay after error without retrying */
  onDismiss?: () => void;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [displayPct, setDisplayPct] = useState(4);
  const [completeFlash, setCompleteFlash] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const fn = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  // Stage rotation while analyzing/loading — still advances under reduced-motion
  useEffect(() => {
    if (phase === "success" || phase === "error") return;

    setStageIdx(0);
    const intervalMs = reduceMotion ? 2800 : 2200;
    const id = window.setInterval(() => {
      setStageIdx((i) => Math.min(STAGES.length - 1, i + 1));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [phase, reduceMotion]);

  // Continuous easing toward stage/parent target; hard-cap until success
  useEffect(() => {
    if (phase === "success") {
      setDisplayPct(100);
      setCompleteFlash(true);
      return;
    }
    if (phase === "error") return;

    const stageTarget = STAGES[stageIdx]?.targetPct ?? 90;
    const parent = Math.min(RUNNING_CAP - 2, Math.max(0, progress));
    const goal = Math.min(RUNNING_CAP, Math.max(stageTarget * 0.9, parent, 4));

    const id = window.setInterval(() => {
      setDisplayPct((p) => {
        if (p >= goal) return Math.min(p, RUNNING_CAP);
        const step = Math.max(0.35, (goal - p) * 0.12);
        return Math.min(RUNNING_CAP, p + step);
      });
    }, 100);

    return () => window.clearInterval(id);
  }, [phase, progress, stageIdx]);

  const stage = STAGES[Math.min(stageIdx, STAGES.length - 1)];
  const Icon = stage?.Icon ?? Loader2;
  const isError = phase === "error";
  const isComplete = phase === "success";

  const title = useMemo(() => {
    if (isError) return "Generation failed";
    if (isComplete) return "Your edit is ready";
    return stage?.title ?? "Working";
  }, [isError, isComplete, stage]);

  const support = useMemo(() => {
    if (isError)
      return error || "Something went wrong. Credits were not charged if the job failed.";
    if (isComplete) return "Premium transform complete — revealing result";
    return stage?.support ?? "";
  }, [isError, isComplete, error, stage]);

  // Lock body scroll while mounted
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
    };
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  const ui = (
    <div
      className="premium-gen-overlay fixed left-0 top-0 right-0 bottom-0 z-[9999] flex flex-col items-center justify-start overflow-hidden bg-[#0A0A0C] text-slate-100 isolation-isolate"
      style={{
        width: "100vw",
        height: "100dvh",
        maxHeight: "100dvh",
        minHeight: "100dvh",
        // Opaque solid — no alpha
        backgroundColor: "#0A0A0C",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
      role="status"
      aria-live="polite"
      aria-busy={!isComplete && !isError}
    >
      {/* Subtle abstract conversation-pattern wallpaper ~40% intensity */}
      <div className="premium-gen-wallpaper pointer-events-none absolute inset-0" aria-hidden />

      {/* Soft depth gradients */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 20%, rgba(212,175,55,0.10), transparent 55%)," +
            "radial-gradient(ellipse 50% 40% at 80% 70%, rgba(167,139,250,0.07), transparent 50%)," +
            "radial-gradient(ellipse 40% 30% at 15% 80%, rgba(232,197,71,0.05), transparent 45%)",
        }}
      />

      {/* Micro activity */}
      {!reduceMotion && (
        <>
          <div className="premium-gen-particles pointer-events-none absolute inset-0" aria-hidden />
          <div className="premium-gen-scan pointer-events-none absolute inset-0" aria-hidden />
        </>
      )}

      {/* Content — intentional vertical separation: status UP, ring BELOW */}
      <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col items-center px-5 pt-[10vh] pb-10 sm:pt-[12vh] md:pt-[14vh]">
        <div className="flex w-full flex-col items-center text-center">
          <div
            className={cn(
              "mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 shadow-[0_0_28px_-8px_rgba(232,197,71,0.45)]",
              !reduceMotion && !isComplete && !isError && "premium-gen-icon-pulse",
              completeFlash && "premium-gen-complete-glow",
            )}
          >
            {isComplete ? (
              <Check className="h-8 w-8 text-[#E8C547]" strokeWidth={2.25} />
            ) : isError ? (
              <Loader2 className="h-7 w-7 text-red-400" />
            ) : (
              <Icon className="h-7 w-7 text-[#E8C547]" />
            )}
          </div>

          <h2 className="text-lg font-semibold tracking-tight text-[#F5E6B8] sm:text-xl">{title}</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">{support}</p>
        </div>

        {/* Breathing room between status block and progress ring */}
        <div className="mt-12 sm:mt-14 md:mt-16">
          {!isError && (
            <CircularProgress
              value={isComplete ? 100 : displayPct}
              complete={isComplete}
              reduceMotion={reduceMotion}
            />
          )}
        </div>

        {isError && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-5 py-2.5 text-sm font-semibold text-[#E8C547] transition hover:bg-[#D4AF37]/18"
              >
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10"
              >
                Close
              </button>
            )}
          </div>
        )}

        {!isError && !isComplete && (
          <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            MOTIO2EDIT · Premium
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
