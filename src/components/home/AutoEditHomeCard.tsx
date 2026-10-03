import { Link } from "@tanstack/react-router";

/**
 * Maluto AI Auto Edit — homepage card.
 * Visual workflow only (no unrelated Remove BG sample collage).
 * Upload → AI understands → Transforms → Result
 */
const STEPS = [
  { label: "Upload", icon: "↑" },
  { label: "AI understands", icon: "✦" },
  { label: "Transforms", icon: "↻" },
  { label: "Result", icon: "✓" },
] as const;

export function AutoEditHomeCard() {
  return (
    <Link
      to="/studio/image/auto-edit"
      className="group relative mt-10 block overflow-hidden rounded-[1.15rem] border border-zinc-200 bg-white text-zinc-900 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] transition duration-200 hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)] active:scale-[0.99] dark:border-zinc-300"
    >
      <div className="relative aspect-[5/7] w-full p-3.5 sm:p-4">
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex flex-col items-center leading-none">
          <span className="text-[18px] font-black text-red-600">A</span>
          <span className="text-[14px] text-red-600">♦</span>
        </div>
        <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-20 flex rotate-180 flex-col items-center leading-none">
          <span className="text-[18px] font-black text-red-600">A</span>
          <span className="text-[14px] text-red-600">♦</span>
        </div>

        <div className="absolute inset-x-6 top-[18%] bottom-[28%] flex flex-col items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex w-full max-w-[11rem] flex-col items-center">
              <div className="flex w-full items-center gap-2.5 rounded-xl border border-orange-200/80 bg-gradient-to-r from-orange-50/90 to-white/80 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-orange-300/40 dark:from-orange-100/90 dark:to-white/90">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-sm font-bold text-white shadow">
                  {s.icon}
                </span>
                <span className="text-left text-[12px] font-semibold tracking-tight text-zinc-800">
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span className="my-0.5 text-[11px] font-bold text-orange-500/80" aria-hidden>
                  ↓
                </span>
              )}
            </div>
          ))}
        </div>

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
