/**
 * Circle 2edit product shell — premium glass mobile editor.
 * Layout: header → stage → tools → compact generate control.
 * Continuous Meta-style ring (not dashed). Separate Clear Mask / Clear Image.
 * Tool controls stay at full opacity (idle fade removed).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Info, Upload, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

export type CircleEditMode = "remove" | "add";
export type CircleDrawTool = "circle" | "brush" | "eraser";
export type InkColor = "purple" | "white" | "black";

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
  addLocked?: boolean;
  onGenerate?: () => void;
  generateDisabled?: boolean;
  generateHint?: string;
  generateLabel?: string;
  energyBlink?: boolean;
};

function ContinuousMetaRing({ size = 32, generating, isDark }: { size?: number; generating?: boolean; isDark: boolean }) {
  // Final Circle2edit logo: single clean #7B6FE0 ring, empty center,
  // continuous Meta-style spin. Do not change without explicit request.
  const id = `c2e-ring-${size}`;
  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox="0 0 40 40" className="overflow-visible">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7B6FE0" stopOpacity="0" />
            <stop offset="35%" stopColor="#7B6FE0" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#A89BFF" stopOpacity="0.9" />
            <stop offset="75%" stopColor="#7B6FE0" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7B6FE0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          cx="20"
          cy="20"
          r="14"
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="2.4"
          strokeLinecap="round"
          className={cn(
            "origin-center",
            generating
              ? "motion-safe:animate-[spin_1.2s_linear_infinite]"
              : "motion-safe:animate-[spin_10s_linear_infinite]",
          )}
        />
        <circle
          cx="20"
          cy="20"
          r="8.5"
          fill="none"
          stroke="#7B6FE0"
          strokeWidth="1.6"
          opacity={0.7}
        />
      </svg>
    </span>
  );
}

function Circle2editTitle({
  isDark,
  generating,
  mode,
}: {
  isDark: boolean;
  generating?: boolean;
  mode: CircleEditMode;
}) {
  const [paintFlash, setPaintFlash] = useState(false);
  useEffect(() => {
    if (!generating) return;
    setPaintFlash(true);
    const t = window.setTimeout(() => setPaintFlash(false), 900);
    return () => window.clearTimeout(t);
  }, [generating]);
  const baseTwo = isDark ? "#C8C4E8" : "#7B6FE0";
  return (
    <div className="min-w-0">
      <p className="truncate text-[15px] font-extrabold tracking-tight">
        Circle{" "}
        <span
          className="relative inline-flex items-center justify-center px-[0.12em]"
          style={{
            fontWeight: 800,
            fontStyle: "italic",
            letterSpacing: "-0.04em",
            color: paintFlash && !generating ? "#F97316" : baseTwo,
            textShadow:
              paintFlash && !generating
                ? "0 0 10px rgba(249,115,22,0.55), 0 1px 0 rgba(249,115,22,0.25)"
                : isDark
                  ? "0 0 6px rgba(123,111,224,0.35)"
                  : "0 1px 0 rgba(123,111,224,0.15)",
            transition: "color 0.45s ease, text-shadow 0.45s ease, transform 0.45s ease",
            transform: paintFlash && !generating ? "scale(1.12) rotate(-4deg)" : "scale(1) rotate(0deg)",
            display: "inline-block",
            lineHeight: 1,
          }}
        >
          2
        </span>
        edit
      </p>
      <p className={cn("truncate text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
        Motio2edit · {mode === "remove" ? "Remove" : "Add"}
      </p>
    </div>
  );
}

function CircleGenerateControl({
  disabled,
  onCommit,
  label,
  hint,
  energyBlink,
}: {
  disabled?: boolean;
  onCommit: () => void;
  label: string;
  hint?: string;
  energyBlink?: boolean;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [blinking, setBlinking] = useState(false);
  const handleClick = () => {
    if (disabled) return;
    if (energyBlink) {
      setBlinking(true);
      window.setTimeout(() => {
        setBlinking(false);
        onCommit();
      }, 280);
      return;
    }
    onCommit();
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        disabled={disabled || blinking}
        onClick={handleClick}
        aria-label={label}
        className={cn(
          "group relative flex h-11 items-center gap-2 overflow-hidden rounded-2xl border px-4 shadow-md backdrop-blur-xl transition-all active:scale-[0.97]",
          disabled || blinking ? "cursor-not-allowed opacity-45" : "hover:shadow-lg",
          isDark
            ? "border-[#7B6FE0]/45 bg-gradient-to-b from-[#7B6FE0]/35 to-[#5C54C0]/25 text-[#F2F2F5]"
            : "border-[#7B6FE0]/35 bg-gradient-to-b from-white/90 to-[#F0EEFA] text-[#1A1C24] shadow-[0_4px_20px_rgba(123,111,224,0.18)]",
        )}
      >
        <Sparkles className="h-4 w-4 text-[#7B6FE0]" />
        <span className="text-[13px] font-bold tracking-tight">{label}</span>
      </button>
      {hint ? (
        <p className={cn("text-center text-[10px]", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>{hint}</p>
      ) : null}
    </div>
  );
}

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
  onGenerate,
  generateDisabled,
  generateHint,
  generateLabel,
  energyBlink,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const genLabel = generateLabel || (mode === "remove" ? "Remove Object" : "Add Object");

  // Tool controls stay at full opacity (idle fade removed).

  return (
    <div
      className={cn(
        "flex h-[100dvh] flex-col overflow-hidden",
        isDark
          ? "bg-gradient-to-b from-[#12141A] via-[#14161E] to-[#101218] text-[#F2F2F5]"
          : "bg-gradient-to-b from-[#F7F8FB] via-[#F2F3F7] to-[#EEEFF4] text-[#1A1C24]",
      )}
      data-circle-2edit="true"
      data-theme={theme}
    >
      <header
        className={cn(
          "flex shrink-0 items-center gap-2.5 border-b px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3",
          isDark ? "border-white/8 bg-[#181A22]/70 backdrop-blur-xl" : "border-black/[0.05] bg-white/55 backdrop-blur-xl",
        )}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-xl border backdrop-blur-md",
            isDark ? "border-white/10 bg-white/5 text-[#9AA0B0]" : "border-black/8 bg-white/70 text-[#5C6170]",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <ContinuousMetaRing size={32} generating={generating} isDark={isDark} />
          <Circle2editTitle isDark={isDark} generating={generating} mode={mode} />
        </div>
        <div
          className={cn(
            "shrink-0 rounded-xl border px-2.5 py-1 text-[11px] font-medium tabular-nums backdrop-blur-md",
            isDark ? "border-white/10 bg-white/5" : "border-black/8 bg-white/70",
          )}
        >
          {creditsLabel}
        </div>
      </header>
      {!hideModeToggle && !generating ? (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center gap-2 border-b px-3 py-2 sm:px-4",
            isDark ? "border-white/6 bg-white/[0.02]" : "border-black/[0.04] bg-white/30",
          )}
        >
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
                  "rounded-full border px-4 py-1.5 text-[12px] font-semibold backdrop-blur-md",
                  active
                    ? "border-[#7B6FE0] bg-[#7B6FE0] text-white shadow-sm"
                    : isDark
                      ? "border-white/10 bg-white/5 text-[#9AA0B0]"
                      : "border-black/10 bg-white/50 text-[#5C6170]",
                  (generating || locked) && "opacity-50",
                )}
              >
                {id === "remove" ? (
                  "Remove"
                ) : locked ? (
                  <span className="inline-flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
                      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Add
                  </span>
                ) : (
                  "Add"
                )}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      {controls && !generating ? (
        <div
          className={cn(
            "shrink-0 border-t px-3 py-2.5 backdrop-blur-xl sm:px-4",
            isDark ? "border-white/8 bg-[#181A22]/75" : "border-black/[0.05] bg-white/60",
          )}
          data-circle-toolbar="true"
        >
          {controls}
        </div>
      ) : null}
      {!generating && actionBar ? <div>{actionBar}</div> : null}
      {!generating ? sheet : null}
      {onGenerate && !generating ? (
        <div
          className={cn(
            "flex shrink-0 justify-center border-t px-3 py-3 backdrop-blur-xl",
            isDark ? "border-white/8 bg-[#181A22]/85" : "border-black/[0.05] bg-white/70",
          )}
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <CircleGenerateControl
            disabled={generateDisabled}
            onCommit={onGenerate}
            label={genLabel}
            hint={generateHint}
            energyBlink={energyBlink ?? mode === "add"}
          />
        </div>
      ) : null}
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
        "flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 backdrop-blur-md",
        isDark
          ? "border-white/15 bg-white/5 hover:border-[#7B6FE0]/50"
          : "border-black/12 bg-white/70 hover:border-[#7B6FE0]/40",
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
  caption?: string;
}) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-md">
      <p className="text-center text-[15px] font-bold tracking-tight">
        Circle <span style={{ color: "#7B6FE0", fontStyle: "italic" }}>2</span>edit
      </p>
      <p className="text-center text-sm font-medium text-[#7B6FE0]">{caption || "Generating…"}</p>
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-[#7B6FE0] transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
        />
      </div>
      <p className="text-[11px] text-white/60">
        Step {activeStage + 1} / {stageCount}
      </p>
    </div>
  );
}

export function CircleEditActionBar({
  hasImage,
  hasMask,
  onClearMask,
  onClearImage,
  statusText,
  infoSlot,
}: {
  hasImage: boolean;
  hasMask: boolean;
  onClearMask: () => void;
  onClearImage: () => void;
  statusText?: string;
  infoSlot?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 border-t px-3 py-2.5 backdrop-blur-xl sm:px-4",
        isDark ? "border-white/8 bg-[#181A22]/80" : "border-black/[0.05] bg-white/65",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {hasImage ? (
            <button
              type="button"
              onClick={onClearMask}
              disabled={!hasMask}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-35",
                isDark ? "border-white/10 text-[#9AA0B0]" : "border-black/10 text-[#5C6170]",
              )}
            >
              Clear mask
            </button>
          ) : null}
          {hasImage ? (
            <button
              type="button"
              onClick={onClearImage}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-[11px] font-medium",
                isDark ? "border-white/10 text-[#9AA0B0]" : "border-black/10 text-[#5C6170]",
              )}
            >
              Clear image
            </button>
          ) : null}
        </div>
        {infoSlot}
      </div>
      {statusText ? (
        <p className={cn("text-center text-[11px]", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
          {statusText}
        </p>
      ) : null}
    </div>
  );
}

function ToolIconCircle({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <circle
        cx="9"
        cy="9"
        r="6.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        opacity={active ? 1 : 0.88}
      />
    </svg>
  );
}

function ToolIconBrush({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M7.2 9.5c-0.4-2.2 1.2-4.6 3.8-5.1 1.6-0.3 3.2 0.2 4.4 1.3 1.3 1.2 1.6 2.9 1.2 4.4 0.9 0.3 1.9 1.1 2.1 2.4 0.3 1.8-0.8 3.3-2.4 3.8 0.2 1.4-0.4 3-1.8 3.6-1.5 0.6-3.2 0.1-4.1-1.1-0.9 0.7-2.3 0.8-3.4 0.1-1.4-0.9-1.8-2.6-1.2-4-1.1-0.6-1.7-1.9-1.4-3.2 0.2-1 0.9-1.9 1.8-2.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={active ? 1 : 0.88}
      />
      <circle cx="7.5" cy="10.2" r="1.35" fill="currentColor" opacity={active ? 1 : 0.75} />
    </svg>
  );
}

function ToolIconEraser({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M4 12.5 L9.5 4.5 L13.5 7.5 L8 15.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.88}
      />
    </svg>
  );
}

export function CircleDrawToolbar({
  tool,
  onTool,
  brushSize,
  onBrushSize,
  hideCircle,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  inkColor = "purple",
  onInkColor,
}: {
  tool: CircleDrawTool;
  onTool: (t: CircleDrawTool) => void;
  brushSize: number;
  onBrushSize: (n: number) => void;
  hideCircle?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  inkColor?: InkColor;
  onInkColor?: (c: InkColor) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const items: { id: CircleDrawTool; label: string; Icon: (p: { active: boolean }) => JSX.Element }[] = [
    ...(hideCircle ? [] : [{ id: "circle" as const, label: "Circle", Icon: ToolIconCircle }]),
    { id: "brush", label: "Brush", Icon: ToolIconBrush },
    { id: "eraser", label: "Eraser", Icon: ToolIconEraser },
  ];
  const inkColors: { id: InkColor; label: string; swatch: string }[] = [
    { id: "purple", label: "Purple", swatch: "#7B6FE0" },
    { id: "white", label: "White", swatch: "#FFFFFF" },
    { id: "black", label: "Black", swatch: "#111111" },
  ];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          disabled={!canUndo}
          onClick={() => onUndo?.()}
          data-testid="circle-undo"
          className={cn(
            "flex h-10 min-w-[2.75rem] items-center justify-center gap-0.5 rounded-xl border px-2 text-[12px] font-bold backdrop-blur-md disabled:opacity-35",
            isDark ? "border-white/10 bg-white/5 text-[#C8C4E8]" : "border-black/8 bg-white/70 text-[#5C6170]",
          )}
        >
          <span aria-hidden className="text-[15px] leading-none">
            ↶
          </span>
          <span className="text-[10px] font-semibold">Undo</span>
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={() => onRedo?.()}
          data-testid="circle-redo"
          className={cn(
            "flex h-10 min-w-[2.75rem] items-center justify-center gap-0.5 rounded-xl border px-2 text-[12px] font-bold backdrop-blur-md disabled:opacity-35",
            isDark ? "border-white/10 bg-white/5 text-[#C8C4E8]" : "border-black/8 bg-white/70 text-[#5C6170]",
          )}
        >
          <span aria-hidden className="text-[15px] leading-none">
            ↷
          </span>
          <span className="text-[10px] font-semibold">Redo</span>
        </button>
        {items.map((it) => {
          const active = tool === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onTool(it.id)}
              aria-label={it.label}
              title={it.label}
              className={cn(
                "flex h-11 w-11 flex-col items-center justify-center rounded-xl border backdrop-blur-md transition-colors",
                active
                  ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.18)] text-[#7B6FE0]"
                  : isDark
                    ? "border-white/10 bg-white/5 text-[#9AA0B0]"
                    : "border-black/8 bg-white/60 text-[#5C6170]",
              )}
            >
              <it.Icon active={active} />
            </button>
          );
        })}
      </div>
      {onInkColor ? (
        <div className="flex items-center justify-center gap-2" data-testid="circle-ink" data-active-ink={inkColor}>
          <span className={cn("text-[10px] font-medium", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
            Ink
          </span>
          {inkColors.map((c) => {
            const selected = inkColor === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-label={c.label}
                aria-pressed={selected}
                title={c.label}
                data-ink={c.id}
                data-selected={selected ? "true" : "false"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onInkColor(c.id);
                }}
                className={cn(
                  "relative h-8 w-8 rounded-full border-2 shadow-sm transition-all",
                  selected
                    ? "border-[#7B6FE0] scale-110 ring-2 ring-[#7B6FE0]/45 shadow-[0_0_0_1px_rgba(123,111,224,0.35)]"
                    : isDark
                      ? "border-white/25 hover:border-white/40"
                      : "border-black/20 hover:border-black/35",
                )}
                style={{ background: c.swatch }}
              >
                {selected ? (
                  <span
                    className="pointer-events-none absolute inset-0 grid place-items-center"
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        c.id === "white" ? "bg-[#7B6FE0]" : "bg-white",
                        c.id === "white" ? "shadow-sm" : "shadow-[0_0_0_1px_rgba(0,0,0,0.25)]",
                      )}
                    />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {(tool === "brush" || tool === "eraser") && (
        <div className="flex items-center gap-2 px-1">
          <span className={cn("text-[10px]", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>Size</span>
          <input
            type="range"
            min={1}
            max={100}
            value={brushSize}
            onChange={(e) => onBrushSize(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-7 text-right text-[10px] tabular-nums">{brushSize}</span>
        </div>
      )}
    </div>
  );
}

export function CircleCreditsInfo({ title, lines }: { title: string; lines: string[] }) {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={title}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-lg border",
          isDark ? "border-white/10 text-[#9AA0B0]" : "border-black/10 text-[#5C6170]",
        )}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div
          className={cn(
            "absolute right-0 z-30 mt-1 w-56 rounded-xl border p-2.5 text-[11px] shadow-lg backdrop-blur-xl",
            isDark ? "border-white/10 bg-[#1A1C24]/95 text-[#C8C4E8]" : "border-black/10 bg-white/95 text-[#3A3E4C]",
          )}
        >
          <p className="mb-1 font-semibold">{title}</p>
          <ul className="space-y-0.5">
            {lines.map((l) => (
              <li key={l}>• {l}</li>
            ))}
          </ul>
          <button type="button" className="mt-2 text-[10px] underline opacity-70" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
