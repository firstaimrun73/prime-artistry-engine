/**
 * Circle to Add visual demo — deer placement sequence.
 * CSS/React only. Used inside What's New Add card.
 * Media: absolute public URLs on assets.motio2edit.com.
 * Pattern: BEFORE → object icon → brush selection → Generate → moving dots → AFTER.
 */
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CIRCLE_ADD_DEER } from "@/lib/r2-catalog";

type DemoPhase =
  | "intro"
  | "icon"
  | "brush"
  | "generate"
  | "processing"
  | "result";

const PHASE_MS: Record<DemoPhase, number> = {
  intro: 1600,
  icon: 1400,
  brush: 2200,
  generate: 900,
  processing: 2800,
  result: 3600,
};

const ORDER: DemoPhase[] = ["intro", "icon", "brush", "generate", "processing", "result"];

function DeerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden
    >
      <ellipse cx="24" cy="30" rx="12" ry="10" fill="currentColor" opacity="0.9" />
      <circle cx="24" cy="18" r="7" fill="currentColor" />
      <path
        d="M18 14c-2-4-4-6-6-7M30 14c2-4 4-6 6-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M16 12c1-2 2-3 3-3.5M32 12c-1-2-2-3-3-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="21.5" cy="17" r="1.2" fill="#1A1C24" />
      <circle cx="26.5" cy="17" r="1.2" fill="#1A1C24" />
    </svg>
  );
}

function MovingDots() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-[#7B6FE0]"
          style={{
            animation: `c2d-add-dot 1.05s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function CircleAddHeroDemo() {
  const [phase, setPhase] = useState<DemoPhase>("intro");
  const [ready, setReady] = useState(false);
  const [pct, setPct] = useState(0);

  const urls = useMemo(
    () => ({
      before: CIRCLE_ADD_DEER.before,
      after: CIRCLE_ADD_DEER.after,
    }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;
    const mark = () => {
      loaded += 1;
      if (!cancelled && loaded >= 2) setReady(true);
    };
    const imgs = [urls.before, urls.after].map((src) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = mark;
      im.onerror = mark;
      im.src = src;
      return im;
    });
    const fallback = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 5000);
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      imgs.forEach((im) => {
        im.onload = null;
        im.onerror = null;
      });
    };
  }, [urls.before, urls.after]);

  useEffect(() => {
    const ms = PHASE_MS[phase];
    const t = window.setTimeout(() => {
      const i = ORDER.indexOf(phase);
      setPhase(ORDER[(i + 1) % ORDER.length]);
    }, ms);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "processing") {
      setPct(0);
      return;
    }
    setPct(8);
    const start = performance.now();
    const dur = PHASE_MS.processing - 150;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setPct(8 + (1 - Math.pow(1 - p, 2)) * 90);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const showResult = phase === "result";
  const showIcon = phase === "icon" || phase === "brush";
  const showBrush = phase === "brush";
  const showGenLabel = phase === "generate";
  const showProcess = phase === "processing";

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" data-circle-add-demo="deer">
      <style>{`
        @keyframes c2d-add-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes c2d-add-pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes c2d-add-ring {
          0% { transform: scale(0.85); opacity: 0.9; }
          100% { transform: scale(1.25); opacity: 0; }
        }
      `}</style>

      {!ready && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#E8E4FF] via-[#F4F1FF] to-[#DDD6FE]"
          aria-hidden
        />
      )}

      <img
        src={urls.before}
        alt="Before — forest clearing"
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
          showResult ? "opacity-0" : "opacity-100",
        )}
        draggable={false}
        decoding="async"
      />

      <img
        src={urls.after}
        alt="After — deer added"
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
          showResult ? "opacity-100" : "opacity-0",
        )}
        draggable={false}
        decoding="async"
      />

      {/* Tiny object icon */}
      {showIcon && (
        <div className="pointer-events-none absolute left-1/2 top-[42%] z-20 -translate-x-1/2 -translate-y-1/2">
          <div
            className={cn(
              "grid h-12 w-12 place-items-center rounded-2xl border-2 border-white/90 bg-black/45 text-white shadow-lg backdrop-blur-sm",
              showBrush && "opacity-90",
            )}
            style={{ animation: showBrush ? undefined : "c2d-add-pulse 1.4s ease-in-out infinite" }}
          >
            <DeerIcon className="h-7 w-7 text-white" />
          </div>
        </div>
      )}

      {/* Brush / selection ring */}
      {showBrush && (
        <div className="pointer-events-none absolute left-1/2 top-[42%] z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-24 w-24">
            <span
              className="absolute inset-0 rounded-full border-[3px] border-[#7B6FE0]/80"
              style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.18)" }}
            />
            <span
              className="absolute inset-[-6px] rounded-full border-2 border-dashed border-white/70"
              style={{ animation: "c2d-add-ring 1.6s ease-out infinite" }}
            />
          </div>
        </div>
      )}

      {/* Generate label */}
      {showGenLabel && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
          <span className="rounded-full bg-[#7B6FE0] px-4 py-2 text-[13px] font-bold tracking-wide text-white shadow-lg">
            Generate
          </span>
        </div>
      )}

      {/* Processing: black + lavender dots */}
      {showProcess && (
        <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-[2px]">
          <MovingDots />
          <p className="text-[13px] font-semibold tracking-wide text-white">Placing object</p>
          <p className="text-[12px] font-medium tabular-nums text-white/80">{Math.round(pct)}%</p>
        </div>
      )}

      {showResult && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/55 to-transparent px-4 pb-3 pt-10">
          <p className="text-[13px] font-semibold text-white">Deer added</p>
        </div>
      )}

      {/* Accent label */}
      <span className="pointer-events-none absolute left-2.5 top-2.5 z-30 rounded-full bg-[#7B6FE0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        Circle to Add
      </span>
    </div>
  );
}
