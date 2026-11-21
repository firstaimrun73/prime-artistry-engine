/**
 * Maluto AI homepage card — animated UPLOAD → MALUTO → RESTORED demo.
 * Links to /studio/image/auto-edit. No paid API calls.
 */
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const MALUTO_BEFORE =
  "https://assets.motio2edit.com/temp/IMG-20261105-WA0001.jpg";
const MALUTO_AFTER =
  "https://assets.motio2edit.com/temp/IMG-20261105-WA0000.jpg";

const PHASES = ["upload", "process", "restore", "done"] as const;
type Phase = (typeof PHASES)[number];

export function AutoEditHomeCard() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const fn = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setPhase("done");
      return;
    }
    let i = 0;
    setPhase(PHASES[0]);
    const id = window.setInterval(() => {
      i = (i + 1) % PHASES.length;
      setPhase(PHASES[i]);
    }, 2800);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  return (
    <Link
      to="/studio/image/auto-edit"
      className="group relative mt-6 block overflow-hidden rounded-[1.15rem] border border-border bg-card text-foreground shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] transition duration-200 hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)] active:scale-[0.99] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)] md:mt-8"
      aria-label="Restore your photo with Maluto AI"
    >
      <div className="relative grid min-h-[240px] w-full grid-cols-1 sm:min-h-[260px] sm:grid-cols-[1fr_1.15fr]">
        <div className="relative flex flex-col justify-between p-4 sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF5A1F]">
            Maluto AI
          </p>
          <div className="mt-3 space-y-1.5 sm:mt-0">
            <h3 className="text-lg font-extrabold leading-tight tracking-tight sm:text-xl">
              Give your old photos a new life
            </h3>
            <p className="max-w-xs text-sm leading-snug text-muted-foreground">
              Upload → intelligent analysis → restored in one click.
            </p>
            <span className="mt-3 inline-flex items-center justify-center rounded-full bg-[#FF5A1F] px-5 py-2.5 text-[13px] font-bold text-white shadow-md transition group-hover:bg-[#e04e1a]">
              Restore Your Photo →
            </span>
          </div>
          <p className="mt-4 text-[10px] text-muted-foreground">Demo sequence · not a live job</p>
        </div>

        <div className="relative flex items-center justify-center border-t border-border bg-gradient-to-br from-muted/40 via-background to-[#FF5A1F]/5 p-4 sm:border-l sm:border-t-0">
          <div className="relative flex h-[180px] w-full max-w-[300px] items-center justify-center">
            <div
              className={`absolute transition-all duration-700 ease-out ${
                phase === "upload"
                  ? "scale-100 opacity-100"
                  : phase === "process"
                    ? "scale-75 -translate-x-6 opacity-40"
                    : "scale-50 opacity-0"
              }`}
            >
              <div className="relative w-[110px] overflow-hidden rounded-xl border-2 border-dashed border-[#FF5A1F]/50 bg-card shadow-md">
                <img
                  src={MALUTO_BEFORE}
                  alt=""
                  className="aspect-[3/4] w-full object-cover opacity-90"
                  loading="lazy"
                  decoding="async"
                />
                <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white">
                  Upload
                </span>
              </div>
            </div>

            <div
              className={`absolute transition-all duration-700 ease-out ${
                phase === "process" || phase === "restore"
                  ? "scale-100 opacity-100"
                  : "scale-75 opacity-0"
              }`}
            >
              <div className="relative h-[120px] w-[120px] overflow-hidden rounded-xl border border-[#FF5A1F]/40 bg-muted/50 shadow-inner">
                <img
                  src={phase === "restore" || phase === "done" ? MALUTO_AFTER : MALUTO_BEFORE}
                  alt=""
                  className="h-full w-full object-cover opacity-70 transition-opacity duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 p-0.5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-sm border border-[#FF5A1F]/25 bg-[#FF5A1F]/15"
                      style={
                        reduceMotion
                          ? undefined
                          : {
                              animation: `maluto-home-piece 0.8s ease-out ${(i % 5) * 0.1}s both`,
                            }
                      }
                    />
                  ))}
                </div>
                <span className="absolute inset-x-0 bottom-0 bg-[#FF5A1F]/90 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white">
                  Maluto AI
                </span>
              </div>
            </div>

            <div
              className={`absolute transition-all duration-700 ease-out ${
                phase === "done" || phase === "restore"
                  ? "translate-x-8 scale-100 opacity-100"
                  : "translate-x-12 scale-90 opacity-0"
              }`}
            >
              <div className="relative w-[110px] overflow-hidden rounded-xl border border-[#FF5A1F]/50 bg-card shadow-lg">
                <img
                  src={MALUTO_AFTER}
                  alt="Restored demo"
                  className="aspect-[3/4] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <span className="absolute bottom-1 left-1 rounded bg-[#FF5A1F]/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                  Restored
                </span>
                {phase === "done" && !reduceMotion && (
                  <span
                    className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-[#FF5A1F]/50"
                    style={{ animation: "maluto-home-glow 1.2s ease-out" }}
                    aria-hidden
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes maluto-home-piece {
          0% { transform: scale(0.6); opacity: 0.2; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes maluto-home-glow {
          0% { opacity: 0; }
          40% { opacity: 1; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .group * { animation: none !important; }
        }
      `}</style>
    </Link>
  );
}
