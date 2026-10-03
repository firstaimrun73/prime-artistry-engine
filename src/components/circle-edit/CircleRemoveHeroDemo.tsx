/**
 * Premium Circle Remove visual demo — Giza people-removal sequence.
 * CSS/React only (no canvas). Used inside RemoveHeroCard image area.
 *
 * Media: absolute public URLs on assets.motio2edit.com (circle-2edit sample set).
 * Paint path tightly circles the crowd at the base of the pyramid.
 * Cleaner hand cursor + smoother paint animation.
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type DemoPhase =
  | "intro"
  | "tools"
  | "selectBrush"
  | "paint"
  | "selectErase"
  | "analysing"
  | "removing"
  | "generating"
  | "result";

const PHASE_MS: Record<DemoPhase, number> = {
  intro: 1200,
  tools: 700,
  selectBrush: 900,
  paint: 3200,
  selectErase: 800,
  analysing: 1400,
  removing: 1400,
  generating: 1400,
  result: 2600,
};

const ORDER: DemoPhase[] = [
  "intro",
  "tools",
  "selectBrush",
  "paint",
  "selectErase",
  "analysing",
  "removing",
  "generating",
  "result",
];

/**
 * Homepage Circle 2edit Remove hero card media (public assets.motio2edit.com).
 * Sequence: original → marked selection → clean result → loop.
 */
const DEMO_STAGE_URLS = {
  stage1:
    "https://assets.motio2edit.com/samples/circle-2edit/file_0000000091d081f585ff54de9335198f.png",
  stage2:
    "https://assets.motio2edit.com/samples/circle-2edit/file_00000000ab9082089ae984430379abed.png",
  stage3:
    "https://assets.motio2edit.com/samples/circle-2edit/file_000000004e6481faa6caad771de9c84c.png",
} as const;

/**
 * Tight oval path around the crowd at the base of the pyramid (lower half of frame).
 * Coordinates are % of the media box; calibrated to the Giza sample.
 */
const PAINT_PATH: { x: number; y: number; r: number }[] = [
  { x: 28, y: 72, r: 10 },
  { x: 34, y: 78, r: 11 },
  { x: 42, y: 82, r: 12 },
  { x: 52, y: 84, r: 12 },
  { x: 62, y: 82, r: 11 },
  { x: 70, y: 76, r: 11 },
  { x: 74, y: 68, r: 10 },
  { x: 72, y: 58, r: 10 },
  { x: 66, y: 52, r: 11 },
  { x: 56, y: 50, r: 12 },
  { x: 46, y: 52, r: 11 },
  { x: 36, y: 56, r: 11 },
  { x: 30, y: 62, r: 10 },
  { x: 28, y: 68, r: 10 },
  { x: 32, y: 74, r: 11 },
  { x: 40, y: 80, r: 11 },
  { x: 50, y: 82, r: 12 },
  { x: 58, y: 80, r: 11 },
  { x: 64, y: 74, r: 10 },
  { x: 68, y: 66, r: 10 },
];

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
        "grid h-9 w-9 place-items-center rounded-full border shadow-md backdrop-blur-md transition-all duration-300",
        active
          ? "scale-110 border-[#7B6FE0] bg-[#7B6FE0] text-white shadow-[0_0_18px_rgba(123,111,224,0.7)]"
          : "border-white/40 bg-black/35 text-white",
        pulse && "animate-pulse",
      )}
      aria-hidden
    >
      {kind === "circle" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      )}
      {kind === "brush" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 20c2-1 3.5-2.2 5-4.5 3.5 2 6.5 2.2 9.5-1.2L15 10.5 8.5 17C7 18.8 5.5 19.5 4 20Z"
            fill="currentColor"
            opacity="0.95"
          />
          <path d="M14.2 6.2l3.6 3.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {kind === "eraser" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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

/** Clean pointing-hand cursor (simpler silhouette, clearer tip). */
function HandCursor({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("pointer-events-none absolute z-30", className)} style={style} aria-hidden>
      <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
        <path
          d="M10.5 14.5V7.2a2 2 0 0 1 4 0V13.5M14.5 13V6.2a2 2 0 0 1 4 0V13.8M18.5 13.5v-4.2a2 2 0 0 1 4 0V16M22.5 16.2v-1.8a2 2 0 0 1 3.2 1.6c0 1.1-.2 4-1.3 6.7C23.2 26 21.4 28.2 16.5 28.2c-3.8 0-6.5-1.4-8.1-3.8-1.4-2-2.1-4.2-2.5-5.9L5.2 15.2a1.8 1.8 0 0 1 3.2-1.6l2.1 2.9"
          fill="#fff"
          stroke="#1A1C24"
          strokeWidth="1.35"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Tip highlight so the paint origin is obvious */}
        <circle cx="12.5" cy="6.5" r="2.2" fill="#7B6FE0" opacity="0.9" />
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
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="relative grid h-12 w-12 place-items-center">
        {kind === "analysing" && (
          <svg width="40" height="40" viewBox="0 0 48 48" className="text-[#7B6FE0]">
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
          <svg width="40" height="40" viewBox="0 0 48 48" className="text-[#7B6FE0]">
            <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
            <path
              d="M16 24h16"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ animation: "c2d-pulse 1s ease-in-out infinite" }}
            />
          </svg>
        )}
        {kind === "generating" && (
          <svg width="40" height="40" viewBox="0 0 48 48" className="text-[#7B6FE0]">
            <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
            <path
              d="M24 12v6M24 30v6M12 24h6M30 24h6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ transformOrigin: "24px 24px", animation: "c2d-spin 2s linear infinite" }}
            />
            <circle cx="24" cy="24" r="3.5" fill="currentColor" />
          </svg>
        )}
      </div>
      <p className="text-[13px] font-extrabold tracking-wide text-[#1A1C24]">{label}</p>
      <p className="text-[12px] font-semibold tabular-nums text-[#5C6170]">{Math.round(pct)}%</p>
    </div>
  );
}

