/**
 * Premium Circle Remove visual demo — Giza people-removal sequence.
 * Hand draws an IRREGULAR organic selection (not a perfect circle),
 * lavender fill grows inside as the path closes, then removal result.
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type DemoPhase =
  | "intro"
  | "tools"
  | "selectBrush"
  | "draw"
  | "pulse"
  | "analysing"
  | "removing"
  | "generating"
  | "result";

const PHASE_MS: Record<DemoPhase, number> = {
  intro: 1200,
  tools: 700,
  selectBrush: 900,
  draw: 4200,
  pulse: 700,
  analysing: 1400,
  removing: 1400,
  generating: 1400,
  result: 3800,
};

const ORDER: DemoPhase[] = [
  "intro",
  "tools",
  "selectBrush",
  "draw",
  "pulse",
  "analysing",
  "removing",
  "generating",
  "result",
];

const DEMO_STAGE_URLS = {
  stage1:
    "https://assets.motio2edit.com/samples/circle-2edit/file_0000000091d081f585ff54de9335198f.png",
  stage3:
    "https://assets.motio2edit.com/samples/circle-2edit/file_000000004e6481faa6caad771de9c84c.png",
} as const;

/**
 * Irregular hand-drawn path around subject (viewBox 0–100).
 * Starts at A (bottom-left-ish), wanders organically, closes at B ≈ A.
 * NOT a perfect circle — slight wobbles like a finger/stylus mark.
 */
const HAND_PATH =
  "M 22 68 " +
  "C 18 55, 20 40, 28 28 " +
  "C 36 16, 48 12, 58 14 " +
  "C 70 16, 80 24, 84 36 " +
  "C 88 48, 86 60, 80 70 " +
  "C 74 80, 62 86, 50 84 " +
  "C 38 82, 28 78, 22 68 Z";

/** Approximate path length for stroke-dasharray (viewBox units). */
const PATH_LEN = 280;

function ToolIcon({
  kind,
  active,
  pulse,
}: {
  kind: "circle" | "brush" | "eraser";
  active?: boolean;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full border shadow-md backdrop-blur-md transition-all duration-300",
        active
          ? "scale-110 border-[#7B6FE0] bg-[#7B6FE0] text-white shadow-[0_0_22px_rgba(123,111,224,0.75)]"
          : "border-white/40 bg-black/35 text-white",
        pulse && "animate-pulse",
      )}
      aria-hidden
    >
      {kind === "circle" && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      )}
      {kind === "brush" && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 20c2-1 3.5-2.2 5-4.5 3.5 2 6.5 2.2 9.5-1.2L15 10.5 8.5 17C7 18.8 5.5 19.5 4 20Z"
            fill="currentColor"
            opacity="0.95"
          />
          <path d="M14.2 6.2l3.6 3.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12.5 8l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
        </svg>
      )}
      {kind === "eraser" && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 15.5L14.5 8l3.5 3.5-5.2 5.2H9.2L7 15.5Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path d="M9 17.5h7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

function HandCursor({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("pointer-events-none absolute z-30", className)} style={style} aria-hidden>
      <svg width="36" height="40" viewBox="0 0 36 40" fill="none">
        <path
          d="M12 18V9.5a2.2 2.2 0 0 1 4.4 0V17M16.4 16.5V8.2a2.2 2.2 0 0 1 4.4 0V17M20.8 16.8v-5.2a2.2 2.2 0 0 1 4.4 0V19M25.2 19.2v-2.4a2.2 2.2 0 0 1 3.6 1.7c0 1.2-.2 4.4-1.4 7.4C26 29.5 24 32 18.5 32c-4.2 0-7.2-1.6-9-4.2-1.5-2.2-2.3-4.6-2.8-6.5L6 18.5a2 2 0 0 1 3.5-1.8l2.5 3.2"
          fill="white"
          stroke="#1A1C24"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function ProcessCenter({
  label,
  pct,
  kind,
}: {
  label: string;
  pct: number;
  kind: "analysing" | "removing" | "generating";
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative grid h-14 w-14 place-items-center">
        {kind === "analysing" && (
          <svg width="48" height="48" viewBox="0 0 48 48" className="text-[#7B6FE0]">
            <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
            <circle
              cx="24"
              cy="24"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray="40 80"
              strokeLinecap="round"
              style={{ transformOrigin: "24px 24px", animation: "c2d-spin 1.1s linear infinite" }}
            />
            <circle cx="24" cy="24" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="24" cy="24" r="2" fill="currentColor" />
          </svg>
        )}
        {kind === "removing" && (
          <svg width="48" height="48" viewBox="0 0 48 48" className="text-[#7B6FE0]">
            <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
            <path
              d="M16 24h16"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ animation: "c2d-pulse 1s ease-in-out infinite" }}
            />
            <path
              d="M20 18l-4 6 4 6M28 18l4 6-4 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          </svg>
        )}
        {kind === "generating" && (
          <svg width="48" height="48" viewBox="0 0 48 48" className="text-[#7B6FE0]">
            <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
            <path
              d="M24 12v6M24 30v6M12 24h6M30 24h6M15.5 15.5l4 4M28.5 28.5l4 4M32.5 15.5l-4 4M19.5 28.5l-4 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ transformOrigin: "24px 24px", animation: "c2d-spin 2s linear infinite" }}
            />
            <circle cx="24" cy="24" r="3.5" fill="currentColor" />
          </svg>
        )}
      </div>
      <p className="text-[15px] font-extrabold tracking-wide text-[#1A1C24] sm:text-[16px]">{label}</p>
      <p className="text-[13px] font-semibold tabular-nums text-[#5C6170]">{Math.round(pct)}%</p>
    </div>
  );
}

