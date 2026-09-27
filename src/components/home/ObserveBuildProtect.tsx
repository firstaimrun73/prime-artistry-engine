/**
 * Homepage workflow — Observe · Build · Protect
 * Short labels only + liquid flowing animation.
 */
import { Eye, Sparkles, ShieldCheck, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  {
    id: "observe",
    title: "Observe",
    body: "Upload & choose direction",
    icon: Eye,
  },
  {
    id: "build",
    title: "Build",
    body: "Lens · reference · prompt",
    icon: Wand2,
  },
  {
    id: "protect",
    title: "Protect",
    body: "Original stays connected",
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
          One connected path from upload to output.
        </p>
      </div>

      <div className="relative mx-auto mt-8 flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:items-stretch sm:justify-center sm:gap-0">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex flex-col items-center sm:flex-row">
              <div
                className={cn(
                  "flex w-full max-w-[200px] flex-col items-center rounded-2xl border px-4 py-4 text-center",
                  "border-white/12 bg-white/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md",
                  "animate-[liquidPulse_3.5s_ease-in-out_infinite]",
                )}
                style={{ animationDelay: `${i * 0.45}s` }}
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-black/40 text-orange-400">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-2.5 text-sm font-bold">{s.title}</h3>
                <p className="mt-1 text-[11px] leading-snug text-white/55">{s.body}</p>
              </div>
              {i < STAGES.length - 1 && (
                <>
                  <div className="my-1 flex h-8 w-6 items-center justify-center sm:hidden">
                    <div className="h-full w-0.5 animate-[liquidFlowV_1.8s_linear_infinite] rounded-full bg-gradient-to-b from-orange-500/80 via-orange-400/40 to-transparent" />
                  </div>
                  <div className="mx-1 hidden h-8 w-14 shrink-0 items-center sm:flex">
                    <div className="h-0.5 w-full animate-[liquidFlowH_1.8s_linear_infinite] rounded-full bg-gradient-to-r from-orange-500/80 via-orange-400/50 to-transparent" />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Final engine card — zoom pulse on icon */}
      <div className="mx-auto mt-8 flex max-w-sm flex-col items-center rounded-2xl border border-orange-500/40 bg-gradient-to-br from-orange-500/25 via-orange-600/15 to-transparent px-5 py-5 text-center shadow-[0_0_40px_rgba(249,115,22,0.2)]">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-orange-500 text-white shadow-lg animate-[engineZoom_2.4s_ease-in-out_infinite]">
          <Sparkles className="h-6 w-6" />
        </span>
        <p className="mt-2 text-sm font-bold tracking-tight">Generate with Motion2AI Engine</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-white/70">
          One engine. Multiple references. Identity stays locked.
        </p>
      </div>

      <style>{`
        @keyframes liquidPulse {
          0%, 100% { box-shadow: 0 0 0 0 transparent; border-color: rgba(255,255,255,0.12); }
          50% { box-shadow: 0 0 22px 0 rgba(249,115,22,0.22); border-color: rgba(249,115,22,0.35); }
        }
        @keyframes liquidFlowH {
          0% { background-position: 0% 50%; opacity: 0.4; }
          50% { opacity: 1; }
          100% { background-position: 200% 50%; opacity: 0.4; }
        }
        @keyframes liquidFlowV {
          0% { background-position: 50% 0%; opacity: 0.4; }
          50% { opacity: 1; }
          100% { background-position: 50% 200%; opacity: 0.4; }
        }
        @keyframes engineZoom {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
      `}</style>
    </section>
  );
}
