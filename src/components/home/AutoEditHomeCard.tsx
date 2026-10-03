import { Link } from "@tanstack/react-router";

/**
 * Ace · Auto Edit — homepage card.
 * Ace symbol only (no image carousel). Click → Maluto AI Auto Edit.
 */
export function AutoEditHomeCard() {
  return (
    <Link
      to="/studio/image/auto-edit"
      className="group relative mt-10 block overflow-hidden rounded-[1.15rem] border border-zinc-200 bg-white text-zinc-900 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] transition duration-200 hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)] active:scale-[0.99] dark:border-zinc-300"
      aria-label="Ace · Auto Edit — open Maluto AI"
    >
      <div className="relative flex aspect-[5/7] w-full flex-col items-center justify-center p-6">
        {/* Ace corners */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex flex-col items-center leading-none">
          <span className="text-[18px] font-black text-red-600">A</span>
          <span className="text-[14px] text-red-600">♦</span>
        </div>
        <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-20 flex rotate-180 flex-col items-center leading-none">
          <span className="text-[18px] font-black text-red-600">A</span>
          <span className="text-[14px] text-red-600">♦</span>
        </div>

        {/* Center Ace symbol only */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-[72px] leading-none text-red-600 drop-shadow-sm sm:text-[88px]" aria-hidden>
            ♦
          </span>
          <span className="mt-3 text-lg font-black tracking-tight text-zinc-900">Ace</span>
          <span className="mt-1 text-[11px] font-medium text-zinc-500">Auto Edit · Maluto AI</span>
        </div>
      </div>
    </Link>
  );
}
