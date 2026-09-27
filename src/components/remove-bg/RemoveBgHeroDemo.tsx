/**
 * Animated Remove BG hero — real rose before/after from R2.
 */
import { useEffect, useState } from "react";
import { REMOVE_BG_ROSE_AFTER, REMOVE_BG_ROSE_BEFORE } from "@/lib/remove-bg/samples";

type Phase = "before" | "scanning" | "after";

export function RemoveBgHeroDemo() {
  const [phase, setPhase] = useState<Phase>("before");

  useEffect(() => {
    let cancelled = false;
    const loop = async () => {
      while (!cancelled) {
        setPhase("before");
        await wait(2000);
        if (cancelled) break;
        setPhase("scanning");
        await wait(1400);
        if (cancelled) break;
        setPhase("after");
        await wait(2400);
      }
    };
    void loop();
    return () => {
      cancelled = true;
    };
  }, []);

  const src = phase === "after" ? REMOVE_BG_ROSE_AFTER : REMOVE_BG_ROSE_BEFORE;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" data-remove-bg-demo="rose">
      <style>{`
        @keyframes rbg-scan {
          0% { transform: translateY(-8%); opacity: 0.35; }
          50% { opacity: 1; }
          100% { transform: translateY(108%); opacity: 0.35; }
        }
      `}</style>

      {phase === "after" && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
            backgroundSize: "14px 14px",
            backgroundPosition: "0 0,0 7px,7px -7px,-7px 0",
            backgroundColor: "#f8fafc",
          }}
        />
      )}

      <img
        src={src}
        alt={phase === "after" ? "Background removed" : "Original with background"}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
        style={{ opacity: phase === "scanning" ? 0.85 : 1 }}
        draggable={false}
      />

      {phase === "scanning" && (
        <div
          className="pointer-events-none absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-rose-400 to-transparent"
          style={{ animation: "rbg-scan 1.2s ease-in-out infinite" }}
        />
      )}

      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
        <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
          {phase === "before" ? "Before" : phase === "scanning" ? "Removing…" : "After"}
        </span>
      </div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
