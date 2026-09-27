/**
 * Animated Remove BG hero — flower on noisy bg → clean cutout.
 * No people (product direction).
 */
import { useEffect, useState } from "react";

type Phase = "messy" | "scanning" | "clean";

export function RemoveBgHeroDemo() {
  const [phase, setPhase] = useState<Phase>("messy");

  useEffect(() => {
    let cancelled = false;
    const loop = async () => {
      while (!cancelled) {
        setPhase("messy");
        await wait(1800);
        if (cancelled) break;
        setPhase("scanning");
        await wait(1600);
        if (cancelled) break;
        setPhase("clean");
        await wait(2200);
      }
    };
    void loop();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" data-remove-bg-demo="flower">
      <style>{`
        @keyframes rbg-scan {
          0% { transform: translateY(-10%); opacity: 0.4; }
          50% { opacity: 1; }
          100% { transform: translateY(110%); opacity: 0.4; }
        }
        @keyframes rbg-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Messy / noise background */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: phase === "clean" ? 0 : 1,
          background:
            "radial-gradient(circle at 20% 30%, #fbcfe8 0%, transparent 40%), radial-gradient(circle at 80% 70%, #a5f3fc 0%, transparent 35%), radial-gradient(circle at 50% 50%, #fef3c7 0%, #e2e8f0 70%), repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 4px, transparent 4px 10px)",
        }}
      />

      {/* Checkerboard for clean phase */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: phase === "clean" ? 1 : 0,
          backgroundImage:
            "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
          backgroundColor: "#f8fafc",
        }}
      />

      {/* Flower subject */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative flex h-[58%] w-[58%] items-center justify-center rounded-full transition-all duration-500"
          style={{
            background:
              phase === "clean"
                ? "radial-gradient(circle at 40% 35%, #fda4af, #f43f5e 45%, #be123c)"
                : "radial-gradient(circle at 40% 35%, #fda4af, #f43f5e 45%, #9f1239)",
            boxShadow:
              phase === "clean"
                ? "0 12px 28px rgba(244,63,94,0.35)"
                : "0 8px 20px rgba(0,0,0,0.15)",
            transform: phase === "scanning" ? "scale(1.04)" : "scale(1)",
          }}
        >
          <span className="text-4xl sm:text-5xl select-none" aria-hidden>
            🌸
          </span>
        </div>
      </div>

      {phase === "scanning" && (
        <div
          className="pointer-events-none absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#7B6FE0] to-transparent"
          style={{ animation: "rbg-scan 1.4s ease-in-out infinite" }}
        />
      )}

      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
        <span
          className="rounded-full bg-black/45 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md"
          style={{ animation: phase === "scanning" ? "rbg-pulse 0.9s ease-in-out infinite" : undefined }}
        >
          {phase === "messy" ? "Original" : phase === "scanning" ? "Removing…" : "Background gone"}
        </span>
      </div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
