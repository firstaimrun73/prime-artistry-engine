/**
 * ACE Auto Edit — Ace of Diamonds card.
 * No photos, no carousel. Pure CSS/SVG animation.
 * Entire card is a link to /studio/image/auto-edit.
 */
import { Link } from "@tanstack/react-router";

export function AutoEditHomeCard() {
  return (
    <Link
      to="/studio/image/auto-edit"
      className="group relative mt-10 block overflow-hidden rounded-[1.15rem] border border-zinc-200 bg-white text-zinc-900 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] transition duration-200 hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)] active:scale-[0.99] dark:border-zinc-300"
      aria-label="Open Auto Edit"
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

        {/* Animated stage — no images */}
        <div className="relative mx-auto mt-10 flex h-[48%] w-[88%] items-center justify-center">
          {/* Soft ambient glow */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/10 via-transparent to-rose-400/15"
            aria-hidden
          />

          {/* Orbit ring */}
          <div
            className="absolute h-[72%] w-[72%] rounded-full border border-red-500/25"
            style={{ animation: "ace-spin 12s linear infinite" }}
            aria-hidden
          >
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
            <span className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-rose-400" />
          </div>

          {/* Inner dashed ring (counter-spin) */}
          <div
            className="absolute h-[48%] w-[48%] rounded-full border border-dashed border-red-400/40"
            style={{ animation: "ace-spin-rev 8s linear infinite" }}
            aria-hidden
          />

          {/* Center diamond pulse */}
          <div className="relative z-10 flex flex-col items-center">
            <span
              className="select-none text-[42px] leading-none text-red-600 drop-shadow-sm sm:text-[48px]"
              style={{ animation: "ace-pulse 2.2s ease-in-out infinite" }}
              aria-hidden
            >
              ♦
            </span>
            {/* Scan line across diamond area */}
            <span
              className="pointer-events-none absolute inset-x-[-28px] top-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80"
              style={{ animation: "ace-scan 2.4s ease-in-out infinite" }}
              aria-hidden
            />
          </div>

          {/* Floating spark dots */}
          <span
            className="absolute left-[18%] top-[22%] h-1.5 w-1.5 rounded-full bg-red-400"
            style={{ animation: "ace-float 3s ease-in-out infinite" }}
            aria-hidden
          />
          <span
            className="absolute right-[20%] top-[30%] h-1 w-1 rounded-full bg-rose-300"
            style={{ animation: "ace-float 3.6s ease-in-out 0.4s infinite" }}
            aria-hidden
          />
          <span
            className="absolute bottom-[28%] left-[28%] h-1 w-1 rounded-full bg-red-300"
            style={{ animation: "ace-float 2.8s ease-in-out 0.8s infinite" }}
            aria-hidden
          />
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

      {/* Keyframes scoped to this card */}
      <style>{`
        @keyframes ace-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ace-spin-rev {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes ace-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.12); opacity: 0.85; }
        }
        @keyframes ace-scan {
          0% { top: 8%; opacity: 0; }
          15% { opacity: 0.9; }
          50% { top: 70%; opacity: 0.75; }
          85% { opacity: 0.9; }
          100% { top: 8%; opacity: 0; }
        }
        @keyframes ace-float {
          0%, 100% { transform: translateY(0); opacity: 0.55; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </Link>
  );
}
