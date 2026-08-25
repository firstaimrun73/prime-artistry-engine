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
      {/* Header — Galaxy-style: back · ring logo · compact title · Moto Credits */}
      <header className="flex shrink-0 items-center gap-2.5 border-b border-[#22232C] bg-[#15161B] px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Image Studio"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-[#2A2C36] text-[#9A9CAA] transition-colors hover:border-[#8B7CFF] hover:text-[#F2F2F5]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {/* Circle ring logo — always visible; subtle glow pulse every 10s */}
          <span aria-hidden className="relative grid h-[22px] w-[22px] shrink-0 place-items-center">
            <span
              className={cn(
                "absolute inset-0 rounded-full border-2 border-[#8B7CFF]/70 transition-shadow duration-500",
                brandPulse &&
                  "animate-[ceRing_2s_ease-in-out] border-[#8B7CFF] shadow-[0_0_12px_2px_rgba(139,124,255,0.55)]",
              )}
            />
          </span>
          <h1
            className={cn(
              "truncate text-[15px] font-semibold tracking-tight text-[#F2F2F5]",
              brandPulse && "animate-[ceBrand_2s_ease-in-out]",
            )}
          >
            <span className="text-[#8B7CFF]">Circle</span>
            <span className="font-medium text-[#C8C9D0]"> 2edit</span>
          </h1>
        </div>

        {/* Moto Credits — M // mark, not coin/star */}
        <span
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-[#2A2C36] bg-[#1D1F27] px-2.5 py-1.5 text-[11px] text-[#9A9CAA] sm:px-3 sm:text-[11.5px]"
          title="Moto Credits"
        >
          <span
            aria-hidden
            className="inline-flex items-baseline gap-0.5 font-semibold leading-none tracking-tight text-[#5CE0C0]"
          >
            <span className="text-[12px] sm:text-[13px]">M</span>
            <span className="text-[10px] opacity-90">//</span>
          </span>
          <span className="tabular-nums font-semibold text-[#5CE0C0]">{creditsLabel}</span>
        </span>
      </header>

      {/* Stage — radial gradient like prototype */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(120%_100%_at_50%_0%,#16181f_0%,#0E0F13_60%)]">
        {children}
      </main>

      {/* Contextual controls (brush, ratios, add gallery, etc.) */}
      {controls ? (
        <div className="shrink-0 border-t border-[#22232C] bg-[#15161B] px-3 py-2.5 sm:px-4">
          {controls}
        </div>
      ) : null}

      {actionBar}

      {/* Bottom mode selector — prototype segmented control, relocated to bottom */}
      <nav
        className="flex shrink-0 gap-1 border-t border-[#22232C] bg-[#15161B] p-2 sm:p-2.5"
        aria-label="Circle 2edit mode"
      >
        {(
          [
            { id: "remove" as const, label: "Remove", Icon: Eraser },
            { id: "add" as const, label: "Add", Icon: Plus },
            { id: "crop" as const, label: "Crop", Icon: Crop },
          ] as const
        ).map(({ id, label, Icon }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              disabled={!!generating}
              onClick={() => onModeChange(id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-semibold transition-all sm:text-xs",
                active
                  ? "bg-[#8B7CFF]/15 text-[#8B7CFF] ring-1 ring-[#8B7CFF]/40"
                  : "text-[#9A9CAA] hover:bg-[#1D1F27] hover:text-[#F2F2F5]",
                generating && "opacity-50",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </nav>

      <style>{`
        @keyframes ceRing {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,124,255,0); transform: scale(1); }
          40% { box-shadow: 0 0 14px 3px rgba(139,124,255,0.45); transform: scale(1.08); }
        }
        @keyframes ceBrand {
          0%, 100% { opacity: 1; }
          40% { opacity: 0.85; }
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
      className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#2A2C36] bg-[#15161B]/80 px-6 py-16 text-center transition-colors hover:border-[#8B7CFF]/50 disabled:opacity-50"
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[#2A2C36] bg-[#1D1F27]">
        <Upload className="h-6 w-6 text-[#8B7CFF]" />
      </span>
      <div>
        <p className="text-sm font-semibold text-[#F2F2F5]">Drop your photo</p>
        <p className="mt-1 text-xs text-[#9A9CAA]">or tap to choose from device</p>
      </div>
    </button>
  );
}

/** Prototype-style generation ring overlay content */
export function CircleEditGenOverlay({
  progressPct,
  activeStage,
  stageCount,
  caption,
}: {
  progressPct: number;
  activeStage: number;
  stageCount: number;
  caption: string;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0E0F13]/75 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-4 px-6">
        <div className="relative grid h-24 w-24 place-items-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96" aria-hidden>
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="#2A2C36"
              strokeWidth="4"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="#8B7CFF"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - progressPct / 100)}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <span className="font-mono text-sm font-semibold tabular-nums text-[#F2F2F5]">
            {Math.round(progressPct)}%
          </span>
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
