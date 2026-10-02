import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

/**
 * ACE Auto Edit — Ace of Diamonds card with before → process → result carousel.
 * Uses real Motio2edit sample pairs (photo enhance demos).
 * Auto-plays a few cycles, then holds on the last frame.
 * Powered by Maluto AI (product name for Auto Edit).
 */

type Step = { src: string; label: string };

type Example = {
  id: string;
  steps: Step[];
};

/** Before / process / result from public R2 samples (circle + image studio). */
const EXAMPLES: Example[] = [
  {
    id: "street",
    steps: [
      {
        src: "https://assets.motio2edit.com/samples/circle-2edit/IMG-20260927-WA0001.jpg",
        label: "Original",
      },
      {
        src: "https://assets.motio2edit.com/samples/circle-2edit/file_000000001b80821091ce891b23fc036f.png",
        label: "Processing",
      },
      {
        src: "https://assets.motio2edit.com/samples/circle-2edit/IMG-20260927-WA0002.jpg",
        label: "Result",
      },
    ],
  },
  {
    id: "detail",
    steps: [
      {
        src: "https://assets.motio2edit.com/samples/circle-2edit/IMG-20260927-WA0003.jpg",
        label: "Original",
      },
      {
        src: "https://assets.motio2edit.com/samples/circle-2edit/IMG-20260927-WA0000.jpg",
        label: "Processing",
      },
      {
        src: "https://assets.motio2edit.com/samples/circle-2edit/IMG-20260927-WA0000.jpg",
        label: "Result",
      },
    ],
  },
];

const MAX_AUTO_CYCLES = 2;
const STEP_MS = 1600;
const EXAMPLE_PAUSE_MS = 900;

export function AutoEditHomeCard() {
  const [exIdx, setExIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [cycles, setCycles] = useState(0);
  const [playing, setPlaying] = useState(true);

  const example = EXAMPLES[exIdx]!;

  useEffect(() => {
    const map: Record<string, boolean> = {};
    let pending = 0;
    EXAMPLES.forEach((ex) => {
      ex.steps.forEach((s) => {
        pending += 1;
        const img = new Image();
        img.onload = () => {
          map[s.src] = true;
          pending -= 1;
          if (pending <= 0) setLoaded({ ...map });
        };
        img.onerror = () => {
          map[s.src] = false;
          pending -= 1;
          if (pending <= 0) setLoaded({ ...map });
        };
        img.src = s.src;
      });
    });
  }, []);

  const visibleSteps = useMemo(() => {
    return example.steps.filter((s) => loaded[s.src] !== false);
  }, [example, loaded]);

  useEffect(() => {
    if (!playing || cycles >= MAX_AUTO_CYCLES) return;
    if (visibleSteps.length === 0) return;

    const t = window.setTimeout(() => {
      if (stepIdx < visibleSteps.length - 1) {
        setStepIdx((i) => i + 1);
      } else if (exIdx < EXAMPLES.length - 1) {
        setExIdx((i) => i + 1);
        setStepIdx(0);
      } else {
        setCycles((c) => c + 1);
        setExIdx(0);
        setStepIdx(0);
        if (cycles + 1 >= MAX_AUTO_CYCLES) setPlaying(false);
      }
    }, stepIdx === visibleSteps.length - 1 ? EXAMPLE_PAUSE_MS : STEP_MS);

    return () => window.clearTimeout(t);
  }, [playing, cycles, stepIdx, exIdx, visibleSteps.length]);

  return (
    <Link
      to="/studio/image/auto-edit"
      className="group relative mt-10 block overflow-hidden rounded-[1.15rem] border border-zinc-200 bg-white text-zinc-900 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] transition duration-200 hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)] active:scale-[0.99] dark:border-zinc-300"
    >
      <div className="relative aspect-[5/7] w-full p-3.5 sm:p-4">
        {/* Corner Ace marks */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex flex-col items-center leading-none">
          <span className="text-[18px] font-black text-red-600">A</span>
          <span className="text-[12px] text-red-600">♦</span>
        </div>
        <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-20 flex rotate-180 flex-col items-center leading-none">
          <span className="text-[18px] font-black text-red-600">A</span>
          <span className="text-[12px] text-red-600">♦</span>
        </div>

        {/* Stage */}
        <div className="relative mx-auto mt-8 h-[52%] w-[88%]">
          {visibleSteps.map((s, i) => {
            const active = i === stepIdx;
            const behind = i < stepIdx;
            return (
              <div
                key={`${example.id}-${s.src}-${i}`}
                className="absolute inset-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-md transition-all duration-500"
                style={{
                  opacity: active ? 1 : behind ? 0.35 : 0,
                  transform: active
                    ? "scale(1) translateY(0)"
                    : behind
                      ? `scale(0.92) translateY(${(stepIdx - i) * 6}px)`
                      : "scale(0.96) translateY(12px)",
                  zIndex: active ? 10 : behind ? 5 - i : 1,
                }}
              >
                {loaded[s.src] !== false && (
                  <img
                    src={s.src}
                    alt={s.label}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                )}
                <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  {s.label}
                </span>
                {active && i === 0 && (
                  <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-lg animate-pulse">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                )}
              </div>
            );
          })}

          <div className="absolute -bottom-5 left-0 right-0 flex items-center justify-center gap-1.5">
            {visibleSteps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === stepIdx ? "bg-red-600" : "bg-zinc-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Branding + CTA */}
        <div className="absolute inset-x-3 bottom-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            Ace · Auto Edit
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-zinc-400">Powered by Maluto AI</p>
          <p className="mt-1.5 text-[11px] font-medium text-zinc-500">
            One click and your edit is ready
          </p>
          <span className="mt-2 inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2 text-[12px] font-bold text-white shadow-md transition group-hover:bg-red-700">
            Try Auto Edit
          </span>
        </div>
      </div>
    </Link>
  );
}
