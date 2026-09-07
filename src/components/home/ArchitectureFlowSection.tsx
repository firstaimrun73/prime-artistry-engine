/**
 * Explanatory visual diagrams — conceptual only.
 * Cloudflare R2 media flow + Maluto AI flow with curved dotted connectors.
 */
import { cn } from "@/lib/utils";

const R2_STEPS = [
  { id: "create", label: "Creation", sub: "Image · Video · Music" },
  { id: "process", label: "Processing", sub: "Edit & generate" },
  { id: "r2", label: "Cloud storage", sub: "Secure objects" },
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

/** Curved dotted path between two flow nodes (desktop). */
function CurveConnector({ className }: { className?: string }) {
  return (
    <svg
      className={cn("hidden h-8 w-10 shrink-0 text-primary/55 sm:block", className)}
      viewBox="0 0 40 32"
      fill="none"
      aria-hidden
    >
      <path
        d="M2 16 C14 4, 26 28, 38 16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
      <path
        d="M32 12 L38 16 L32 20"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Vertical curved dotted path (mobile). */
function CurveConnectorMobile({ className }: { className?: string }) {
  return (
    <svg
      className={cn("mx-auto h-8 w-6 text-primary/50 sm:hidden", className)}
      viewBox="0 0 24 32"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 2 C4 10, 20 22, 12 30"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FlowNodes({
  steps,
  accentClass,
}: {
  steps: readonly { id: string; label: string; sub: string }[];
  accentClass: string;
}) {
  return (
    <div className="relative">
      <div className="flex flex-col items-stretch gap-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-1">
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-col items-center sm:flex-row sm:items-center">
            <div
              className={cn(
                "relative w-full min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur-sm sm:w-[8.5rem]",
                "animate-[flowPulse_3.2s_ease-in-out_infinite]",
              )}
              style={{ animationDelay: `${i * 0.35}s` }}
            >
              <div className={cn("absolute inset-x-0 top-0 h-0.5 opacity-80", accentClass)} />
              <p className="text-[12px] font-bold tracking-tight">{step.label}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{step.sub}</p>
            </div>
            {i < steps.length - 1 && (
              <>
                <CurveConnector />
                <CurveConnectorMobile />
              </>
            )}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes flowPulse {
          0%, 100% { box-shadow: 0 0 0 0 transparent; }
          50% { box-shadow: 0 0 18px 0 hsl(24 95% 53% / 0.18); }
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
            Media flow through secure storage
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            How Motio2edit moves creations from studio to delivery — conceptual overview only.
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
