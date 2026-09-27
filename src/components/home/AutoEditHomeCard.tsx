import { Link } from "@tanstack/react-router";

/**
 * ACE Auto Edit card — real Ace of Diamonds playing-card style.
 * Small overlapping flow: Upload → Maluto AI verification → Output.
 * Powered by Maluto AI. No heavy animation.
 */
export function AutoEditHomeCard() {
  return (
    <Link
      to="/studio/image/auto-edit"
      className="group relative mt-10 block overflow-hidden rounded-[1.1rem] border border-zinc-200 bg-white text-zinc-900 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] transition duration-200 hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)] active:scale-[0.99] dark:border-zinc-300"
    >
      {/* Classic playing-card aspect ~ 2.5 : 3.5 → use ~5/7 */}
      <div className="relative aspect-[5/7] w-full p-4 sm:p-5">
        {/* Corner indices */}
        <div className="absolute left-3 top-3 flex flex-col items-center leading-none">
          <span className="text-[22px] font-black text-red-600">A</span>
          <span className="text-[14px] text-red-600">♦</span>
        </div>
        <div className="absolute bottom-3 right-3 flex rotate-180 flex-col items-center leading-none">
          <span className="text-[22px] font-black text-red-600">A</span>
          <span className="text-[14px] text-red-600">♦</span>
        </div>

        {/* Center diamond + label */}
        <div className="absolute inset-x-0 top-[18%] flex flex-col items-center">
          <span className="text-[56px] leading-none text-red-600 sm:text-[64px]">♦</span>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
            Ace · Auto Edit
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-zinc-400">Powered by Maluto AI</p>
        </div>

        {/* Small overlapping flow diagram */}
        <div className="absolute inset-x-4 bottom-[22%] flex items-center justify-center gap-1.5">
          <FlowChip label="Upload" />
          <DottedArrow />
          <FlowChip label="Maluto AI" highlight />
          <DottedArrow />
          <FlowChip label="Output" />
        </div>

        {/* Bottom CTA */}
        <div className="absolute inset-x-4 bottom-3 text-center">
          <p className="text-[11px] font-medium text-zinc-500">
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

function FlowChip({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <span
      className={
        highlight
          ? "rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-600 ring-1 ring-red-200"
          : "rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-semibold text-zinc-600"
      }
    >
      {label}
    </span>
  );
}

function DottedArrow() {
  return (
    <svg width="18" height="8" viewBox="0 0 18 8" fill="none" aria-hidden className="shrink-0 text-zinc-400">
      <path
        d="M1 4 H13"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="2 2"
        strokeLinecap="round"
      />
      <path d="M12 1.5 L16 4 L12 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
