/** Curved dotted How-it-works flow for Maluto AI (light + dark). */
import { Eye, FileStack, Cloud, Sparkles } from "lucide-react";

const FLOW_STEPS = [
  { icon: Eye, title: "Analyse", desc: "Vision model studies the photo" },
  { icon: FileStack, title: "Filing", desc: "Issues & edit plan are structured" },
  { icon: Cloud, title: "Data server", desc: "Secure cloud GPU processes the edit" },
  { icon: Sparkles, title: "Output", desc: "Polished image is returned" },
] as const;

export function AutoEditHowItWorks() {
  return (
    <section className="mt-10 space-y-4">
      <h2 className="text-sm font-bold tracking-tight">How it works</h2>

      {/* Mobile: vertical sequence with curved dotted connectors */}
      <div className="relative space-y-0 sm:hidden">
        {FLOW_STEPS.map((s, i) => {
          const Icon = s.icon;
          const last = i === FLOW_STEPS.length - 1;
          return (
            <div key={s.title} className="relative flex gap-3 pb-6 last:pb-0">
              {!last && (
                <svg
                  className="pointer-events-none absolute left-[17px] top-10 h-[calc(100%-2.5rem)] w-6 text-violet-400/80 dark:text-violet-300/60"
                  viewBox="0 0 24 40"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path
                    d="M12 0 C 4 12, 20 28, 12 40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeDasharray="3 4"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet-300/40 bg-violet-500/15 text-violet-600 dark:border-violet-500/30 dark:text-violet-300">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 rounded-2xl border border-white/50 bg-white/40 px-3 py-2.5 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                <p className="text-[12px] font-semibold">{s.title}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: 4-column with curved dotted arcs between steps */}
      <div className="relative hidden sm:block">
        <svg
          className="pointer-events-none absolute inset-x-0 top-[22px] z-0 h-10 w-full text-violet-400/80 dark:text-violet-300/55"
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M50 20 C 85 2, 115 38, 150 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeDasharray="3 5"
            strokeLinecap="round"
          />
          <path
            d="M150 20 C 185 38, 215 2, 250 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeDasharray="3 5"
            strokeLinecap="round"
          />
          <path
            d="M250 20 C 285 2, 315 38, 350 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeDasharray="3 5"
            strokeLinecap="round"
          />
        </svg>
        <div className="relative z-10 grid grid-cols-4 gap-3">
          {FLOW_STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="rounded-2xl border border-white/50 bg-white/40 p-3 text-center backdrop-blur-md dark:border-white/10 dark:bg-white/5"
              >
                <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-2 text-[12px] font-semibold">{s.title}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
