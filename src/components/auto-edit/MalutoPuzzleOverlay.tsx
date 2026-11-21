/**
 * Maluto AI processing overlay — puzzle assembly + progress bar + stage labels.
 * CSS-only animation; respects prefers-reduced-motion.
 * Progress is estimated/monotonic when backend does not stream sub-stages.
 */
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export const MALUTO_STAGES = [
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
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const fn = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    if (!active) {
      setAutoIdx(0);
      setTick(0);
      return;
    }
    if (typeof stageIndex === "number") return;
    setAutoIdx(0);
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setAutoIdx((i) => Math.min(MALUTO_STAGES.length - 1, i + 1));
    }, 2800);
    return () => window.clearInterval(id);
  }, [active, stageIndex, reduceMotion]);

  // Smooth estimated progress between stages (never stuck at 99%)
  useEffect(() => {
    if (!active || reduceMotion) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 400);
    return () => window.clearInterval(id);
  }, [active, reduceMotion]);

  const idx = typeof stageIndex === "number" ? stageIndex : autoIdx;
  const clamped = Math.min(Math.max(idx, 0), MALUTO_STAGES.length - 1);
  const label = MALUTO_STAGES[clamped];

  const basePct = ((clamped + 1) / MALUTO_STAGES.length) * 100;
  const wobble = reduceMotion ? 0 : Math.min(8, (tick % 20) * 0.4);
  const pct = Math.min(98, Math.round(basePct - 12 + wobble + clamped * 1.5));

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
        "absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-background/90 backdrop-blur-md dark:bg-black/80",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative mb-3 h-32 w-32 sm:mb-4 sm:h-40 sm:w-40">
        <div className="absolute inset-0 overflow-hidden rounded-xl border border-[#FF5A1F]/35 bg-muted/40 shadow-inner">
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
        <div className="pointer-events-none absolute -inset-1 rounded-2xl border border-[#FF5A1F]/25" />
      </div>

      <p className="px-4 text-center text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">Maluto AI is solving your picture…</p>

      {/* Progress bar */}
      <div className="mt-4 w-[min(16rem,80vw)]">
        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold tabular-nums text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF5A1F] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF5A1F]" />
            </span>
            Maluto AI LIVE
          </span>
          <span className="text-foreground">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FF5A1F] to-orange-400 transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <style>{`
        @keyframes maluto-piece-in {
          0% { transform: translate(var(--dx), var(--dy)) scale(0.85); opacity: 0.2; }
          100% { transform: translate(0, 0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
