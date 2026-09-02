/**
 * Premium Circle Remove visual demo — Giza people-removal sequence.
 * CSS/React only (no canvas). Used inside RemoveHeroCard image area.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import stage1 from "@/lib/circle-edit/demo-media/giza-stage1";
import stage2 from "@/lib/circle-edit/demo-media/giza-stage2";
import stage3 from "@/lib/circle-edit/demo-media/giza-stage3";

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
  intro: 1600,
  tools: 900,
  selectBrush: 1100,
  paint: 3200,
  selectErase: 1000,
  analysing: 1600,
  removing: 1600,
  generating: 1600,
  result: 3200,
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
          ? "scale-110 border-[#7B6FE0] bg-[#7B6FE0] text-white shadow-[0_0_16px_rgba(123,111,224,0.55)]"
          : "border-white/40 bg-black/35 text-white",
        pulse && "animate-pulse",
      )}
      aria-hidden
    >
      {kind === "circle" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
      {kind === "brush" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 20c2-1 3.5-2.2 5-4.5 3.5 2 6.5 2.2 9.5-1.2L15 10.5 8.5 17C7 18.8 5.5 19.5 4 20Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path d="M14.2 6.2l3.6 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12.5 8l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        </svg>
      )}
      {kind === "eraser" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 15.5L14.5 8l3.5 3.5-5.2 5.2H9.2L7 15.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M9 17.5h7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

export function CircleRemoveHeroDemo() {
  const [phase, setPhase] = useState<DemoPhase>("intro");
  const [pct, setPct] = useState(0);
  const [paintT, setPaintT] = useState(0);

  useEffect(() => {
    const ms = PHASE_MS[phase];
    const t = window.setTimeout(() => {
      const i = ORDER.indexOf(phase);
      setPhase(ORDER[(i + 1) % ORDER.length]);
    }, ms);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "analysing" && phase !== "removing" && phase !== "generating") {
      setPct(0);
      return;
    }
    setPct(0);
    const start = performance.now();
    const dur = PHASE_MS[phase] - 120;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 2.2);
      setPct(eased * 100);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase !== "paint") {
      setPaintT(0);
      return;
    }
    const start = performance.now();
    const dur = PHASE_MS.paint - 200;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setPaintT(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const showTools = phase === "tools" || phase === "selectBrush" || phase === "paint" || phase === "selectErase";
  const brushActive = phase === "selectBrush" || phase === "paint";
  const eraseActive = phase === "selectErase";
  const showHand = phase === "selectBrush" || phase === "paint" || phase === "selectErase";
  const showProcess = phase === "analysing" || phase === "removing" || phase === "generating";
  const showResult = phase === "result";

  const handPos =
    phase === "selectBrush"
      ? { left: "72%", top: "18%" }
      : phase === "paint"
        ? { left: `${18 + paintT * 55}%`, top: `${55 + Math.sin(paintT * Math.PI * 2) * 8}%` }
        : phase === "selectErase"
          ? { left: "86%", top: "18%" }
          : { left: "50%", top: "50%" };

  const processKind =
    phase === "analysing" ? "analysing" : phase === "removing" ? "removing" : "generating";
  const processLabel =
    phase === "analysing" ? "ANALYSING" : phase === "removing" ? "REMOVING" : "GENERATING";

  const maskReveal = phase === "paint" ? paintT : phase === "selectErase" || showProcess ? 1 : 0;

  return (
    <div className="absolute inset-0 overflow-hidden" data-circle-remove-demo="giza">
      <style>{`
        @keyframes c2d-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes c2d-pulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes c2d-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      `}</style>

      <img
        src={stage1}
        alt="Original scene"
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
          showResult ? "opacity-0" : "opacity-100",
        )}
        draggable={false}
      />

      <img
        src={stage2}
        alt="Masked selection"
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
          showResult ? "opacity-0" : "opacity-100",
        )}
        style={{
          clipPath:
            maskReveal <= 0
              ? "inset(100% 0 0 0)"
              : phase === "paint"
                ? `inset(${Math.max(0, 55 - paintT * 45)}% ${Math.max(0, 20 - paintT * 15)}% ${Math.max(0, 5 - paintT * 5)}% ${Math.max(0, 5 - paintT * 5)}%)`
                : "inset(0 0 0 0)",
          transition: phase === "paint" ? "none" : "clip-path 0.4s ease",
        }}
        draggable={false}
      />

      <img
        src={stage3}
        alt="People removed"
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
          showResult ? "opacity-100" : "opacity-0",
        )}
        draggable={false}
      />

      {phase === "paint" && (
        <div
          className="pointer-events-none absolute z-20 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 bg-[rgba(180,160,230,0.28)] shadow-[0_0_12px_rgba(123,111,224,0.4)]"
          style={{ left: handPos.left, top: handPos.top }}
        />
      )}

      {showTools && (
        <div className="pointer-events-none absolute right-2 top-12 z-20 flex flex-col gap-2 sm:right-3 sm:top-14">
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
          className="transition-all duration-500 ease-out"
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
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/55 to-transparent px-4 pb-3 pt-10">
          <p className="text-[13px] font-semibold text-white">People removed</p>
        </div>
      )}
    </div>
  );
}
