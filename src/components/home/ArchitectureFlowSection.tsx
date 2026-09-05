/**
 * Explanatory visual diagrams — no secrets, no fake services.
 * Cloudflare R2 media flow + Maluto AI flow.
 */
import { cn } from "@/lib/utils";

const R2_STEPS = [
  { id: "create", label: "Creation", sub: "Image · Video · Music" },
  { id: "process", label: "Processing", sub: "Edit & generate" },
  { id: "r2", label: "Cloudflare R2", sub: "Secure object storage" },
  { id: "deliver", label: "Delivery", sub: "CDN-backed assets" },
  { id: "experience", label: "Motio2edit", sub: "Your workspace" },
] as const;

const MALUTO_STEPS = [
  { id: "photo", label: "Photo", sub: "Upload one image" },
  { id: "analyse", label: "Analysis", sub: "Maluto AI studies it" },
  { id: "understand", label: "Understanding", sub: "Issues & opportunities" },
  { id: "decide", label: "Edit decision", sub: "Best improvements" },
  { id: "result", label: "Result", sub: "One-click polish" },
] as const;

function FlowNodes({
  steps,
  accentClass,
}: {
  steps: readonly { id: string; label: string; sub: string }[];
  accentClass: string;
}) {
  return (
    <div className="relative">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-center sm:gap-2">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2 sm:flex-col sm:gap-2">
            <div
              className={cn(
                "relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur-sm sm:w-[8.5rem] sm:flex-none",
                "animate-[flowPulse_3.2s_ease-in-out_infinite]",
              )}
              style={{ animationDelay: `${i * 0.35}s` }}
            >
              <div className={cn("absolute inset-x-0 top-0 h-0.5 opacity-80", accentClass)} />
              <p className="text-[12px] font-bold tracking-tight">{step.label}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{step.sub}</p>
            </div>
            {i < steps.length - 1 && (
              <span className="hidden shrink-0 text-primary/50 sm:block" aria-hidden>
                →
              </span>
            )}
            {i < steps.length - 1 && (
              <span className="text-primary/40 sm:hidden" aria-hidden>
                ↓
              </span>
            )}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes flowPulse {
          0%, 100% { box-shadow: 0 0 0 0 transparent; }
          50% { box-shadow: 0 0 18px 0 hsl(24 95% 53% / 0.12); }
        }
      `}</style>
    </div>
  );
}

export function ArchitectureFlowSection() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-12 px-4 py-12 sm:py-16">
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Infrastructure
          </p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
            Media flow through Cloudflare R2
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            How Motio2edit moves creations from studio to secure delivery — conceptual overview only.
          </p>
        </div>
        <FlowNodes steps={R2_STEPS} accentClass="bg-primary" />
      </div>

      <div className="space-y-4">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">
            Maluto AI
          </p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
            Auto Edit flow
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            One photo in — analysis, understanding, edit decision, polished result. No prompt required.
          </p>
        </div>
        <FlowNodes
          steps={MALUTO_STEPS}
          accentClass="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400"
        />
      </div>
    </section>
  );
}
