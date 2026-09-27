/**
 * How Motion2AI Works — clean 8-step engine flow.
 * Short labels only. Subtle sequential animation.
 * Always refer to the backend as "the engine".
 */
import { cn } from "@/lib/utils";
import {
  Upload,
  ScanSearch,
  Images,
  Cpu,
  Lock,
  Paintbrush,
  SlidersHorizontal,
  Download,
} from "lucide-react";

const STEPS = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "analyze", label: "Analyze", icon: ScanSearch },
  { id: "match", label: "Reference match", icon: Images },
  { id: "engine", label: "Engine process", icon: Cpu },
  { id: "lock", label: "Style lock", icon: Lock },
  { id: "render", label: "Render", icon: Paintbrush },
  { id: "refine", label: "Refine", icon: SlidersHorizontal },
  { id: "output", label: "Output", icon: Download },
] as const;

function StepNode({
  step,
  index,
}: {
  step: (typeof STEPS)[number];
  index: number;
}) {
  const Icon = step.icon;
  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-2xl border border-border/70 bg-card/90 px-3 py-3 shadow-sm backdrop-blur-sm",
        "animate-[stepGlow_4s_ease-in-out_infinite]",
      )}
      style={{ animationDelay: `${index * 0.4}s` }}
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/12 text-primary">
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <p className="text-[11px] font-bold tracking-tight text-foreground sm:text-[12px]">
        {step.label}
      </p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden items-center text-primary/50 sm:flex">
      <svg width="28" height="12" viewBox="0 0 28 12" fill="none" aria-hidden>
        <path
          d="M0 6 H22"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeDasharray="4 3"
          className="animate-[flowDash_1.6s_linear_infinite]"
        />
        <path
          d="M20 2 L26 6 L20 10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function ArchitectureFlowSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          How it works
        </p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
          How Motion2AI Works
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          From your photo to the final result — powered by the engine.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-1">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-1 sm:gap-1.5">
            <StepNode step={step} index={i} />
            {i < STEPS.length - 1 && <Arrow />}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes stepGlow {
          0%, 100% { box-shadow: 0 0 0 0 transparent; border-color: hsl(var(--border) / 0.7); }
          50% { box-shadow: 0 0 16px 0 hsl(24 95% 53% / 0.2); border-color: hsl(24 95% 53% / 0.45); }
        }
        @keyframes flowDash {
          to { stroke-dashoffset: -14; }
        }
      `}</style>
    </section>
  );
}