const HAND_SAMPLES: { x: number; y: number }[] = [
  { x: 22, y: 68 },
  { x: 19, y: 58 },
  { x: 20, y: 46 },
  { x: 24, y: 34 },
  { x: 32, y: 24 },
  { x: 42, y: 16 },
  { x: 52, y: 13 },
  { x: 62, y: 15 },
  { x: 72, y: 20 },
  { x: 80, y: 28 },
  { x: 84, y: 38 },
  { x: 86, y: 50 },
  { x: 84, y: 60 },
  { x: 78, y: 70 },
  { x: 68, y: 80 },
  { x: 56, y: 84 },
  { x: 44, y: 82 },
  { x: 32, y: 76 },
  { x: 24, y: 70 },
  { x: 22, y: 68 },
];

function sampleHand(t: number): { x: number; y: number } {
  const n = HAND_SAMPLES.length - 1;
  const i = Math.min(n - 1, Math.max(0, Math.floor(t * n)));
  const local = t * n - i;
  const a = HAND_SAMPLES[i]!;
  const b = HAND_SAMPLES[i + 1]!;
  return {
    x: a.x + (b.x - a.x) * local,
    y: a.y + (b.y - a.y) * local,
  };
}

export function CircleRemoveHeroDemo() {
  const [phase, setPhase] = useState<DemoPhase>("intro");
  const [pct, setPct] = useState(0);
  const [drawT, setDrawT] = useState(0);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);

  const urls = useMemo(
    () => ({
      stage1: DEMO_STAGE_URLS.stage1,
      stage3: DEMO_STAGE_URLS.stage3,
    }),
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;
    const mark = () => {
      loaded += 1;
      if (!cancelled && loaded >= 2) setReady(true);
    };
    const imgs = [urls.stage1, urls.stage3].map((src) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = mark;
      im.onerror = mark;
      im.src = src;
      return im;
    });
    const fallback = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 6000);
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      imgs.forEach((im) => {
        im.onload = null;
        im.onerror = null;
      });
    };
  }, [urls.stage1, urls.stage3]);

  useEffect(() => {
    const ms = reduced ? Math.min(PHASE_MS[phase], 600) : PHASE_MS[phase];
    const t = window.setTimeout(() => {
      const i = ORDER.indexOf(phase);
      setPhase(ORDER[(i + 1) % ORDER.length]!);
    }, ms);
    return () => window.clearTimeout(t);
  }, [phase, reduced]);

  useEffect(() => {
    if (phase !== "analysing" && phase !== "removing" && phase !== "generating") {
      setPct(0);
      return;
    }
    setPct(0);
    const start = performance.now();
    const dur = (reduced ? 400 : PHASE_MS[phase]) - 80;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setPct((1 - Math.pow(1 - p, 2.2)) * 100);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reduced]);

  useEffect(() => {
    if (phase !== "draw") {
      if (phase === "intro" || phase === "tools" || phase === "selectBrush") setDrawT(0);
      else if (phase === "pulse" || phase === "analysing" || phase === "removing" || phase === "generating")
        setDrawT(1);
      return;
    }
    if (reduced) {
      setDrawT(1);
      return;
    }
    const start = performance.now();
    const dur = PHASE_MS.draw - 200;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setDrawT(eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reduced]);

  const showTools =
    phase === "tools" || phase === "selectBrush" || phase === "draw" || phase === "pulse";
  const brushActive = phase === "selectBrush" || phase === "draw" || phase === "pulse";
  const showHand = phase === "selectBrush" || phase === "draw";
  const showProcess = phase === "analysing" || phase === "removing" || phase === "generating";
  const showResult = phase === "result";
  const showSelection =
    phase === "draw" ||
    phase === "pulse" ||
    phase === "analysing" ||
    phase === "removing" ||
    phase === "generating";

  const handPt = sampleHand(drawT);
  const handPos =
    phase === "selectBrush"
      ? { left: "72%", top: "18%" }
      : phase === "draw"
        ? { left: `${handPt.x}%`, top: `${handPt.y}%` }
        : { left: "50%", top: "50%" };

  const processKind =
    phase === "analysing" ? "analysing" : phase === "removing" ? "removing" : "generating";
  const processLabel =
    phase === "analysing" ? "ANALYSING" : phase === "removing" ? "REMOVING" : "GENERATING";

  const dashOffset = PATH_LEN * (1 - drawT);
  const fillOpacity = drawT > 0.85 ? Math.min(1, (drawT - 0.85) / 0.15) * 0.42 : 0;
  const strokeComplete = drawT >= 0.98 || phase === "pulse";

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" data-circle-remove-demo="giza">
      <style>{`
        @keyframes c2d-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes c2d-pulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes c2d-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes c2d-sel-pulse {
          0%,100% { filter: drop-shadow(0 0 4px rgba(123,111,224,0.4)); }
          50% { filter: drop-shadow(0 0 12px rgba(123,111,224,0.85)); }
        }
      `}</style>

      {!ready && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#E8E4FF] via-[#F4F1FF] to-[#DDD6FE]"
          aria-hidden
        />
      )}

      <img
        src={urls.stage1}
        alt="Original scene"
        className={cn(
          "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700",
          showResult ? "opacity-0" : "opacity-100",
        )}
        draggable={false}
        decoding="async"
      />

      {showSelection && !showResult && (
        <svg
          className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
          style={{
            animation: phase === "pulse" ? "c2d-sel-pulse 0.7s ease-in-out" : undefined,
          }}
        >
          <path
            d={HAND_PATH}
            fill="rgba(123, 111, 224, 0.38)"
            stroke="none"
            style={{
              opacity:
                phase === "pulse" ||
                phase === "analysing" ||
                phase === "removing" ||
                phase === "generating"
                  ? 0.42
                  : fillOpacity,
              transition: reduced ? "none" : "opacity 0.15s linear",
            }}
          />
          <path
            d={HAND_PATH}
            fill="none"
            stroke="#7B6FE0"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={PATH_LEN}
            strokeDashoffset={strokeComplete ? 0 : dashOffset}
            vectorEffect="non-scaling-stroke"
            style={{
              filter: "drop-shadow(0 0 3px rgba(255,255,255,0.9))",
            }}
          />
          <path
            d={HAND_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={PATH_LEN}
            strokeDashoffset={strokeComplete ? 0 : dashOffset}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      <img
        src={urls.stage3}
        alt="People removed"
        className={cn(
          "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700",
          showResult ? "opacity-100" : "opacity-0",
        )}
        draggable={false}
        decoding="async"
      />

      {showTools && (
        <div className="pointer-events-none absolute right-2 top-12 z-20 flex flex-col gap-2 sm:right-3 sm:top-14">
          <div style={{ animation: "c2d-float 2.4s ease-in-out infinite" }}>
            <ToolIcon kind="circle" />
          </div>
          <div style={{ animation: "c2d-float 2.4s ease-in-out 0.15s infinite" }}>
            <ToolIcon kind="brush" active={brushActive} pulse={phase === "selectBrush"} />
          </div>
          <div style={{ animation: "c2d-float 2.4s ease-in-out 0.3s infinite" }}>
            <ToolIcon kind="eraser" />
          </div>
        </div>
      )}

      {showHand && (
        <HandCursor
          className="transition-[left,top] duration-75 ease-linear"
          style={{
            left: handPos.left,
            top: handPos.top,
            transform: "translate(-20%, -10%)",
          }}
        />
      )}

      {showProcess && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-white/65 backdrop-blur-[3px]">
          <ProcessCenter label={processLabel} pct={pct} kind={processKind} />
        </div>
      )}

      {showResult && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/45 to-transparent px-3 pb-2 pt-5">
          <p className="text-[12px] font-semibold text-white">People removed</p>
        </div>
      )}
    </div>
  );
}
