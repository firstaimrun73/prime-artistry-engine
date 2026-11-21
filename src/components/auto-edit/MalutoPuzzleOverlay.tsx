/**
 * Lightweight puzzle-assembly animation for Maluto AI processing.
 * CSS-only; respects prefers-reduced-motion; does not block API work.
 */
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const STAGES = [
  "Understanding your photograph",
  "Analyzing image quality",
  "Detecting damage and defects",
  "Building an intelligent restoration plan",
  "Restoring your photograph",
  "Checking the final result",
] as const;

type Props = {
  active: boolean;
  /** 0..STAGES.length-1 when parent knows progress; otherwise auto-advance */
  stageIndex?: number;
  previewUrl?: string | null;
  className?: string;
};

const PIECE_COUNT = 9;

export function MalutoPuzzleOverlay({ active, stageIndex, previewUrl, className }: Props) {
  const [autoIdx, setAutoIdx] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const fn = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    if (!active || typeof stageIndex === "number") return;
    setAutoIdx(0);
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setAutoIdx((i) => Math.min(STAGES.length - 1, i + 1));
    }, 2800);
    return () => window.clearInterval(id);
  }, [active, stageIndex, reduceMotion]);

  const idx = typeof stageIndex === "number" ? stageIndex : autoIdx;
  const label = STAGES[Math.min(idx, STAGES.length - 1)];

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        id: i,
        row: Math.floor(i / 3),
        col: i % 3,
        delay: reduceMotion ? 0 : (i % 5) * 0.12,
        dx: reduceMotion ? 0 : ((i % 3) - 1) * 18,
        dy: reduceMotion ? 0 : (Math.floor(i / 3) - 1) * 16,
      })),
    [reduceMotion],
  );

  if (!active) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-background/85 backdrop-blur-md",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative mb-4 h-36 w-36 sm:h-44 sm:w-44">
        <div className="absolute inset-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40 shadow-inner">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover opacity-40"
              draggable={false}
            />
          ) : null}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 p-0.5">
            {pieces.map((p) => (
              <div
                key={p.id}
                className="relative overflow-hidden rounded-sm border border-[#FF5A1F]/30 bg-gradient-to-br from-[#FF5A1F]/25 to-orange-500/10"
                style={
                  reduceMotion
                    ? undefined
                    : {
                        animation: `maluto-piece-in 0.9s ease-out ${p.delay}s both`,
                        ["--dx" as string]: `${p.dx}px`,
                        ["--dy" as string]: `${p.dy}px`,
                      }
                }
              >
                {previewUrl ? (
                  <div
                    className="h-full w-full bg-cover bg-center opacity-80"
                    style={{
                      backgroundImage: `url(${previewUrl})`,
                      backgroundSize: "300% 300%",
                      backgroundPosition: `${p.col * 50}% ${p.row * 50}%`,
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute -inset-1 rounded-2xl border border-[#FF5A1F]/20" />
      </div>
      <p className="px-4 text-center text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">Maluto AI is solving your picture…</p>
      <style>{`
        @keyframes maluto-piece-in {
          0% { transform: translate(var(--dx), var(--dy)) scale(0.85); opacity: 0.2; }
          100% { transform: translate(0, 0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
