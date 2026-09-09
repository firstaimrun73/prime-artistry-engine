/**
 * Homepage workflow diagram — Observe · Build · Protect & connect
 */
import { Eye, Sparkles, ShieldCheck, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  {
    id: "observe",
    title: "Observe",
    body: "Upload your image and choose the motion or visual direction you want to create.",
    icon: Eye,
  },
  {
    id: "build",
    title: "Build",
    body: "Select a lens, add an optional reference, and describe the result in the prompt bar.",
    icon: Wand2,
  },
  {
    id: "protect",
    title: "Protect & connect",
    body: "Keep your original and settings connected through the workflow, with clear status and errors.",
    icon: ShieldCheck,
  },
] as const;

export function ObserveBuildProtect({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "mt-12 overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 px-4 py-8 text-white sm:px-8 sm:py-10",
        className,
      )}
      data-home-section="observe-build-protect"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-400/90">
          Motion2AI workflow
        </p>
        <h2 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
          Observe · Build · Protect
        </h2>
        <p className="mx-auto mt-2 max-w-md text-xs text-white/55 sm:text-sm">
          From upload to output — one connected path. Your photo stays the source of truth.
        </p>
      </div>

      <div className="relative mx-auto mt-8 flex max-w-4xl flex-col items-center gap-4 sm:flex-row sm:items-stretch sm:justify-center sm:gap-0">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex flex-col items-center sm:flex-row">
              <div
                className={cn(
                  "flex w-full max-w-[220px] flex-col items-center rounded-2xl border px-4 py-5 text-center",
                  "border-white/12 bg-white/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md",
                )}
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-black/40 text-orange-400">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-bold">{s.title}</h3>
                <p className="mt-1.5 text-[11px] leading-snug text-white/55">{s.body}</p>
              </div>
              {i < STAGES.length - 1 && (
                <>
                  <svg className="my-1 h-8 w-6 text-orange-500/50 sm:hidden" viewBox="0 0 24 32" fill="none" aria-hidden>
                    <path d="M12 2 C4 10, 20 22, 12 30" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 4" strokeLinecap="round" />
                  </svg>
                  <svg className="mx-1 hidden h-8 w-12 shrink-0 text-orange-500/55 sm:block" viewBox="0 0 48 32" fill="none" aria-hidden>
                    <path d="M2 16 C16 6, 32 26, 46 16" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 4" strokeLinecap="round" />
                    <path d="M40 11 L46 16 L40 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-8 flex max-w-md flex-col items-center rounded-2xl border border-orange-500/40 bg-gradient-to-br from-orange-500/25 via-orange-600/15 to-transparent px-5 py-5 text-center shadow-[0_0_40px_rgba(249,115,22,0.2)]">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-orange-500 text-white shadow-lg">
          <Sparkles className="h-6 w-6" />
        </span>
        <p className="mt-2 text-sm font-bold tracking-tight">Generate with Motion2AI Engine</p>
        <p className="mt-2 text-[11px] leading-relaxed text-white/70">
          Motion2AI is a single motion engine: one technical prompt can bind several reference
          photos into one coherent result. Stacking separate AI models often breaks identity and
          gait — Motion2AI keeps pose, clothing, and scene locked under one control path.
        </p>
      </div>
    </section>
  );
}
