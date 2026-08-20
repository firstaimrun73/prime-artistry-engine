/**
 * ULTRA AI Image Studio — full-viewport generation environment.
 * Highest experience. Internal studioTier === "premium".
 * Visual design preserved from approved VIP overlay; public name is Ultra AI.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Code2,
  Crosshair,
  Crown,
  Eye,
  GitBranch,
  Grid3x3,
  Layers,
  Network,
  RotateCw,
  ScanSearch,
  ShieldCheck,
  Sliders,
  Sparkles,
  Wand2,
  Workflow,
  X,
} from "lucide-react";

const SOFT_CAP = 96;

type StageDef = {
  label: string;
  sub: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; className?: string }>;
  at: number;
};

const STAGES: StageDef[] = [
  { label: "Analysing image", sub: "Scanning the source for editable regions", icon: ScanSearch, at: 0 },
  { label: "Reading visual structure", sub: "Mapping edges, depth, and composition", icon: Eye, at: 7 },
  { label: "Mapping image details", sub: "Indexing texture and fine structure", icon: Network, at: 14 },
  { label: "Understanding your instruction", sub: "Translating your prompt into intent", icon: Brain, at: 21 },
  { label: "Building edit strategy", sub: "Sequencing the transformation steps", icon: Workflow, at: 29 },
  { label: "Planning transformation", sub: "Aligning layers for the intended result", icon: GitBranch, at: 37 },
  { label: "Generating AI instructions", sub: "Compiling the intelligent edit graph", icon: Code2, at: 45 },
  { label: "Activating image intelligence", sub: "Engaging the full Ultra AI model stack", icon: Wand2, at: 53 },
  { label: "Processing visual layers", sub: "Working through composition layers", icon: Layers, at: 61 },
  { label: "Reconstructing details", sub: "Rebuilding fine detail at full fidelity", icon: Grid3x3, at: 69 },
  { label: "Optimising composition", sub: "Balancing light, color, and depth", icon: Sliders, at: 76 },
  { label: "Refining pixels", sub: "Precision pass across the full frame", icon: Crosshair, at: 83 },
  { label: "Applying final intelligence", sub: "Last pass of the Ultra AI model", icon: Sparkles, at: 88 },
  { label: "Quality checking result", sub: "Verifying against your instruction", icon: ShieldCheck, at: 92 },
  { label: "Finalising your edit", sub: "Preparing your result", icon: Crown, at: 96 },
];

const NODE_COUNT = 6;
const NODE_ANGLES = Array.from({ length: NODE_COUNT }, (_, i) => (360 / NODE_COUNT) * i);
const CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 3],
  [2, 4],
  [3, 5],
  [0, 4],
];

function polar(radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: 50 + radius * Math.cos(rad), y: 50 + radius * Math.sin(rad) };
}

export type UltraAIGenPhase = "analyzing" | "loading" | "success" | "error";

export function UltraAIImageGenerationOverlay({
  phase,
  progress: externalProgress = 0,
  error = null,
  onRetry,
  onDismiss,
}: {
  phase: UltraAIGenPhase;
  progress?: number;
  error?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const [displayPct, setDisplayPct] = useState(0);
  const [done, setDone] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef<number | null>(null);

  const isError = phase === "error";
  const isComplete = phase === "success";

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

  useEffect(() => {
    if (isError) return;
    if (isComplete) {
      setDisplayPct(100);
      setDone(true);
      return;
    }
    setDone(false);

    const tick = () => {
      const target = Math.min(SOFT_CAP, Math.max(0, externalProgress));
      setDisplayPct((p) => {
        if (p >= target) return Math.min(p, SOFT_CAP);
        const step = Math.max(0.25, (target - p) * 0.14);
        return Math.min(SOFT_CAP, p + step);
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [isComplete, isError, externalProgress]);

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

  const stage = useMemo(() => {
    const found = [...STAGES].reverse().find((s) => displayPct >= s.at);
    return found ?? STAGES[0];
  }, [displayPct]);
  const stageIndex = STAGES.indexOf(stage);
  const StageIcon = done ? CheckCircle2 : stage.icon;
  const ringCirc = 2 * Math.PI * 44;

  if (!mounted || typeof document === "undefined") return null;

  const ui = (
    <div
      className="ultra-ai-overlay fixed left-0 top-0 right-0 bottom-0 z-[9999] flex items-center justify-center overflow-hidden isolation-isolate"
      style={{
        width: "100vw",
        height: "100dvh",
        maxHeight: "100dvh",
        minHeight: "100dvh",
        background: "radial-gradient(130% 100% at 50% 40%, #0D0F16 0%, #08090C 65%, #050608 100%)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
      role="status"
      aria-live="polite"
      aria-busy={!isComplete && !isError}
    >
      {/* Faint lab grid — not chat motifs */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(217,191,122,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(217,191,122,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />
      {!reduceMotion && (
        <>
          <div
            className="ultra-ai-halo pointer-events-none absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
            style={{ background: "#1F6F54" }}
            aria-hidden
          />
          <div
            className="ultra-ai-halo pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[130px]"
            style={{ background: "#6B5B95", opacity: 0.12, animationDelay: "1.5s" }}
            aria-hidden
          />
        </>
      )}

      {isError ? (
        <div className="relative z-10 flex w-full max-w-sm flex-col items-center px-6 text-center">
          <div
            className="mb-5 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "rgba(196,82,46,0.12)", border: "1px solid rgba(196,82,46,0.4)" }}
          >
            <AlertTriangle size={22} color="#D98A6A" strokeWidth={1.8} />
          </div>
          <p
            className="mb-2 text-[10px] font-medium uppercase tracking-[0.25em]"
            style={{ color: "#8a8474", fontFamily: "Inter, system-ui, sans-serif" }}
          >
            Ultra AI
          </p>
          <h1
            className="mb-2 text-[1.5rem] font-semibold"
            style={{ color: "#F4EFE4", fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Ultra AI processing interrupted
          </h1>
          <p className="mb-8 text-sm" style={{ color: "#9199ab", fontFamily: "Inter, system-ui, sans-serif" }}>
            {error || "Something prevented the image from being completed."}
          </p>
          <div className="flex w-full gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"
                style={{
                  background: "linear-gradient(90deg,#D9BF7A,#1F6F54)",
                  color: "#08090C",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                <RotateCw size={15} strokeWidth={2.2} /> Retry
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm"
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "#9199ab",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                <X size={15} strokeWidth={2.2} /> Close
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex w-full max-w-sm flex-col items-center px-6">
          <p
            className="mb-8 text-[10px] font-medium uppercase tracking-[0.25em]"
            style={{ color: "#8a8474", fontFamily: "Inter, system-ui, sans-serif" }}
          >
            MOTIO2EDIT · Ultra AI
          </p>

          {/* AI Core */}
          <div
            className="relative mb-8"
            style={{ width: "clamp(200px, 55vw, 260px)", height: "clamp(200px, 55vw, 260px)" }}
          >
            <div
              className={`absolute inset-[-14%] rounded-full blur-2xl ${!reduceMotion ? "ultra-ai-halo" : ""}`}
              style={{ background: done ? "#1F6F54" : "#D9BF7A", opacity: 0.18 }}
            />

            <svg
              className={`absolute inset-0 ${!reduceMotion ? "ultra-ai-spin-ccw" : ""}`}
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle
                cx="50"
                cy="50"
                r="47"
                fill="none"
                stroke="#2FAE82"
                strokeOpacity="0.35"
                strokeWidth="0.6"
                strokeDasharray="2 4"
              />
            </svg>

            <svg className="absolute inset-0" viewBox="0 0 100 100" aria-hidden>
              {CONNECTIONS.map(([a, b], i) => {
                const p1 = polar(34, NODE_ANGLES[a]);
                const p2 = polar(34, NODE_ANGLES[b]);
                const reveal = displayPct >= 14 + i * 12;
                return (
                  <line
                    key={i}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#D9BF7A"
                    strokeWidth="0.35"
                    style={{ opacity: reveal ? 0.45 : 0, transition: "opacity 0.8s ease" }}
                  />
                );
              })}
              {NODE_ANGLES.map((ang, i) => {
                const p = polar(34, ang);
                const reveal = displayPct >= 10 + i * 8;
                return (
                  <circle
                    key={i}
                    className={!reduceMotion ? "ultra-ai-node" : undefined}
                    cx={p.x}
                    cy={p.y}
                    r={reveal ? 1.6 : 0}
                    fill={i % 2 === 0 ? "#D9BF7A" : "#2FAE82"}
                    style={{ transition: "r 0.5s ease", animationDelay: `${i * 0.3}s` }}
                  />
                );
              })}
            </svg>

            <svg
              className={`absolute inset-0 ${!reduceMotion ? "ultra-ai-sweep" : ""}`}
              viewBox="0 0 100 100"
              style={{ opacity: Math.max(0.15, 0.6 - displayPct / 140) }}
              aria-hidden
            >
              <path
                d="M 50 6 A 44 44 0 0 1 88 34"
                fill="none"
                stroke="#D9BF7A"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>

            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.4" />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="url(#ultraAICoreGrad)"
                strokeWidth="2.4"
                strokeDasharray={`${(displayPct / 100) * ringCirc} ${ringCirc}`}
                strokeLinecap="round"
                style={{ transition: reduceMotion ? undefined : "stroke-dasharray 0.12s linear" }}
              />
              <defs>
                <linearGradient id="ultraAICoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D9BF7A" />
                  <stop offset="55%" stopColor="#E8CB86" />
                  <stop offset="100%" stopColor="#2FAE82" />
                </linearGradient>
              </defs>
            </svg>

            <div
              className={`absolute inset-[16%] rounded-full ${!reduceMotion ? "ultra-ai-spin-cw" : ""}`}
              style={{
                border: "1px solid transparent",
                borderTopColor: "rgba(217,191,122,0.4)",
                borderRightColor: "rgba(47,174,130,0.25)",
              }}
            />

            <div
              className={`absolute inset-0 flex flex-col items-center justify-center ${done && !reduceMotion ? "ultra-ai-final" : ""}`}
            >
              <div
                key={stageIndex}
                className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full ${!reduceMotion ? "ultra-ai-stage-in" : ""}`}
                style={{
                  background: "rgba(217,191,122,0.1)",
                  border: "1px solid rgba(217,191,122,0.3)",
                }}
              >
                <StageIcon size={16} color={done ? "#2FAE82" : "#E8CB86"} strokeWidth={1.8} />
              </div>
              <span
                className="tabular-nums"
                style={{
                  color: "#F4EFE4",
                  fontSize: "1.7rem",
                  letterSpacing: "0.03em",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                {Math.floor(displayPct)}%
              </span>
            </div>
          </div>

          <div
            key={stageIndex}
            className={`mb-8 text-center ${!reduceMotion ? "ultra-ai-stage-in" : ""}`}
            style={{ minHeight: "62px" }}
          >
            <h1
              className="mb-1.5 uppercase tracking-wide"
              style={{
                color: "#F4EFE4",
                fontSize: "1.15rem",
                letterSpacing: "0.04em",
                fontFamily: "Georgia, 'Times New Roman', serif",
              }}
            >
              {done ? "Ultra AI edit complete" : stage.label}
            </h1>
            <p className="text-xs" style={{ color: "#8a8fa3", fontFamily: "Inter, system-ui, sans-serif" }}>
              {done ? "Your Ultra AI edit is ready" : stage.sub}
            </p>
          </div>

          <p
            className="mb-6 text-[10px] font-medium uppercase tracking-[0.2em]"
            style={{ color: "#565e70", fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {done ? "Complete" : "Ultra AI processing"}
          </p>

          {!done && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full px-6 py-2.5 text-xs"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#7b8299",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );

  return createPortal(ui, document.body);
}
