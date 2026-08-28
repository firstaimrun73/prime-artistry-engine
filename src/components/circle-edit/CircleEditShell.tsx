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
  /** Optional bottom sheet (e.g. Add assets) — rendered above nav */
  sheet?: React.ReactNode;
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
  sheet,
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
      className="flex h-[100dvh] flex-col overflow-hidden bg-[#12141A] text-[#F2F2F5]"
      data-circle-2edit="true"
    >
      <header className="flex shrink-0 items-center gap-2.5 border-b border-[#2A2E3A] bg-[#181A22] px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Studio"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-[#2E3140] text-[#9AA0B0] transition-colors hover:border-[#A89BFF] hover:text-[#F2F2F5]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span aria-hidden className="relative grid h-[22px] w-[22px] shrink-0 place-items-center">
            <span
              className={cn(
                "absolute inset-0 rounded-full border-2 border-[#A89BFF]/70 transition-shadow duration-500",
                brandPulse &&
                  "animate-[ceRing_2s_ease-in-out] border-[#A89BFF] shadow-[0_0_12px_2px_rgba(168,155,255,0.5)]",
              )}
            />
          </span>
          <h1
            className={cn(
              "truncate text-[15px] font-medium tracking-[-0.02em] text-[#F2F2F5]",
              brandPulse && "animate-[ceBrand_2s_ease-in-out]",
            )}
          >
            <span className="font-semibold text-[#A89BFF]">Circle</span>
            <span className="font-medium text-[#E8E9ED]"> 2edit</span>
          </h1>
        </div>

        {/* Real credit balance only — no M / infinity badge */}
        <span
          className="ml-auto flex shrink-0 items-center rounded-full border border-[#2E3140] bg-[#22252F] px-3 py-1.5 text-[12px] font-medium text-[#E8E9ED]"
          title="Credits"
        >
          <span className="tabular-nums font-semibold text-[#A89BFF]">{creditsLabel}</span>
        </span>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(120%_100%_at_50%_0%,#1A1D26_0%,#12141A_60%)]">
        {children}
      </main>

      {controls ? (
        <div className="shrink-0 border-t border-[#2A2E3A] bg-[#181A22] px-3 py-2.5 sm:px-4">
          {controls}
        </div>
      ) : null}

      {actionBar}

      {sheet}

      <nav
        className="flex shrink-0 gap-1 border-t border-[#2A2E3A] bg-[#181A22] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-2.5"
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
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-medium transition-all sm:text-xs",
                active
                  ? "bg-[#A89BFF]/18 text-[#A89BFF] ring-1 ring-[#A89BFF]/45"
                  : "text-[#9AA0B0] hover:bg-[#1E212B] hover:text-[#F2F2F5]",
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
          0%, 100% { box-shadow: 0 0 0 0 rgba(168,155,255,0); transform: scale(1); }
          40% { box-shadow: 0 0 14px 3px rgba(168,155,255,0.45); transform: scale(1.08); }
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
      className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#2E3140] bg-[#1A1C24]/90 px-6 py-16 text-center transition-colors hover:border-[#A89BFF]/50 disabled:opacity-50"
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[#2E3140] bg-[#22252F]">
        <Upload className="h-6 w-6 text-[#A89BFF]" />
      </span>
      <div>
        <p className="text-sm font-semibold text-[#F2F2F5]">Drop your photo</p>
        <p className="mt-1 text-xs text-[#9AA0B0]">or tap to choose from device</p>
      </div>
    </button>
  );
}

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
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#12141A]/75 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-4 px-6">
        <div className="relative grid h-24 w-24 place-items-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96" aria-hidden>
            <circle cx="48" cy="48" r="40" fill="none" stroke="#2E3140" strokeWidth="4" />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="#A89BFF"
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
        <div className="min-h-5 text-center text-sm font-medium tracking-tight text-[#F2F2F5]">
          {caption}
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#6B7080]">
          Circle 2edit
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: stageCount }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-[5px] w-[5px] rounded-full transition-all",
                i < activeStage
                  ? "bg-[#5A5578]"
                  : i === activeStage
                    ? "scale-150 bg-[#A89BFF]"
                    : "bg-[#2E3140]",
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
    <footer className="flex shrink-0 items-center gap-3 border-t border-[#2A2E3A] bg-[#181A22] px-3 py-3 sm:px-4">
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-[#2E3140] px-4 py-3 text-[13px] font-medium text-[#9AA0B0] transition-colors hover:border-[#9AA0B0] hover:text-[#F2F2F5]"
        >
          Clear
        </button>
      )}
      {statusText ? (
        <span className="hidden text-xs text-[#9AA0B0] sm:block">{statusText}</span>
      ) : null}
      {extra}
      <button
        type="button"
        disabled={ctaDisabled}
        onClick={onCta}
        className={cn(
          "ml-auto flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-[13px] text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:px-[22px]",
          ctaVariant === "violet" && "bg-[#A89BFF] text-[#12141A] hover:brightness-110",
          ctaVariant === "teal" && "bg-[#5CE0C0] text-[#12141A] hover:brightness-110",
          ctaVariant === "muted" &&
            "border border-[#2E3140] bg-[#22252F] text-[#F2F2F5] hover:border-[#9AA0B0]",
        )}
      >
        <span className="truncate">{ctaLabel}</span>
        {ctaCost ? (
          <span className="shrink-0 font-mono text-[11.5px] font-medium opacity-75">· {ctaCost}</span>
        ) : null}
      </button>
    </footer>
  );
}

export type CircleDrawTool = "circle" | "brush" | "eraser";

export function CircleDrawToolbar({
  tool,
  onTool,
  brushSize,
  onBrushSize,
}: {
  tool: CircleDrawTool;
  onTool: (t: CircleDrawTool) => void;
  brushSize: number;
  onBrushSize: (n: number) => void;
}) {
  const items: { id: CircleDrawTool; label: string }[] = [
    { id: "circle", label: "Circle" },
    { id: "brush", label: "Brush" },
    { id: "eraser", label: "Eraser" },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        {items.map(({ id, label }) => {
          const active = tool === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTool(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[12px] font-medium transition-all",
                active
                  ? "bg-[#A89BFF] text-[#12141A] shadow-sm"
                  : "border border-[#2E3140] bg-[#1E212B] text-[#C5C7D0] hover:border-[#A89BFF]/50",
              )}
            >
              {id === "circle" && (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-current" />
              )}
              {id === "brush" && (
                <span className="h-3.5 w-3.5 rounded-full bg-current opacity-80" />
              )}
              {id === "eraser" && (
                <span className="h-3 w-3.5 rounded-sm border border-current bg-transparent" />
              )}
              {label}
            </button>
          );
        })}
      </div>
      {tool === "brush" && (
        <div className="flex items-center gap-2.5 px-0.5">
          <span className="shrink-0 text-[11px] font-medium text-[#9AA0B0]">Size</span>
          <input
            type="range"
            min={1}
            max={50}
            value={brushSize}
            onChange={(e) => onBrushSize(Number(e.target.value))}
            className="h-1.5 w-full accent-[#A89BFF]"
          />
          <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums text-[#C5C7D0]">
            {brushSize}px
          </span>
        </div>
      )}
    </div>
  );
}