export function CircleRemoveHeroDemo() {
  const [phase, setPhase] = useState<DemoPhase>("intro");
  const [pct, setPct] = useState(0);
  const [paintT, setPaintT] = useState(0);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);

  const urls = useMemo(
    () => ({
      stage1: DEMO_STAGE_URLS.stage1,
      stage2: DEMO_STAGE_URLS.stage2,
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
      if (!cancelled && loaded >= 3) setReady(true);
    };
    const imgs = [urls.stage1, urls.stage2, urls.stage3].map((src) => {
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
  }, [urls.stage1, urls.stage2, urls.stage3]);

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
    if (phase !== "paint") {
      if (phase === "intro" || phase === "tools" || phase === "selectBrush") setPaintT(0);
      else if (
        phase === "selectErase" ||
        phase === "analysing" ||
        phase === "removing" ||
        phase === "generating" ||
        phase === "result"
      )
        setPaintT(1);
      return;
    }
    if (reduced) {
      setPaintT(1);
      return;
    }
    const start = performance.now();
    const dur = PHASE_MS.paint - 150;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      // Smooth ease-in-out so the hand doesn't jump
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setPaintT(eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reduced]);

  const showTools =
    phase === "tools" || phase === "selectBrush" || phase === "paint" || phase === "selectErase";
  const brushActive = phase === "selectBrush" || phase === "paint";
  const eraseActive = phase === "selectErase";
  const showHand = phase === "selectBrush" || phase === "paint" || phase === "selectErase";
  const showProcess = phase === "analysing" || phase === "removing" || phase === "generating";
  const showResult = phase === "result";
  const showMarked =
    phase === "selectErase" ||
    phase === "analysing" ||
    phase === "removing" ||
    phase === "generating";

  const paintIdx = Math.min(PAINT_PATH.length - 1, Math.floor(paintT * PAINT_PATH.length));
  const handPt = PAINT_PATH[paintIdx]!;
  const handPos =
    phase === "selectBrush"
      ? { left: "78%", top: "22%" }
      : phase === "paint"
        ? { left: `${handPt.x}%`, top: `${handPt.y}%` }
        : phase === "selectErase"
          ? { left: "78%", top: "28%" }
          : { left: "50%", top: "50%" };

  const processKind =
    phase === "analysing" ? "analysing" : phase === "removing" ? "removing" : "generating";
  const processLabel =
    phase === "analysing" ? "ANALYSING" : phase === "removing" ? "REMOVING" : "GENERATING";

  const visibleDots = PAINT_PATH.slice(0, paintIdx + 1);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" data-circle-remove-demo="giza">
      <style>{`
        @keyframes c2d-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes c2d-pulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes c2d-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
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
          showResult || showMarked ? "opacity-0" : "opacity-100",
        )}
        draggable={false}
        decoding="async"
      />

      <img
        src={urls.stage2}
        alt="Marked selection"
        className={cn(
          "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500",
          showMarked && !showResult ? "opacity-100" : "opacity-0",
        )}
        draggable={false}
        decoding="async"
      />

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

      {phase === "paint" && !showResult && (
        <svg
          className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {visibleDots.map((d, i) => (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={d.r * 0.38}
              fill="rgba(123, 111, 224, 0.6)"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth="0.45"
            />
          ))}
        </svg>
      )}

      {showTools && (
        <div className="pointer-events-none absolute right-2 top-12 z-20 flex flex-col gap-1.5 sm:right-3 sm:top-14">
          <div style={{ animation: "c2d-float 2.4s ease-in-out infinite" }}>
            <ToolIcon kind="circle" />
          </div>
          <div style={{ animation: "c2d-float 2.4s ease-in-out 0.15s infinite" }}>
            <ToolIcon kind="brush" active={brushActive} pulse={phase === "selectBrush"} />
          </div>
          <div style={{ animation: "c2d-float 2.4s ease-in-out 0.3s infinite" }}>
            <ToolIcon kind="eraser" active={eraseActive} pulse={phase === "selectErase"} />
          </div>
        </div>
      )}

      {showHand && (
        <HandCursor
          className="transition-[left,top] duration-60 ease-linear"
          style={{
            left: handPos.left,
            top: handPos.top,
            transform: "translate(-30%, -15%)",
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
