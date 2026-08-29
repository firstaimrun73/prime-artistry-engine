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
              "relative grid h-8 w-8 shrink-0 place-items-center transition-shadow",
              brandPulse && "shadow-[0_0_16px_rgba(123,111,224,0.45)]",
            )}
            aria-hidden
          >
            <svg viewBox="0 0 32 32" className="h-8 w-8">
              <circle
                cx="16"
                cy="16"
                r="12"
                fill="none"
                stroke="#7B6FE0"
                strokeWidth="2.2"
                strokeDasharray="6 4"
                className={cn(brandPulse ? "opacity-100" : "opacity-80", "transition-opacity")}
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 16 16"
                  to="360 16 16"
                  dur="8s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="16" cy="16" r="5" fill="none" stroke="#7B6FE0" strokeWidth="1.6" opacity="0.9" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-tight">Circle 2edit</p>
            <p className={cn("truncate text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
              Mark an area · Remove or Add
            </p>
          </div>
        </div>

        <div
          className={cn(
            "shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-medium tabular-nums",
            isDark ? "border-white/10 bg-white/5" : "border-black/8 bg-white",
          )}
        >
          {creditsLabel}
        </div>
      </header>

      {!hideModeToggle ? (
        <div className="flex shrink-0 items-center justify-center gap-2 border-b px-3 py-2 sm:px-4">
          {(["remove", "add"] as const).map((id) => {
            const active = mode === id;
            const locked = id === "add" && !!addLocked;
            return (
              <button
                key={id}
                type="button"
                disabled={!!generating || locked}
                onClick={() => onModeChange(id)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-[12px] font-semibold transition-colors",
                  active
                    ? "border-[#7B6FE0] bg-[#7B6FE0] text-white shadow-sm"
                    : isDark
                      ? "border-white/10 text-[#9AA0B0] hover:border-[#7B6FE0]/40"
                      : "border-black/10 text-[#5C6170] hover:border-[#7B6FE0]/40",
                  (generating || locked) && "opacity-50",
                )}
              >
                {id === "remove" ? "Remove" : locked ? "Add 🔒" : "Add"}
              </button>
            );
          })}
        </div>
      ) : null}

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
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 px-6",
        isDark ? "bg-[#12141A]/92" : "bg-[#F4F5F8]/92",
      )}
      data-circle-generating="true"
    >
      <div className="relative h-24 w-24 text-[#7B6FE0]">
        <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
          <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="opacity-20" />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(8, (progressPct / 100) * 251)} 251`}
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-sm font-bold tabular-nums">{Math.round(progressPct)}%</span>
      </div>
      <p className="text-center text-sm font-semibold">Generating…</p>
      <p className={cn("text-center text-xs", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>{caption}</p>
      <p className={cn("text-center text-[10px]", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
        Stage {Math.min(activeStage + 1, stageCount)} of {stageCount}
      </p>
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
}: {
  onClear?: () => void;
  statusText: string;
  ctaLabel: string;
  ctaCost?: string;
  ctaDisabled?: boolean;
  onCta: () => void;
  ctaVariant?: "violet" | "neutral";
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 border-t px-3 py-2.5 sm:px-4",
        isDark ? "border-white/8 bg-[#181A22]/95" : "border-black/6 bg-white/90 backdrop-blur-md",
      )}
    >
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className={cn(
            "rounded-lg border px-3 py-2 text-[12px] font-medium",
            isDark ? "border-white/10 text-[#9AA0B0]" : "border-black/10 text-[#5C6170]",
          )}
        >
          Clear
        </button>
      ) : (
        <span className="w-[52px]" />
      )}
      <p className={cn("min-w-0 flex-1 truncate text-center text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
        {statusText}
      </p>
      <button
        type="button"
        disabled={ctaDisabled}
        onClick={onCta}
        className={cn(
          "shrink-0 rounded-lg px-4 py-2 text-[12px] font-semibold transition-opacity disabled:opacity-40",
          ctaVariant === "violet"
            ? "bg-[#7B6FE0] text-white"
            : isDark
              ? "bg-white/10 text-[#F2F2F5]"
              : "bg-black/80 text-white",
        )}
      >
        {ctaLabel}
        {ctaCost ? <span className="ml-1.5 opacity-80">{ctaCost}</span> : null}
      </button>
    </div>
  );
}

const TOOL_HINTS: Record<CircleDrawTool, string> = {
  circle: "Draw a circle around the area",
  brush: "Paint the area",
  eraser: "Erase part of the mask",
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
      <div className="flex items-center justify-center gap-1.5">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onTool(it.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-semibold",
              tool === it.id
                ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.16)] text-[#7B6FE0]"
                : isDark
                  ? "border-white/10 text-[#9AA0B0]"
                  : "border-black/8 text-[#5C6170]",
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
      {(tool === "brush" || tool === "eraser") && (
        <div className="flex items-center gap-2 px-1">
          <span className={cn("text-[10px]", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>Size</span>
          <input
            type="range"
            min={8}
            max={64}
            value={brushSize}
            onChange={(e) => onBrushSize(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-6 text-right text-[10px] tabular-nums">{brushSize}</span>
        </div>
      )}
      <p className={cn("text-center text-[10px]", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
        {TOOL_HINTS[tool]}
      </p>
    </div>
  );
}
