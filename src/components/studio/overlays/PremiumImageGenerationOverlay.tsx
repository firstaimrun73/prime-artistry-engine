/**
 * PREMIUM Image Studio — full-viewport generation environment.
 * Rigid edge-to-edge overlay. Zero transparency. Editor completely hidden.
 * Only used when studioTier === "pro" (Premium experience).
 */
import { useEffect, useMemo, useState } from "react";
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
      <svg width={size} height={size} className="-rotate-90">
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {/* active ring */}
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
            transition: reduceMotion ? undefined : "stroke-dashoffset 0.85s cubic-bezier(0.22, 1, 0.36, 1)",
            filter: complete
              ? "drop-shadow(0 0 10px rgba(232, 197, 71, 0.55))"
              : "drop-shadow(0 0 6px rgba(212, 175, 55, 0.35))",
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
}: {
  /** analyzing | loading | success | error — driven by ImageEditor GenState */
  phase: PremiumGenPhase;
  /** Estimated 0–100 from parent; never trusted as complete until phase === success */
  progress: number;
  error?: string | null;
  onRetry?: () => void;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [displayPct, setDisplayPct] = useState(4);
  const [completeFlash, setCompleteFlash] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const fn = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  // Stage rotation while loading / analyzing — independent of real backend stages
  useEffect(() => {
    if (phase === "success" || phase === "error") return;
    if (reduceMotion) return;

    // Start near beginning when generation starts
    setStageIdx(0);
    const id = window.setInterval(() => {
      setStageIdx((i) => Math.min(STAGES.length - 1, i + 1));
    }, 2200);
    return () => window.clearInterval(id);
  }, [phase, reduceMotion]);

  // Smooth display %: follow parent progress, stage targets, but never 100 until success
  useEffect(() => {
    if (phase === "success") {
      setDisplayPct(100);
      setCompleteFlash(true);
      return;
    }
    if (phase === "error") return;

    const stageTarget = STAGES[stageIdx]?.targetPct ?? 90;
    const parent = Math.min(94, Math.max(0, progress));
    const blended = Math.max(displayPct, Math.min(96, Math.max(stageTarget * 0.85, parent)));

    // Ease toward blended
    const t = window.setTimeout(() => {
      setDisplayPct((p) => {
        if (p >= blended) return p;
        const step = Math.max(0.4, (blended - p) * 0.18);
        return Math.min(96, p + step);
      });
    }, 120);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (isError) return error || "Something went wrong. Credits were not charged if the job failed.";
    if (isComplete) return "Premium transform complete — revealing result";
    return stage?.support ?? "";
  }, [isError, isComplete, error, stage]);

  // Lock scroll while overlay is mounted
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="premium-gen-overlay fixed inset-0 z-[200] flex flex-col items-center justify-start overflow-hidden bg-[#0A0A0C] text-slate-100"
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

      {/* Content — vertical breathing room */}
      <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col items-center px-5 pt-[12vh] pb-10 sm:pt-[14vh]">
        {/* Upper animation + stage */}
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

        {/* Circular progress — middle / lower-middle */}
        <div className="mt-10 sm:mt-12">
          {!isError && (
            <CircularProgress
              value={isComplete ? 100 : displayPct}
              complete={isComplete}
              reduceMotion={reduceMotion}
            />
          )}
        </div>

        {isError && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-8 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-5 py-2.5 text-sm font-semibold text-[#E8C547] transition hover:bg-[#D4AF37]/18"
          >
            Retry
          </button>
        )}

        {!isError && !isComplete && (
          <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            MOTIO2EDIT · Premium
          </p>
        )}
      </div>
    </div>
  );
}
