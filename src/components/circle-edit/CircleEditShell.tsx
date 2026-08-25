/**
 * Circle Edit shell — frontend-only product UI (violet/teal identity).
 * Separate from Image Editor / Auto Edit. Remove mode wires to existing
 * generateMedia + SmartRemoveModal; Add/Crop are UI-ready stubs.
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
  // local tokens — not Motio orange
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
  bottomControls?: React.ReactNode;
  footer?: React.ReactNode;
};

export function CircleEditShell({
  creditsLabel,
  mode,
  onModeChange,
  generating,
  onBack,
  children,
  bottomControls,
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
    // pulse every 10s for 2s; paused while generating
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, [generating]);

  return (
    <div
      className="flex h-[100dvh] flex-col overflow-hidden bg-[#0E0F13] text-[#F2F2F5]"
      style={CSS_VARS}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-[#22232C] bg-[#15161B] px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Image Studio"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-[#2A2C36] text-[#9A9CAA] hover:border-[#8B7CFF] hover:text-[#F2F2F5]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <span
            aria-hidden
            className={cn(
              "h-[22px] w-[22px] shrink-0 rounded-full border-2 border-[#8B7CFF] opacity-0",
              brandPulse && "animate-[ceRing_2s_ease-in-out] opacity-100",
            )}
          />
          <h1
            className={cn(
              "truncate text-base font-bold tracking-tight",
              brandPulse && "animate-[ceBrand_2s_ease-in-out]",
            )}
          >
            <span className="text-[#8B7CFF]">Circle</span> 2edit
          </h1>
        </div>

        <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-[#2A2C36] bg-[#1D1F27] px-3 py-1.5 font-mono text-[11.5px] text-[#9A9CAA]">
          <Sparkles className="h-3 w-3 text-[#5CE0C0]" />
          <span className="tabular-nums text-[#5CE0C0]">{creditsLabel}</span>
        </span>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col">{children}</main>

      {bottomControls}

      {/* Mode toggle — bottom, icon + label */}
      <nav
        className="flex shrink-0 justify-center border-t border-[#22232C] bg-[#15161B] px-3 py-2.5"
        aria-label="Circle Edit mode"
      >
        <div className="inline-flex gap-1 rounded-2xl border border-[#2A2C36] bg-[#1D1F27] p-1">
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
                  "flex min-w-[72px] flex-col items-center gap-1 rounded-xl px-3.5 py-2 text-[11px] font-semibold transition-colors",
                  on
                    ? "bg-[#8B7CFF] text-[#0E0F13]"
                    : "text-[#9A9CAA] hover:text-[#F2F2F5]",
                  generating && "opacity-50",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      {footer}

      <style>{`
        @keyframes ceBrand {
          0% { transform: scale(1); text-shadow: none; }
          25% { transform: scale(1.05); text-shadow: 0 0 12px rgba(139,124,255,0.55); }
          50% { transform: scale(1.02); text-shadow: 0 0 16px rgba(92,224,192,0.4); }
          100% { transform: scale(1); text-shadow: none; }
        }
        @keyframes ceRing {
          0% { transform: scale(0.6); opacity: 0; border-color: #8B7CFF; }
          40% { transform: scale(1.15); opacity: 1; border-color: #5CE0C0; }
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
      className="mx-auto flex min-h-[42vh] w-full max-w-xl flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[#8B7CFF]/50 bg-[#15161B]/80 px-6 py-12 text-center transition hover:border-[#8B7CFF] hover:bg-[#8B7CFF]/10 disabled:opacity-50"
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#8B7CFF] to-[#5CE0C0] text-[#0E0F13] shadow-lg">
        <Upload className="h-7 w-7" />
      </span>
      <span className="text-base font-bold text-[#F2F2F5]">Drop your photo here</span>
      <span className="text-sm text-[#9A9CAA]">or tap to choose · JPG / PNG / WEBP</span>
    </button>
  );
}
