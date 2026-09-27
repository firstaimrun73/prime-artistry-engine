import { Link } from "@tanstack/react-router";

/**
 * ACE (Auto Edit) card — pure Ace of Diamonds style.
 * 1:1 ratio, white face, diamond, no animation, clean CTA.
 */
export function AutoEditHomeCard() {
  return (
    <Link
      to="/studio/image/auto-edit"
      className="group relative mt-10 block overflow-hidden rounded-[1.25rem] border border-border bg-white text-zinc-900 shadow-lg transition duration-200 hover:shadow-xl active:scale-[0.99] dark:bg-zinc-50"
    >
      <div className="relative aspect-square w-full p-5 sm:p-6">
        {/* Top-left A + diamond */}
        <div className="absolute left-4 top-4 flex flex-col items-center leading-none sm:left-5 sm:top-5">
          <span className="text-2xl font-black tracking-tight text-red-600 sm:text-3xl">A</span>
          <span className="mt-0.5 text-lg text-red-600 sm:text-xl">♦</span>
        </div>

        {/* Top-right A + diamond (rotated) */}
        <div className="absolute right-4 top-4 flex rotate-180 flex-col items-center leading-none sm:right-5 sm:top-5">
          <span className="text-2xl font-black tracking-tight text-red-600 sm:text-3xl">A</span>
          <span className="mt-0.5 text-lg text-red-600 sm:text-xl">♦</span>
        </div>

        {/* Center big diamond */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[72px] leading-none text-red-600 sm:text-[88px]">♦</span>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Ace · Auto Edit
          </p>
        </div>

        {/* Bottom line + CTA */}
        <div className="absolute inset-x-4 bottom-4 text-center sm:inset-x-5 sm:bottom-5">
          <p className="text-[12px] font-medium text-zinc-600">
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
