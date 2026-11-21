/**
 * Maluto AI homepage Restore card — premium animated demo.
 * Links to /studio/image/auto-edit. No paid API calls. No internal labels.
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
    }, 2600);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  return (
    <Link
      to="/studio/image/auto-edit"
      className="group relative mt-6 block overflow-hidden rounded-[1.15rem] border border-border bg-card text-foreground shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] transition duration-200 hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)] active:scale-[0.99] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)] md:mt-8"
      aria-label="Restore your photo with Maluto AI"
    >
      <div className="relative flex flex-col sm:min-h-[260px] sm:grid sm:grid-cols-[1fr_1.2fr]">
        {/* Copy */}
        <div className="relative flex flex-col justify-center gap-2 p-4 sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF5A1F]">
            Maluto AI
          </p>
          <h3 className="text-lg font-extrabold leading-tight tracking-tight sm:text-xl">
            Give your old photos a new life
          </h3>
          <p className="max-w-xs text-sm leading-snug text-muted-foreground">
            Upload → intelligent analysis → restored in one click.
          </p>
          <span className="mt-1 inline-flex w-fit items-center justify-center rounded-full bg-[#FF5A1F] px-5 py-2.5 text-[13px] font-bold text-white shadow-md transition group-hover:bg-[#e04e1a]">
            Restore Your Photo
          </span>
        </div>

        {/* Visual demo */}
        <div className="relative flex items-center justify-center border-t border-border bg-gradient-to-br from-muted/50 via-background to-[#FF5A1F]/[0.07] px-4 py-5 sm:border-l sm:border-t-0 sm:py-4">
          <div className="relative flex h-[160px] w-full max-w-[320px] items-center justify-center sm:h-[180px]">
            {/* BEFORE — upload */}
            <div
              className={`absolute transition-all duration-700 ease-out ${
                phase === "upload"
                  ? "z-10 scale-100 opacity-100"
                  : phase === "process"
                    ? "z-0 -translate-x-10 scale-90 opacity-35 sm:-translate-x-14"
                    : "z-0 -translate-x-14 scale-75 opacity-0"
              }`}
            >
              <div className="relative w-[100px] overflow-hidden rounded-xl border-2 border-dashed border-[#FF5A1F]/45 bg-card shadow-md sm:w-[112px]">
                <img
                  src={MALUTO_BEFORE}
                  alt=""
                  className="aspect-[3/4] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white">
                  Before
                </span>
              </div>
            </div>

            {/* PROCESS — puzzle */}
            <div
              className={`absolute transition-all duration-700 ease-out ${
                phase === "process" || phase === "restore"
                  ? "z-20 scale-100 opacity-100"
                  : "z-0 scale-90 opacity-0"
              }`}
            >
              <div className="relative h-[112px] w-[112px] overflow-hidden rounded-xl border border-[#FF5A1F]/40 bg-muted/60 shadow-inner sm:h-[124px] sm:w-[124px]">
                <img
                  src={phase === "restore" || phase === "done" ? MALUTO_AFTER : MALUTO_BEFORE}
                  alt=""
                  className="h-full w-full object-cover opacity-65 transition-opacity duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 p-0.5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-sm border border-[#FF5A1F]/30 bg-[#FF5A1F]/15"
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
                <span className="absolute inset-x-0 bottom-0 bg-[#FF5A1F]/95 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white">
                  Maluto AI
                </span>
              </div>
            </div>

            {/* AFTER — restored */}
            <div
              className={`absolute transition-all duration-700 ease-out ${
                phase === "done" || phase === "restore"
                  ? "z-10 translate-x-10 scale-100 opacity-100 sm:translate-x-14"
                  : "z-0 translate-x-14 scale-90 opacity-0"
              }`}
            >
              <div className="relative w-[100px] overflow-hidden rounded-xl border border-[#FF5A1F]/55 bg-card shadow-lg sm:w-[112px]">
                <img
                  src={MALUTO_AFTER}
                  alt="Restored"
                  className="aspect-[3/4] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <span className="absolute bottom-1 left-1 rounded bg-[#FF5A1F] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  Restored
                </span>
                {phase === "done" && !reduceMotion && (
                  <span
                    className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-[#FF5A1F]/55"
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
