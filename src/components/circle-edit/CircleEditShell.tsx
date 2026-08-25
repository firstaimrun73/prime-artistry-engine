/**
 * Circle 2edit product shell — design from circle-edit.html prototype.
 * Violet #8B7CFF · Teal #5CE0C0 · no Motio orange.
 * Layout: header → flex-1 stage → contextual controls → action bar → bottom modes.
 */
import { useEffect, useState } from "react";
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

type Props = {
  creditsLabel: string;
  mode: CircleEditMode;
  onModeChange: (m: CircleEditMode) => void;
  generating?: boolean;
  onBack: () => void;
  children: React.ReactNode;
  /** Mode-specific controls under the stage */
  controls?: React.ReactNode;
  /** Action row: Clear · status · primary CTA */
  actionBar?: React.ReactNode;
};

export function CircleEditShell({
  creditsLabel,
  mode,
  onModeChange,
  generating,
  onBack,
  children,
  controls,
  actionBar,
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
      data-circle-2edit="true"
    >
      {/* Header — prototype topbar */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[#22232C] bg-[#15161B] px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Image Studio"
          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] border border-[#2A2C36] text-[#9A9CAA] transition-colors hover:border-[#8B7CFF] hover:text-[#F2F2F5]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
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
            <span className="text-[#8B7CFF]">Circle</span>
            <span className="text-[#F2F2F5]"> 2edit</span>
          </h1>
        </div>

        <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-[#2A2C36] bg-[#1D1F27] px-3 py-1.5 font-mono text-[11.5px] text-[#9A9CAA]">
          <Sparkles className="h-3.5 w-3.5 text-[#5CE0C0]" />
          <span className="tabular-nums font-semibold text-[#5CE0C0]">{creditsLabel}</span>
        </span>
      </header>

      {/* Stage — radial gradient like prototype */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(120%_100%_at_50%_0%,#16181f_0%,#0E0F13_60%)]">
        {children}
      </main>

      {/* Contextual controls (brush row / add gallery / crop ratios) */}
      {controls}

      {/* Primary action bar */}
      {actionBar}

      {/* Bottom mode selector — prototype segmented control, relocated to bottom */}
      <nav
        className="flex shrink-0 justify-center border-t border-[#22232C] bg-[#15161B] px-3 py-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
        aria-label="Circle 2edit mode"
      >
        <div
          className="inline-flex w-full max-w-sm gap-0.5 rounded-full border border-[#2A2C36] bg-[#1D1F27] p-[3px] sm:w-auto"
          role="tablist"
        >
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
                role="tab"
                aria-selected={on}
                disabled={!!generating}
                onClick={() => onModeChange(id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-semibold transition-colors sm:flex-none sm:min-w-[96px]",
                  on
                    ? "bg-[#8B7CFF] text-[#0E0F13]"
                    : "text-[#9A9CAA] hover:text-[#F2F2F5]",
                  generating && "pointer-events-none opacity-40",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2.2} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>

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
      className="m-auto flex min-h-[min(50vh,400px)] w-full max-w-lg flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[#8B7CFF]/40 bg-[#15161B]/60 px-6 py-12 text-center transition hover:border-[#8B7CFF] hover:bg-[#8B7CFF]/08 disabled:opacity-50"
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#8B7CFF] to-[#5CE0C0] text-[#0E0F13] shadow-lg shadow-[#8B7CFF]/25">
        <Upload className="h-7 w-7" />
      </span>
      <span className="text-base font-bold text-[#F2F2F5]">Drop your photo here</span>
      <span className="text-sm text-[#9A9CAA]">or tap to choose · JPG / PNG / WEBP</span>
    </button>
  );
}

/** Prototype-style generation ring overlay content */
export function CircleEditGenOverlay({
  caption,
  progressPct,
  stageCount,
  activeStage,
}: {
  caption: string;
  progressPct: number;
  stageCount: number;
  activeStage: number;
}) {
  const ARC = 245;
  const offset = ARC - (ARC * Math.min(100, progressPct)) / 100;
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[rgba(9,10,13,0.72)] px-4 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-[18px] p-5">
        <div className="relative h-[88px] w-[88px]">
          <svg viewBox="0 0 88 88" className="h-[88px] w-[88px] -rotate-90">
            <circle cx="44" cy="44" r="39" fill="none" stroke="#2A2C36" strokeWidth="3" />
            <circle
              cx="44"
              cy="44"
              r="39"
              fill="none"
              stroke="#8B7CFF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={ARC}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.18s linear" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center font-mono text-[13px] text-[#F2F2F5]">
            {Math.round(progressPct)}%
          </div>
        </div>
        <div className="min-h-5 text-center text-sm font-semibold tracking-tight text-[#F2F2F5]">
          {caption}
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#5F6170]">
          Circle 2edit
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: stageCount }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-[5px] w-[5px] rounded-full transition-all",
                i < activeStage
                  ? "bg-[#4B4470]"
                  : i === activeStage
                    ? "scale-150 bg-[#8B7CFF]"
                    : "bg-[#2A2C36]",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CircleEditActionBar({
  onClear,
  statusText,
  ctaLabel,
  ctaCost,
  ctaDisabled,
  onCta,
  ctaVariant = "violet",
  extra,
}: {
  onClear?: () => void;
  statusText?: string;
  ctaLabel: string;
  ctaCost?: string;
  ctaDisabled?: boolean;
  onCta: () => void;
  ctaVariant?: "violet" | "teal" | "muted";
  extra?: React.ReactNode;
}) {
  return (
    <footer className="flex shrink-0 items-center gap-3 border-t border-[#22232C] bg-[#15161B] px-3 py-3 sm:px-4">
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-[#2A2C36] px-4 py-3 text-[13px] font-semibold text-[#9A9CAA] transition-colors hover:border-[#9A9CAA] hover:text-[#F2F2F5]"
        >
          Clear
        </button>
      )}
      {statusText ? (
        <span className="hidden text-xs text-[#9A9CAA] sm:block">{statusText}</span>
      ) : null}
      {extra}
      <button
        type="button"
        disabled={ctaDisabled}
        onClick={onCta}
        className={cn(
          "ml-auto flex items-center gap-2 whitespace-nowrap rounded-xl px-[22px] py-[13px] text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40",
          ctaVariant === "violet" && "bg-[#8B7CFF] text-[#0E0F13] hover:brightness-110",
          ctaVariant === "teal" && "bg-[#5CE0C0] text-[#0E0F13] hover:brightness-110",
          ctaVariant === "muted" &&
            "border border-[#2A2C36] bg-[#1D1F27] text-[#F2F2F5] hover:border-[#9A9CAA]",
        )}
      >
        <span>{ctaLabel}</span>
        {ctaCost ? (
          <span className="font-mono text-[11.5px] font-semibold opacity-75">· {ctaCost}</span>
        ) : null}
      </button>
    </footer>
  );
}
