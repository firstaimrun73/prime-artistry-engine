import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, MousePointerClick } from "lucide-react";

/**
 * ACE (Auto Edit) card — 1:1 ratio.
 * Overlapping cards: original → tap → process → result.
 * Runs 3 example loops, rate-limited to 1–2 plays per hour.
 * Skips any missing image step (never shows broken/placeholder).
 */

const EXAMPLES = [
  {
    id: "portrait",
    before: "/demo/video/poster-portrait.jpg",
    after: "/demo/video/poster-portrait.jpg", // replace with real after if available
  },
  {
    id: "landscape",
    before: "/demo/video/poster-landscape.jpg",
    after: "/demo/video/poster-landscape.jpg",
  },
  {
    id: "tech",
    before: "/demo/video/poster-tech.jpg",
    after: "/demo/video/poster-tech.jpg",
  },
] as const;

const HOUR_MS = 60 * 60 * 1000;
const MAX_PLAYS_PER_HOUR = 2;

export function AutoEditHomeCard() {
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState(0); // 0 original, 1 tap, 2 process, 3 result
  const [plays, setPlays] = useState(0);

  useEffect(() => {
    // Rate-limit: only 1–2 full loops per hour
    const key = "ace-plays";
    const stored = localStorage.getItem(key);
    let count = 0;
    let ts = Date.now();
    if (stored) {
      try {
        const p = JSON.parse(stored);
        if (Date.now() - p.ts < HOUR_MS) {
          count = p.count;
          ts = p.ts;
        }
      } catch {}
    }
    setPlays(count);

    if (count >= MAX_PLAYS_PER_HOUR) return;

    const interval = setInterval(() => {
      setPhase((p) => {
        if (p >= 3) {
          // finished one loop
          setActive((a) => (a + 1) % EXAMPLES.length);
          const newCount = count + 1;
          localStorage.setItem(key, JSON.stringify({ count: newCount, ts }));
          setPlays(newCount);
          if (newCount >= MAX_PLAYS_PER_HOUR) {
            clearInterval(interval);
          }
          return 0;
        }
        return p + 1;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  const ex = EXAMPLES[active];
  const hasBefore = Boolean(ex.before);
  const hasAfter = Boolean(ex.after);

  return (
    <Link
      to="/studio/image/auto-edit"
      className="group relative mt-10 block overflow-hidden rounded-[1.35rem] border border-primary/35 bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-950/80 text-white shadow-[0_20px_60px_-20px_rgba(249,115,22,0.45)] transition duration-300 hover:scale-[1.01] hover:border-orange-400/60"
    >
      {/* 1:1 aspect */}
      <div className="relative aspect-square w-full">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(249,115,22,0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 70%, rgba(167,139,250,0.2), transparent 50%), linear-gradient(160deg, #0a0a0b 0%, #1c1917 45%, #431407 100%)",
          }}
        />

        {/* Ace badge */}
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2 sm:left-5 sm:top-5">
          <span className="relative grid h-12 w-10 place-items-center rounded-lg border border-orange-400/50 bg-gradient-to-b from-orange-500 to-orange-700 shadow-[0_8px_24px_rgba(249,115,22,0.45)]">
            <span className="text-base font-black tracking-tight text-white">A</span>
            <span className="absolute bottom-0.5 text-[9px] leading-none text-white/90">♦</span>
          </span>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-orange-300/90">
              Ace · Auto
            </p>
            <h3 className="text-base font-extrabold tracking-tight sm:text-lg">Auto Edit</h3>
          </div>
        </div>

        <div className="absolute right-4 top-4 z-20 sm:right-5 sm:top-5">
          <ArrowRight className="h-5 w-5 text-orange-300/80 transition-transform duration-300 group-hover:translate-x-1" />
        </div>

        {/* Overlapping cards area */}
        <div className="absolute inset-0 flex items-center justify-center pt-14 pb-16">
          <div className="relative h-[58%] w-[72%]">
            {/* Card 1 — original (always if present) */}
            {hasBefore && (
              <div
                className={cnCard(phase === 0 || phase === 1)}
                style={{ zIndex: phase <= 1 ? 10 : 2, transform: phase === 0 ? "rotate(-4deg)" : "rotate(-6deg) translateX(-8%)" }}
              >
                <img src={ex.before} alt="Original" className="h-full w-full object-cover" />
                <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  Before
                </span>
              </div>
            )}

            {/* Card 2 — tap indicator */}
            {phase >= 1 && (
              <div
                className="absolute inset-[12%] z-20 flex items-center justify-center rounded-xl border border-white/20 bg-black/40 backdrop-blur-sm"
              >
                <MousePointerClick className="h-10 w-10 animate-pulse text-orange-300" />
              </div>
            )}

            {/* Card 3 — process diagram */}
            {phase >= 2 && (
              <div
                className={cnCard(true)}
                style={{ zIndex: 12, transform: "rotate(2deg) translateX(4%)" }}
              >
                <div className="flex h-full flex-col items-center justify-center gap-1 bg-zinc-900/95 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300">Engine</p>
                  <p className="text-[11px] font-semibold text-white">Analyze → Decide → Edit</p>
                  <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-orange-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Card 4 — result */}
            {phase >= 3 && hasAfter && (
              <div
                className={cnCard(true)}
                style={{ zIndex: 14, transform: "rotate(5deg) translateX(10%)" }}
              >
                <img src={ex.after} alt="Result" className="h-full w-full object-cover" />
                <span className="absolute left-2 top-2 rounded bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  After
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-4 sm:inset-x-5 sm:bottom-5">
          <p className="text-[11px] font-medium text-white/65">
            One photo · no prompt · the engine decides
          </p>
        </div>
      </div>
    </Link>
  );
}

function cnCard(active: boolean) {
  return [
    "absolute inset-0 overflow-hidden rounded-xl border border-white/20 shadow-lg transition-all duration-500",
    active ? "opacity-100 scale-100" : "opacity-40 scale-95",
  ].join(" ");
}
