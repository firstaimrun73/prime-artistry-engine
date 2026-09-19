/**
 * In-canvas generation state — breathing accent dot only.
 * No spinner, no percentage, no Stop/Cancel.
 */
import { cn } from "@/lib/utils";

export function VideoGeneratingOverlay({
  className,
}: {
  /** @deprecated ignored */
  stageIndex?: number;
  /** @deprecated ignored */
  etaSeconds?: number;
  /** @deprecated ignored */
  prompt?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center gap-3",
        "studio-shift-bg",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="Creating your video"
    >
      <span className="studio-breathe-dot h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_16px_rgba(255,122,69,0.8)]" />
      <p className="text-[12px] font-medium text-white/90">Creating your video…</p>
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
