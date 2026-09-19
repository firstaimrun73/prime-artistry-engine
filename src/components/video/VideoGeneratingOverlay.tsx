/**
 * In-canvas generation state — breathing dot + Estimated progress (D5).
 * fal has no real percent; we show a soft estimate capped at 95% until done.
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function VideoGeneratingOverlay({
  className,
  etaSeconds = 90,
  startedAt,
}: {
  stageIndex?: number;
  etaSeconds?: number;
  startedAt?: number;
  prompt?: string;
  className?: string;
}) {
  const [pct, setPct] = useState(2);
  const [label, setLabel] = useState("Waiting in queue");

  useEffect(() => {
    const start = startedAt ?? Date.now();
    const eta = Math.max(30, etaSeconds || 90);
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      // pct = min(95, round(100 * (1 - exp(-elapsed / (eta / 2.2)))))
      const p = Math.min(95, Math.round(100 * (1 - Math.exp(-elapsed / (eta / 2.2)))));
      setPct(Math.max(2, p));
      if (elapsed < 4) setLabel("Waiting in queue");
      else setLabel("Creating your video");
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [etaSeconds, startedAt]);

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center gap-3",
        "studio-shift-bg",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={`${label}, estimated ${pct}%`}
    >
      <span className="studio-breathe-dot h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_16px_rgba(255,122,69,0.8)]" />
      <p className="text-[12px] font-medium text-white/90">{label}…</p>
      <p className="text-[11px] tabular-nums text-white/70">
        {pct}% <span className="text-white/50">Estimated</span>
      </p>
      <style>{`
        @keyframes studio-breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0.6; }
        }
        .studio-breathe-dot {
          animation: studio-breathe 1.2s ease-in-out infinite;
        }
        @keyframes studio-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .studio-shift-bg {
          background: linear-gradient(120deg, #1a0a12, #2a1040, #0f1a2e, #1a0a12);
          background-size: 300% 300%;
          animation: studio-shift 8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .studio-breathe-dot, .studio-shift-bg { animation: none; }
        }
      `}</style>
    </div>
  );
}
