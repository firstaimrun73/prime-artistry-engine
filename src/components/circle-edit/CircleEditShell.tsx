/**
 * Circle 2edit product shell — violet/teal identity only (not Motio orange).
 * Layout: thin header → flex-1 stage → optional controls → bottom mode bar.
 */
import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  Crop,
  Eraser,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CircleEditMode = "remove" | "add" | "crop";

const CSS_VARS: CSSProperties = {
  ["--ce-ink" as string]: "#0E0F13",
  ["--ce-panel" as string]: "#15161B",
  ["--ce-line" as string]: "#2A2C36",
  ["--ce-text" as string]: "#F2F2F5",
  ["--ce-dim" as string]: "#9A9CAA",
  ["--ce-violet" as string]: "#8B7CFF",
  ["--ce-teal" as string]: "#5CE0C0",
};

type Props = {
  creditsLabel: string;
  mode: CircleEditMode;
  onModeChange: (m: CircleEditMode) => void;
  generating?: boolean;
  onBack: () => void;
  children: React.ReactNode;
  /** Controls rendered under the stage, above the mode bar */
  footer?: React.ReactNode;
};

export function CircleEditShell({
  creditsLabel,
  mode,
  onModeChange,
  generating,
  onBack,
  children,
  footer,
}: Props) {
  const [brandPulse, setBrandPulse] = useState(false);

  useEffect(() => {
    if (generating) {
      setBrandPulse(false);
      return;
    }
    const tick = () => {
      setBrandPulse(true);
      window.setTimeout(() => setBrandPulse(false), 2000);
    };
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, [generating]);

  return (
    <div
      className="flex h-[100dvh] flex-col overflow-hidden bg-[#0E0F13] text-[#F2F2F5]"
      style={CSS_VARS}
      data-circle-2edit="true"
    >
      {/* Thin header: back + title left, credits top-right */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#22232C] bg-[#15161B] px-3 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Image Studio"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#2A2C36] text-[#9A9CAA] transition-colors hover:border-[#8B7CFF] hover:text-[#F2F2F5]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "h-5 w-5 shrink-0 rounded-full border-2 border-[#8B7CFF] opacity-0",
              brandPulse && "animate-[ceRing_2s_ease-in-out] opacity-100",
            )}
          />
          <h1
            className={cn(
              "truncate text-[15px] font-bold tracking-tight sm:text-base",
              brandPulse && "animate-[ceBrand_2s_ease-in-out]",
            )}
          >
            <span className="text-[#8B7CFF]">Circle</span>
            <span className="text-[#F2F2F5]"> 2edit</span>
          </h1>
        </div>

        <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-[#2A2C36] bg-[#1D1F27] px-2.5 py-1 font-mono text-[11px] text-[#9A9CAA] sm:px-3 sm:text-[11.5px]">
          <Sparkles className="h-3 w-3 text-[#5CE0C0]" />
          <span className="tabular-nums font-semibold text-[#5CE0C0]">{creditsLabel}</span>
        </span>
      </header>

      {/* Primary stage — image dominates */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#16181f_0%,#0E0F13_55%)]">
        {children}
      </main>

      {/* Controls under stage (not over the photo) */}
      {footer}

      {/* Bottom mode bar — icon + name */}
      <nav
        className="flex shrink-0 justify-center border-t border-[#22232C] bg-[#15161B] px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3 sm:py-2.5"
        aria-label="Circle 2edit mode"
      >
        <div className="inline-flex w-full max-w-md gap-1 rounded-2xl border border-[#2A2C36] bg-[#1D1F27] p-1 sm:w-auto">
          {(
            [
              { id: "remove" as const, label: "Remove", Icon: Eraser },
              { id: "add" as const, label: "Add", Icon: Plus },
              { id: "crop" as const, label: "Crop", Icon: Crop },
            ] as const
          ).map(({ id, label, Icon }) => {
            const on = mode === id;
            return (
              <button
                key={id}
                type="button"
                disabled={!!generating}
                onClick={() => onModeChange(id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors sm:min-w-[76px] sm:flex-none",
                  on
                    ? "bg-[#8B7CFF] text-[#0E0F13] shadow-md shadow-[#8B7CFF]/25"
                    : "text-[#9A9CAA] hover:text-[#F2F2F5]",
                  generating && "pointer-events-none opacity-40",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      <style>{`
        @keyframes ceBrand {
          0% { transform: scale(1); text-shadow: none; }
          25% { transform: scale(1.04); text-shadow: 0 0 12px rgba(139,124,255,0.5); }
          50% { transform: scale(1.02); text-shadow: 0 0 14px rgba(92,224,192,0.35); }
          100% { transform: scale(1); text-shadow: none; }
        }
        @keyframes ceRing {
          0% { transform: scale(0.55); opacity: 0; border-color: #8B7CFF; }
          40% { transform: scale(1.12); opacity: 1; border-color: #5CE0C0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export function CircleEditUploadZone({
  onPick,
  disabled,
}: {
  onPick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className="m-auto flex min-h-[min(52vh,420px)] w-full max-w-lg flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[#8B7CFF]/45 bg-[#15161B]/70 px-6 py-12 text-center transition hover:border-[#8B7CFF] hover:bg-[#8B7CFF]/10 disabled:opacity-50"
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#8B7CFF] to-[#5CE0C0] text-[#0E0F13] shadow-lg shadow-[#8B7CFF]/30">
        <Upload className="h-7 w-7" />
      </span>
      <span className="text-base font-bold text-[#F2F2F5]">Drop your photo here</span>
      <span className="text-sm text-[#9A9CAA]">or tap to choose · JPG / PNG / WEBP</span>
    </button>
  );
}
