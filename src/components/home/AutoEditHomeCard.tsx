import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

const FLOW = ["Input", "AI analysis", "One click", "Editing", "Output"] as const;

/** Cinematic 4:3 Ace-style Auto Edit entry on signed-in home. */
export function AutoEditHomeCard() {
  return (
    <Link
      to="/studio/image/auto-edit"
      className="group relative mt-10 block overflow-hidden rounded-[1.35rem] border border-primary/35 bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-950/80 text-white shadow-[0_20px_60px_-20px_rgba(249,115,22,0.45)] transition duration-300 hover:scale-[1.01] hover:border-orange-400/60 hover:shadow-[0_24px_70px_-18px_rgba(249,115,22,0.55)] active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] w-full">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(249,115,22,0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 70%, rgba(167,139,250,0.2), transparent 50%), linear-gradient(160deg, #0a0a0b 0%, #1c1917 45%, #431407 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 3px)",
          }}
        />

        <div className="absolute left-4 top-4 flex items-center gap-2 sm:left-5 sm:top-5">
          <span className="relative grid h-14 w-11 place-items-center rounded-lg border border-orange-400/50 bg-gradient-to-b from-orange-500 to-orange-700 shadow-[0_8px_24px_rgba(249,115,22,0.45)] sm:h-16 sm:w-12">
            <span className="text-lg font-black tracking-tight text-white sm:text-xl">A</span>
            <span className="absolute bottom-1 text-[10px] leading-none text-white/90">♦</span>
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300/90">
              Ace · Auto
            </p>
            <h3 className="text-lg font-extrabold tracking-tight sm:text-xl">Auto Edit</h3>
          </div>
        </div>

        <div className="absolute right-4 top-4 sm:right-5 sm:top-5">
          <ArrowRight className="h-5 w-5 text-orange-300/80 transition-transform duration-300 group-hover:translate-x-1" />
        </div>

        <div className="absolute inset-x-4 bottom-4 sm:inset-x-5 sm:bottom-5">
          <p className="mb-2 text-[11px] font-medium text-white/65">
            One photo · no prompt · Motion2AI decides
          </p>
          <div className="flex items-stretch gap-1.5 sm:gap-2">
            {FLOW.map((step, i) => (
              <div
                key={step}
                className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl border border-white/15 px-1 py-2 text-center backdrop-blur-md"
                style={{
                  background: `rgba(255,255,255,${0.06 + i * 0.04})`,
                  opacity: 0.55 + i * 0.1,
                }}
              >
                <span className="text-[9px] font-bold uppercase tracking-wide text-orange-200/90 sm:text-[10px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="mt-0.5 truncate text-[10px] font-semibold text-white sm:text-[11px]">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
