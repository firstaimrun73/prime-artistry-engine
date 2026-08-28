/**
 * Circle 2edit product shell — one professional editor.
 * Layout: header → stage → compact Remove/Add + tools → action bar.
 * Theme-aware (light/dark). No bottom mode nav. No Crop.
 */
import { useEffect, useState } from "react";
import { ArrowLeft, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

export type CircleEditMode = "remove" | "add";

type Props = {
  creditsLabel: string;
  mode: CircleEditMode;
  onModeChange: (m: CircleEditMode) => void;
  generating?: boolean;
  onBack: () => void;
  children: React.ReactNode;
  /** Mode-specific controls under the stage (tools + hints) */
  controls?: React.ReactNode;
  /** Action row: Clear · status · primary CTA */
  actionBar?: React.ReactNode;
  /** Optional sheet (e.g. Add assets) */
  sheet?: React.ReactNode;
  /** Hide mode toggle (e.g. result / generating) */
  hideModeToggle?: boolean;
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
  hideModeToggle,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
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
      className={cn(
        "flex h-[100dvh] flex-col overflow-hidden",
        isDark ? "bg-[#12141A] text-[#F2F2F5]" : "bg-[#F4F5F8] text-[#1A1C24]",
      )}
      data-circle-2edit="true"
      data-theme={theme}
    >
      <header
        className={cn(
          "flex shrink-0 items-center gap-2.5 border-b px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3",
          isDark
            ? "border-white/8 bg-[#181A22]/95 backdrop-blur-md"
            : "border-black/6 bg-white/80 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.04)]",
        )}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Studio"
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors",
            isDark
              ? "border-white/10 text-[#9AA0B0] hover:border-[#A89BFF]/50 hover:text-[#F2F2F5]"
              : "border-black/8 text-[#5C6170] hover:border-[#7B6FE0]/40 hover:text-[#1A1C24]",
          )}
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
              "truncate text-[15px] font-medium tracking-[-0.02em]",
              isDark ? "text-[#F2F2F5]" : "text-[#1A1C24]",
              brandPulse && "animate-[ceBrand_2s_ease-in-out]",
            )}
          >
            <span className="font-semibold text-[#A89BFF]">Circle</span>
            <span className={cn("font-medium", isDark ? "text-[#E8E9ED]" : "text-[#3A3E4C]")}>
              {" "}
              2edit
            </span>
          </h1>
        </div>

        <span
          className={cn(
            "ml-auto flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[12px] font-medium",
            isDark
              ? "border-white/10 bg-white/5 text-[#E8E9ED]"
              : "border-black/8 bg-white/90 text-[#3A3E4C] shadow-sm",
          )}
          title="Credits"
        >
          <span className="tabular-nums font-semibold text-[#A89BFF]">{creditsLabel}</span>
        </span>
      </header>

      <main
        className={cn(
          "relative flex min-h-0 flex-1 flex-col overflow-hidden",
          isDark
            ? "bg-[radial-gradient(120%_100%_at_50%_0%,#1A1D26_0%,#12141A_60%)]"
            : "bg-[radial-gradient(120%_100%_at_50%_0%,#FFFFFF_0%,#F0F1F5_70%)]",
        )}
      >
        {children}
      </main>

      {!hideModeToggle && !generating ? (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center border-t px-3 py-2 sm:px-4",
            isDark ? "border-white/8 bg-[#181A22]/95" : "border-black/6 bg-white/85 backdrop-blur-md",
          )}
        >
          <div
            className={cn(
              "inline-flex rounded-lg border p-0.5",
              isDark ? "border-white/10 bg-white/5" : "border-black/8 bg-black/[0.03]",
            )}
            role="tablist"
            aria-label="Edit operation"
          >
            {(
              [
                { id: "remove" as const, label: "Remove" },
                { id: "add" as const, label: "Add" },
              ] as const
            ).map(({ id, label }) => {
              const active = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={!!generating}
                  onClick={() => onModeChange(id)}
                  className={cn(
                    "min-w-[88px] rounded-md px-4 py-1.5 text-[12px] font-semibold transition-all",
                    active
                      ? "bg-[#A89BFF] text-[#12141A] shadow-sm"
                      : isDark
                        ? "text-[#9AA0B0] hover:text-[#F2F2F5]"
                        : "text-[#5C6170] hover:text-[#1A1C24]",
                    generating && "opacity-50",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {controls ? (
        <div
          className={cn(
            "shrink-0 border-t px-3 py-2.5 sm:px-4",
            isDark ? "border-white/8 bg-[#181A22]/95" : "border-black/6 bg-white/85 backdrop-blur-md",
          )}
        >
          {controls}
        </div>
      ) : null}

      {actionBar}

      {sheet}

      <div
        className={cn(
          "shrink-0 pb-[max(0.25rem,env(safe-area-inset-bottom))]",
          isDark ? "bg-[#181A22]" : "bg-white/85",
        )}
      />

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
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={cn(
        "mx-auto flex w-full max-w-sm flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-14 text-center transition-all disabled:opacity-50",
        isDark
          ? "border-white/12 bg-white/[0.03] hover:border-[#A89BFF]/40 hover:bg-white/[0.05]"
          : "border-black/10 bg-white/70 shadow-sm hover:border-[#7B6FE0]/35 hover:bg-white",
      )}
    >
      <span
        className={cn(
          "grid h-12 w-12 place-items-center rounded-xl border",
          isDark ? "border-white/10 bg-white/5" : "border-black/6 bg-[#F4F5F8]",
        )}
      >
        <Upload className="h-5 w-5 text-[#A89BFF]" />
      </span>
      <div>
        <p className={cn("text-sm font-semibold", isDark ? "text-[#F2F2F5]" : "text-[#1A1C24]")}>
          Upload an image
        </p>
        <p className={cn("mt-1 text-xs", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          Tap to choose from device
        </p>
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const pct = Math.max(0, Math.min(100, Math.round(progressPct)));

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-[3px]",
        isDark ? "bg-[#12141A]/80" : "bg-[#F4F5F8]/85",
      )}
    >
      <div className="flex flex-col items-center gap-4 px-6">
        <div className="relative grid h-24 w-24 place-items-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96" aria-hidden>
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke={isDark ? "#2E3140" : "#D8DAE0"}
              strokeWidth="4"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="#A89BFF"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - pct / 100)}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          {/* Animated violet ring — Circle 2edit identity */}
          <span
            className="absolute inset-[18px] rounded-full border-2 border-[#A89BFF]/60 animate-[ceRing_2s_ease-in-out_infinite]"
            aria-hidden
          />
          <span
            className={cn(
              "relative z-[1] font-mono text-sm font-semibold tabular-nums",
              isDark ? "text-[#F2F2F5]" : "text-[#1A1C24]",
            )}
          >
            {pct}%
          </span>
        </div>
        <div
          className={cn(
            "min-h-5 text-center text-sm font-medium tracking-tight",
            isDark ? "text-[#F2F2F5]" : "text-[#1A1C24]",
          )}
        >
          {caption}
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#A89BFF]/90">
          Circle 2edit
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: stageCount }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-[5px] w-[5px] rounded-full transition-all",
                i < activeStage
                  ? "bg-[#A89BFF]/40"
                  : i === activeStage
                    ? "scale-150 bg-[#A89BFF]"
                    : isDark
                      ? "bg-[#2E3140]"
                      : "bg-[#D8DAE0]",
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
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <footer
      className={cn(
        "flex shrink-0 items-center gap-3 border-t px-3 py-3 sm:px-4",
        isDark ? "border-white/8 bg-[#181A22]/95" : "border-black/6 bg-white/90 backdrop-blur-md",
      )}
    >
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className={cn(
            "rounded-lg border px-3.5 py-2.5 text-[13px] font-medium transition-colors",
            isDark
              ? "border-white/10 text-[#9AA0B0] hover:border-white/20 hover:text-[#F2F2F5]"
              : "border-black/10 text-[#5C6170] hover:border-black/20 hover:text-[#1A1C24]",
          )}
        >
          Clear
        </button>
      )}
      {statusText ? (
        <span
          className={cn(
            "hidden max-w-[40%] truncate text-xs sm:block",
            isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
          )}
        >
          {statusText}
        </span>
      ) : null}
      {extra}
      <button
        type="button"
        disabled={ctaDisabled}
        onClick={onCta}
        className={cn(
          "ml-auto flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:px-5",
          ctaVariant === "violet" && "bg-[#A89BFF] text-[#12141A] hover:brightness-110",
          ctaVariant === "teal" && "bg-[#5CE0C0] text-[#12141A] hover:brightness-110",
          ctaVariant === "muted" &&
            (isDark
              ? "border border-white/10 bg-white/5 text-[#F2F2F5] hover:border-white/20"
              : "border border-black/10 bg-black/[0.03] text-[#1A1C24] hover:border-black/20"),
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

const TOOL_HINTS: Record<CircleDrawTool, string> = {
  circle: "Draw around an object to select it",
  brush: "Paint areas into the selection",
  eraser: "Remove areas from the selection",
};

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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const items: { id: CircleDrawTool; label: string }[] = [
    { id: "circle", label: "Circle" },
    { id: "brush", label: "Brush" },
    { id: "eraser", label: "Eraser" },
  ];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        {items.map(({ id, label }) => {
          const active = tool === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTool(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-medium transition-all",
                active
                  ? "bg-[#A89BFF] text-[#12141A] shadow-sm"
                  : isDark
                    ? "border border-white/10 bg-white/5 text-[#C5C7D0] hover:border-[#A89BFF]/40"
                    : "border border-black/8 bg-white text-[#3A3E4C] hover:border-[#7B6FE0]/35",
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
      <p
        className={cn(
          "text-center text-[11px] leading-snug",
          isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
        )}
      >
        {TOOL_HINTS[tool]}
      </p>
      {(tool === "brush" || tool === "eraser") && (
        <div className="flex items-center gap-2.5 px-0.5">
          <span
            className={cn(
              "shrink-0 text-[11px] font-medium",
              isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
            )}
          >
            Size
          </span>
          <input
            type="range"
            min={4}
            max={50}
            value={brushSize}
            onChange={(e) => onBrushSize(Number(e.target.value))}
            className="h-1.5 w-full accent-[#A89BFF]"
          />
          <span
            className={cn(
              "w-8 shrink-0 text-right font-mono text-[11px] tabular-nums",
              isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]",
            )}
          >
            {brushSize}px
          </span>
        </div>
      )}
    </div>
  );
}
