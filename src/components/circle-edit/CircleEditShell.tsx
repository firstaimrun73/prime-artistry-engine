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
export type CircleDrawTool = "circle" | "brush" | "eraser";

type Props = {
  creditsLabel: string;
  mode: CircleEditMode;
  onModeChange: (m: CircleEditMode) => void;
  generating?: boolean;
  onBack: () => void;
  children: React.ReactNode;
  controls?: React.ReactNode;
  actionBar?: React.ReactNode;
  sheet?: React.ReactNode;
  hideModeToggle?: boolean;
  /** When true, Add mode is visually locked (Free plan). */
  addLocked?: boolean;
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
  addLocked,
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
              ? "border-white/10 text-[#9AA0B0] hover:border-[#7B6FE0]/50 hover:text-[#F2F2F5]"
              : "border-black/8 text-[#5C6170] hover:border-[#7B6FE0]/40 hover:text-[#1A1C24]",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#7B6FE0] text-[11px] font-bold text-white transition-shadow",
              brandPulse && "shadow-[0_0_16px_rgba(123,111,224,0.55)]",
            )}
          >
            C2
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-tight">Circle 2edit</p>
            <p className={cn("truncate text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
              {creditsLabel}
            </p>
          </div>
        </div>

        {!hideModeToggle && (
          <div
            className={cn(
              "flex shrink-0 rounded-lg border p-0.5",
              isDark ? "border-white/10 bg-white/5" : "border-black/8 bg-white",
            )}
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
                  aria-selected={active}
                  disabled={!!generating || (id === "add" && !!addLocked)}
                  onClick={() => onModeChange(id)}
                  className={cn(
                    "min-w-[88px] rounded-md px-4 py-1.5 text-[12px] font-semibold transition-all",
                    active
                      ? "bg-[#7B6FE0] text-white shadow-sm"
                      : isDark
                        ? "text-[#9AA0B0] hover:text-[#F2F2F5]"
                        : "text-[#5C6170] hover:text-[#1A1C24]",
                    (generating || (id === "add" && addLocked)) && "opacity-50",
                    id === "add" && addLocked && "cursor-not-allowed",
                  )}
                >
                  {id === "add" && addLocked ? "Add 🔒" : label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>

      {controls ? (
        <div
          className={cn(
            "shrink-0 border-t px-3 py-2.5 sm:px-4",
            isDark ? "border-white/8 bg-[#181A22]/90" : "border-black/6 bg-white/90",
          )}
        >
          {controls}
        </div>
      ) : null}

      {actionBar}
      {sheet}
    </div>
  );
}

export function CircleEditUploadZone({ onPick }: { onPick: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 transition-colors",
        isDark
          ? "border-white/15 bg-white/5 hover:border-[#7B6FE0]/50"
          : "border-black/12 bg-white hover:border-[#7B6FE0]/40",
      )}
    >
      <Upload className="h-8 w-8 text-[#7B6FE0]" />
      <div className="text-center">
        <p className="text-sm font-semibold">Upload an image</p>
        <p className={cn("mt-1 text-xs", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          Circle or paint an area, then Remove or Add
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
            <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="opacity-20" />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="#7B6FE0"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 251} 251`}
            />
          </svg>
          <span className="text-sm font-semibold tabular-nums">{pct}%</span>
        </div>
        <p className="text-center text-sm font-medium">{caption}</p>
        <p className={cn("text-center text-xs", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          Stage {Math.min(activeStage + 1, stageCount)} of {stageCount}
        </p>
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
  const ctaBg =
    ctaVariant === "teal" ? "bg-teal-600" : ctaVariant === "muted" ? "bg-[#5C6170]" : "bg-[#7B6FE0]";
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
            "rounded-lg border px-3 py-2.5 text-sm font-medium",
            isDark ? "border-white/10 text-[#C5C7D0]" : "border-black/10 text-[#3A3E4C]",
          )}
        >
          Clear
        </button>
      )}
      <div className="min-w-0 flex-1">
        {statusText ? (
          <p className={cn("truncate text-[12px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
            {statusText}
          </p>
        ) : null}
        {extra}
      </div>
      <button
        type="button"
        disabled={ctaDisabled}
        onClick={onCta}
        className={cn(
          "rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50",
          ctaBg,
        )}
      >
        {ctaLabel}
        {ctaCost ? <span className="ml-1.5 opacity-90">· {ctaCost}</span> : null}
      </button>
    </footer>
  );
}

const TOOL_HINTS: Record<CircleDrawTool, string> = {
  circle: "Draw freehand and close the path to select an area",
  brush: "Paint the area to edit",
  eraser: "Erase part of your selection",
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
                  ? "bg-[#7B6FE0] text-white shadow-sm"
                  : isDark
                    ? "border border-white/10 bg-white/5 text-[#C5C7D0] hover:border-[#7B6FE0]/40"
                    : "border border-black/8 bg-white text-[#3A3E4C] hover:border-[#7B6FE0]/35",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className={cn("text-center text-[11px] leading-snug", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
        {TOOL_HINTS[tool]}
      </p>
      {(tool === "brush" || tool === "eraser") && (
        <div className="flex items-center gap-2.5 px-0.5">
          <span className={cn("shrink-0 text-[11px] font-medium", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
            Size
          </span>
          <input
            type="range"
            min={4}
            max={50}
            value={brushSize}
            onChange={(e) => onBrushSize(Number(e.target.value))}
            className="h-1.5 w-full accent-[#7B6FE0]"
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
