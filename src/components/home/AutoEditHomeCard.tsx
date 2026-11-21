/**
 * ACE · Maluto AI — Ace of Diamonds restoration card.
 * Whole card links to /studio/image/auto-edit.
 * Real before/after restoration demo from assets.motio2edit.com.
 */
import { Link } from "@tanstack/react-router";

const MALUTO_BEFORE =
  "https://assets.motio2edit.com/temp/IMG-20261105-WA0001.jpg";
const MALUTO_AFTER =
  "https://assets.motio2edit.com/temp/IMG-20261105-WA0000.jpg";

export function AutoEditHomeCard() {
  return (
    <Link
      to="/studio/image/auto-edit"
      className="group relative mt-6 block overflow-hidden rounded-[1.15rem] border border-zinc-200 bg-white text-zinc-900 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] transition duration-200 hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)] active:scale-[0.99] dark:border-zinc-300 md:mt-8"
      aria-label="Restore your photo with Maluto AI"
    >
      <div className="relative grid min-h-[220px] w-full grid-cols-1 sm:min-h-[240px] sm:grid-cols-[1fr_1.1fr]">
        {/* Left: Ace identity + copy */}
        <div className="relative flex flex-col justify-between p-4 sm:p-5">
          <div className="pointer-events-none flex items-start gap-1 leading-none">
            <span className="text-[20px] font-black text-red-600">A</span>
            <span className="text-[14px] text-red-600">♦</span>
          </div>

          <div className="mt-4 space-y-1.5 sm:mt-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              Ace · Maluto AI
            </p>
            <h3 className="text-lg font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-xl">
              Give your old photos a new life
            </h3>
            <p className="max-w-xs text-sm leading-snug text-zinc-600">
              Restore your precious memories with one simple upload.
            </p>
            <span className="mt-3 inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-md transition group-hover:bg-red-700">
              Restore Your Photo →
            </span>
          </div>

          <div className="pointer-events-none mt-4 hidden rotate-180 items-end gap-1 leading-none sm:flex">
            <span className="text-[20px] font-black text-red-600">A</span>
            <span className="text-[14px] text-red-600">♦</span>
          </div>
        </div>

        {/* Right: real before / after restoration demo */}
        <div className="relative flex items-center justify-center border-t border-zinc-100 bg-gradient-to-br from-zinc-50 via-white to-rose-50 p-4 sm:border-l sm:border-t-0">
          <div className="relative flex w-full max-w-[280px] items-stretch gap-2">
            <div className="relative flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm">
              <img
                src={MALUTO_BEFORE}
                alt="Damaged photo before Maluto AI restoration"
                className="aspect-[3/4] w-full object-cover object-center"
                loading="lazy"
                decoding="async"
              />
              <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                Before
              </span>
            </div>
            <div className="relative flex-1 overflow-hidden rounded-xl border border-red-200/60 bg-white shadow-md">
              <img
                src={MALUTO_AFTER}
                alt="Photo restored with Maluto AI"
                className="aspect-[3/4] w-full object-cover object-center"
                loading="lazy"
                decoding="async"
              />
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/80 to-transparent"
                style={{ animation: "ace-scan 2.8s ease-in-out infinite" }}
                aria-hidden
              />
              <span className="absolute bottom-2 left-2 rounded bg-red-600/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                Restored
              </span>
            </div>
          </div>
          <span
            className="pointer-events-none absolute right-4 top-4 text-[28px] text-red-500/90 drop-shadow-sm"
            style={{ animation: "ace-pulse 2.2s ease-in-out infinite" }}
            aria-hidden
          >
            ♦
          </span>
        </div>
      </div>

      <style>{`
        @keyframes ace-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.85; }
        }
        @keyframes ace-scan {
          0% { top: 12%; opacity: 0; }
          20% { opacity: 0.95; }
          50% { top: 70%; opacity: 0.8; }
          80% { opacity: 0.95; }
          100% { top: 12%; opacity: 0; }
        }
      `}</style>
    </Link>
  );
}
