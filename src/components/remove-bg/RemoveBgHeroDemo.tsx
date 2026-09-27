/**
 * Animated Remove BG hero — real rose before/after from R2.
 * Dual-layer crossfade + scanning reveal so removal is visibly progressive.
 */
import { useEffect, useState } from "react";
import { REMOVE_BG_ROSE_AFTER, REMOVE_BG_ROSE_BEFORE } from "@/lib/remove-bg/samples";

type Phase = "before" | "scanning" | "after";

const CHECKER = {
  backgroundImage:
    "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
  backgroundSize: "14px 14px",
  backgroundPosition: "0 0,0 7px,7px -7px,-7px 0",
  backgroundColor: "#f8fafc",
} as const;

export function RemoveBgHeroDemo() {
  const [phase, setPhase] = useState<Phase>("before");
  const [reveal, setReveal] = useState(0); // 0 = fully before, 1 = fully after
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    let cancelled = false;
    let raf = 0;

    const wait = (ms: number) =>
      new Promise<void>((r) => {
        const t = window.setTimeout(r, reduced ? Math.min(ms, 400) : ms);
        if (cancelled) window.clearTimeout(t);
      });

    const animateReveal = (from: number, to: number, duration: number) =>
      new Promise<void>((resolve) => {
        if (reduced) {
          setReveal(to);
          resolve();
          return;
        }
        const start = performance.now();
        const tick = (now: number) => {
          if (cancelled) return;
          const t = Math.min(1, (now - start) / duration);
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          setReveal(from + (to - from) * eased);
          if (t < 1) raf = requestAnimationFrame(tick);
          else resolve();
        };
        raf = requestAnimationFrame(tick);
      });

    const loop = async () => {
      while (!cancelled) {
        setPhase("before");
        setReveal(0);
        await wait(2200);
        if (cancelled) break;

        setPhase("scanning");
        await animateReveal(0, 1, 1600);
        if (cancelled) break;

        setPhase("after");
        await wait(2600);
        if (cancelled) break;

        // Soft return to before
        setPhase("before");
        await animateReveal(1, 0, 900);
      }
    };

    void loop();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const clipPct = Math.max(0, Math.min(100, (1 - reveal) * 100));

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" data-remove-bg-demo="rose">
      <style>{`
        @keyframes rbg-scan {
          0% { transform: translateY(-8%); opacity: 0.4; }
          50% { opacity: 1; }
          100% { transform: translateY(108%); opacity: 0.4; }
        }
      `}</style>

      {/* Checkerboard always under after layer */}
      <div className="absolute inset-0" style={CHECKER} />

      {/* After layer (full) */}
      <img
        src={REMOVE_BG_ROSE_AFTER}
        alt="Background removed"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      {/* Before layer — clipped from the right as reveal progresses */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: `inset(0 ${clipPct}% 0 0)`,
          transition: reduced ? "none" : undefined,
        }}
      >
        <img
          src={REMOVE_BG_ROSE_BEFORE}
          alt="Original with background"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      </div>

      {/* Scanning bar during reveal */}
      {phase === "scanning" && !reduced && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-10 h-1 bg-gradient-to-r from-transparent via-rose-400 to-transparent shadow-[0_0_12px_rgba(244,63,94,0.6)]"
          style={{
            top: `${reveal * 100}%`,
            animation: "rbg-scan 1.4s ease-in-out infinite",
          }}
        />
      )}

      <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center">
        <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
          {phase === "before" ? "Before" : phase === "scanning" ? "Removing…" : "After"}
        </span>
      </div>
    </div>
  );
}
