/** Curved dotted How-it-works flow for Maluto AI */
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
      <div className="relative">
        <svg
          className="pointer-events-none absolute inset-x-0 top-[22px] hidden h-8 w-full sm:block"
          viewBox="0 0 400 32"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M50 16 C 90 4, 110 28, 150 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" className="text-violet-400/70 dark:text-violet-300/50" />
          <path d="M150 16 C 190 28, 210 4, 250 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" className="text-violet-400/70 dark:text-violet-300/50" />
          <path d="M250 16 C 290 4, 310 28, 350 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" className="text-violet-400/70 dark:text-violet-300/50" />
        </svg>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FLOW_STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="relative rounded-2xl border border-white/50 bg-white/40 p-3 text-center backdrop-blur-md dark:border-white/10 dark:bg-white/5"
              >
                <span className="relative z-10 mx-auto grid h-9 w-9 place-items-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
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
