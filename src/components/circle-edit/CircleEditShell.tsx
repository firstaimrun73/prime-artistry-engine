/**
 * Circle 2edit product shell — premium glass mobile editor.
 * Layout: header → stage → tools → compact generate control.
 * Continuous Meta-style ring (not dashed). Separate Clear Mask / Clear Image.
 * NO floating pull-down generation lever.
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

function ContinuousMetaRing({
  size = 32,
  generating,
  isDark,
}: {
  size?: number;
  generating?: boolean;
  isDark: boolean;
}) {
  // Final Circle2edit logo: single clean #7B6FE0 ring, empty center,
  // animated lavender flame-like motion rotating around the ring.
  // Unique ids per instance so header + gen overlay do not clash.
  const uid = `c2eLogo-${size}-${generating ? "g" : "i"}`;
  const spinSec = generating ? 1.6 : 3.2;
  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-hidden
      data-circle-brand-mark="true"
    >
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        className="overflow-visible"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={`${uid}-flame`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7B6FE0" stopOpacity="0" />
            <stop offset="35%" stopColor="#7B6FE0" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#A89BFF" stopOpacity="0.95" />
            <stop offset="75%" stopColor="#7B6FE0" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7B6FE0" stopOpacity="0" />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Base ring outline — solid lavender, empty center */}
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="#7B6FE0"
          strokeWidth="1.75"
          opacity={0.7}
        />
        {/* Flame arc: animate via SVG transform attribute (reliable vs CSS on <g>) */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 16 16"
            to="360 16 16"
            dur={`${spinSec}s`}
            repeatCount="indefinite"
          />
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke={`url(#${uid}-flame)`}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray="22 54"
            filter={`url(#${uid}-glow)`}
          />
        </g>
      </svg>
    </div>
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
    if (generating) {
      setPaintFlash(false);
      return;
    }
    const first = window.setTimeout(() => setPaintFlash(true), 1800);
    const interval = window.setInterval(() => setPaintFlash(true), 12500);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [generating]);
  useEffect(() => {
    if (!paintFlash) return;
    const hold = window.setTimeout(() => setPaintFlash(false), 1600);
    return () => window.clearTimeout(hold);
  }, [paintFlash]);
  const baseTwo = isDark ? "#C8C4E8" : "#7B6FE0";
  return (
    <div className="min-w-0">
      <p className="flex items-baseline gap-0 truncate text-[14px] font-bold tracking-tight sm:text-[15px]" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <span className={isDark ? "text-[#F2F2F5]" : "text-[#1A1C24]"}>Circle </span>
        <span className="relative inline-flex items-center justify-center px-[0.12em]" style={{ fontWeight: 800, fontStyle: "italic", letterSpacing: "-0.04em", color: paintFlash && !generating ? "#F97316" : baseTwo, textShadow: paintFlash && !generating ? "0 0 10px rgba(249,115,22,0.55), 0 1px 0 rgba(249,115,22,0.25)" : isDark ? "0 0 6px rgba(123,111,224,0.35)" : "0 1px 0 rgba(123,111,224,0.15)", transition: "color 0.45s ease, text-shadow 0.45s ease, transform 0.45s ease", transform: paintFlash && !generating ? "scale(1.12) rotate(-4deg)" : "scale(1) rotate(0deg)", display: "inline-block", lineHeight: 1 }}>
          2
        </span>
        <span className={isDark ? "text-[#F2F2F5]" : "text-[#1A1C24]"}>edit</span>
      </p>
      <p className={cn("truncate text-[11px]", isDark ? "text-[#7A8090]" : "text-[#6B7080]")}>{mode === "remove" ? "Circle · Remove" : "Circle · Add"}</p>
    </div>
  );
}

export function CircleGenerateControl({ disabled, onCommit, label, hint, energyBlink }: { disabled?: boolean; onCommit: () => void; label: string; hint?: string; energyBlink?: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [blinking, setBlinking] = useState(false);
  const handleClick = () => {
    if (disabled) return;
    if (!energyBlink) { onCommit(); return; }
    setBlinking(true);
    window.setTimeout(() => { setBlinking(false); onCommit(); }, 480);
  };
  return (
    <div className="relative flex flex-col items-center gap-1">
      <button type="button" disabled={disabled || blinking} onClick={handleClick} aria-label={label} className={cn("group relative flex h-11 items-center gap-2 overflow-hidden rounded-2xl border px-4 shadow-md backdrop-blur-xl transition-all active:scale-[0.97]", disabled || blinking ? "cursor-not-allowed opacity-45" : "hover:shadow-lg", isDark ? "border-[#7B6FE0]/45 bg-gradient-to-b from-[#7B6FE0]/35 to-[#5C54C0]/25 text-[#F2F2F5]" : "border-[#7B6FE0]/35 bg-gradient-to-b from-white/90 to-[#F0EEFA] text-[#1A1C24] shadow-[0_4px_20px_rgba(123,111,224,0.18)]")}>
        <span className={cn("grid h-7 w-7 place-items-center rounded-full", isDark ? "bg-[#7B6FE0]/40" : "bg-[#7B6FE0]/15")}><Sparkles className="h-3.5 w-3.5 text-[#7B6FE0]" /></span>
        <span className="text-[13px] font-semibold tracking-tight">{label}</span>
      </button>
      {hint ? <p className={cn("max-w-[14rem] text-center text-[10px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>{hint}</p> : null}
    </div>
  );
}

export function CircleCreditsInfo({ title, lines }: { title: string; lines: { label: string; value: string }[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" aria-label="Credit information" onClick={() => setOpen((v) => !v)} className={cn("grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md", isDark ? "border-white/12 bg-white/8 text-[#9AA0B0]" : "border-black/8 bg-white/70 text-[#5C6170]")}><Info className="h-3.5 w-3.5" /></button>
      {open ? (<><button type="button" className="fixed inset-0 z-[60]" aria-label="Close" onClick={() => setOpen(false)} /><div className={cn("fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] right-3 z-[70] w-56 rounded-xl border p-3 text-[11px] shadow-xl backdrop-blur-xl", isDark ? "border-white/12 bg-[#1A1C24]/95 text-[#F2F2F5]" : "border-black/8 bg-white/98 text-[#1A1C24]")} role="dialog"><div className="mb-2 flex items-center justify-between"><p className="font-semibold">{title}</p><button type="button" onClick={() => setOpen(false)}><X className="h-3.5 w-3.5 opacity-60" /></button></div><ul className="space-y-1.5">{lines.map((l) => (<li key={l.label} className="flex justify-between gap-2 tabular-nums"><span className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>{l.label}</span><span className="font-medium">{l.value}</span></li>))}</ul></div></>) : null}
    </div>
  );
}

export function CircleEditShell({ creditsLabel, mode, onModeChange, generating, onBack, children, controls, actionBar, sheet, hideModeToggle, addLocked, onGenerate, generateDisabled, generateHint, generateLabel, energyBlink }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const genLabel = generateLabel || (mode === "remove" ? "Remove Object" : "Add Object");

  // Non-essential tool controls: fade when idle, full opacity on interaction (opacity only).
  const IDLE_MS = 2800;
  const IDLE_OPACITY = 0.38;
  const [toolsIdle, setToolsIdle] = useState(false);
  const idleTimerRef = useRef<number | null>(null);

  const bumpActivity = useCallback(() => {
    setToolsIdle(false);
    if (idleTimerRef.current != null) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => setToolsIdle(true), IDLE_MS);
  }, []);

  useEffect(() => {
    if (generating) {
      setToolsIdle(false);
      if (idleTimerRef.current != null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }
    bumpActivity();
    const onActivity = () => bumpActivity();
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("pointermove", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("pointermove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      if (idleTimerRef.current != null) window.clearTimeout(idleTimerRef.current);
    };
  }, [generating, bumpActivity]);

  const idleStyle =
    !generating && toolsIdle
      ? { opacity: IDLE_OPACITY, transition: "opacity 0.45s ease" }
      : { opacity: 1, transition: "opacity 0.25s ease" };

  return (
    <div
      className={cn("flex h-[100dvh] flex-col overflow-hidden", isDark ? "bg-gradient-to-b from-[#12141A] via-[#14161E] to-[#101218] text-[#F2F2F5]" : "bg-gradient-to-b from-[#F7F8FB] via-[#F2F3F7] to-[#EEEFF4] text-[#1A1C24]")}
      data-circle-2edit="true"
      data-theme={theme}
      data-tools-idle={toolsIdle && !generating ? "true" : "false"}
    >
      <header className={cn("flex shrink-0 items-center gap-2.5 border-b px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3", isDark ? "border-white/8 bg-[#181A22]/70 backdrop-blur-xl" : "border-black/[0.05] bg-white/55 backdrop-blur-xl")}>
        <button type="button" onClick={onBack} aria-label="Back" className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl border backdrop-blur-md", isDark ? "border-white/10 bg-white/5 text-[#9AA0B0]" : "border-black/8 bg-white/70 text-[#5C6170]")}><ArrowLeft className="h-4 w-4" /></button>
        <div className="flex min-w-0 flex-1 items-center gap-2.5"><ContinuousMetaRing size={32} generating={generating} isDark={isDark} /><Circle2editTitle isDark={isDark} generating={generating} mode={mode} /></div>
        <div className={cn("shrink-0 rounded-xl border px-2.5 py-1 text-[11px] font-medium tabular-nums backdrop-blur-md", isDark ? "border-white/10 bg-white/5" : "border-black/8 bg-white/70")}>{creditsLabel}</div>
      </header>
      {!hideModeToggle && !generating ? (
        <div
          className={cn("flex shrink-0 items-center justify-center gap-2 border-b px-3 py-2 sm:px-4", isDark ? "border-white/6 bg-white/[0.02]" : "border-black/[0.04] bg-white/30")}
          style={idleStyle}
          data-circle-idle-fade="mode-toggle"
          onPointerEnter={bumpActivity}
        >
          {(["remove", "add"] as const).map((id) => {
            const active = mode === id;
            const locked = id === "add" && !!addLocked;
            return (<button key={id} type="button" disabled={!!generating || locked} onClick={() => onModeChange(id)} className={cn("rounded-full border px-4 py-1.5 text-[12px] font-semibold backdrop-blur-md", active ? "border-[#7B6FE0] bg-[#7B6FE0] text-white shadow-sm" : isDark ? "border-white/10 bg-white/5 text-[#9AA0B0]" : "border-black/10 bg-white/50 text-[#5C6170]", (generating || locked) && "opacity-50")}>{id === "remove" ? "Remove" : locked ? "Add locked" : "Add"}</button>);
          })}
        </div>
      ) : null}
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      {controls && !generating ? (
        <div
          className={cn("shrink-0 border-t px-3 py-2.5 backdrop-blur-xl sm:px-4", isDark ? "border-white/8 bg-[#181A22]/75" : "border-black/[0.05] bg-white/60")}
          data-circle-toolbar="true"
          data-circle-idle-fade="controls"
          style={idleStyle}
          onPointerEnter={bumpActivity}
        >
          {controls}
        </div>
      ) : null}
      {!generating && actionBar ? (
        <div data-circle-idle-fade="action-bar" style={idleStyle} onPointerEnter={bumpActivity}>
          {actionBar}
        </div>
      ) : null}
      {!generating ? sheet : null}
      {onGenerate && !generating ? (
        <div className={cn("flex shrink-0 justify-center border-t px-3 py-3 backdrop-blur-xl", isDark ? "border-white/8 bg-[#181A22]/85" : "border-black/[0.05] bg-white/70")} style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <CircleGenerateControl disabled={generateDisabled} onCommit={onGenerate} label={genLabel} hint={generateHint} energyBlink={energyBlink ?? mode === "add"} />
        </div>
      ) : null}
    </div>
  );
}

export function CircleEditUploadZone({ onPick }: { onPick: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button type="button" onClick={onPick} className={cn("flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 backdrop-blur-md", isDark ? "border-white/15 bg-white/5 hover:border-[#7B6FE0]/50" : "border-black/12 bg-white/70 hover:border-[#7B6FE0]/40")}>
      <Upload className="h-8 w-8 text-[#7B6FE0]" />
      <div className="text-center"><p className="text-sm font-semibold">Upload an image</p><p className={cn("mt-1 text-xs", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>Circle or paint an area, then Remove or Add</p></div>
    </button>
  );
}

export function CircleEditGenOverlay({ progressPct: _progressPct, activeStage, stageCount, caption }: { progressPct: number; activeStage: number; stageCount: number; caption: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div className={cn("absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 px-6 backdrop-blur-md", isDark ? "bg-[#12141A]/88" : "bg-[#F4F5F8]/88")} data-circle-generating="true">
      <ContinuousMetaRing size={96} generating isDark={isDark} />
      <p className="text-center text-[15px] font-bold tracking-tight">Circle <span style={{ color: "#7B6FE0", fontStyle: "italic" }}>2</span>edit</p>
      <p className="text-center text-sm font-medium text-[#7B6FE0]">{caption || "Generating…"}</p>
      <p className={cn("text-center text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>Preparing selection · Matching scene · Applying AI</p>
      <p className={cn("text-center text-[10px] tabular-nums", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>Stage {Math.min(activeStage + 1, stageCount)} of {stageCount}</p>
    </div>
  );
}

export function CircleEditActionBar({ onClearMask, onClearImage, hasMask, hasImage, statusText, infoSlot }: { onClearMask?: () => void; onClearImage?: () => void; hasMask?: boolean; hasImage?: boolean; statusText: string; infoSlot?: React.ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <div className={cn("flex shrink-0 flex-col gap-2 border-t px-3 py-2.5 backdrop-blur-xl sm:px-4", isDark ? "border-white/8 bg-[#181A22]/80" : "border-black/[0.05] bg-white/65")}>
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {hasImage ? <button type="button" onClick={onClearMask} disabled={!hasMask} className={cn("rounded-lg border px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-35", isDark ? "border-white/10 text-[#9AA0B0]" : "border-black/10 text-[#5C6170]")}>Clear mask</button> : null}
          {hasImage ? (confirmClear ? (<div className="flex items-center gap-1"><button type="button" onClick={() => { setConfirmClear(false); onClearImage?.(); }} className="rounded-lg border border-red-400/50 bg-red-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-red-500">Confirm clear</button><button type="button" onClick={() => setConfirmClear(false)} className={cn("rounded-lg border px-2 py-1.5 text-[11px]", isDark ? "border-white/10 text-[#9AA0B0]" : "border-black/10 text-[#5C6170]")}>Cancel</button></div>) : (<button type="button" onClick={() => setConfirmClear(true)} className={cn("rounded-lg border px-2.5 py-1.5 text-[11px] font-medium", isDark ? "border-white/10 text-[#9AA0B0]" : "border-black/10 text-[#5C6170]")}>Clear image</button>)) : null}
        </div>
        <p className={cn("min-w-0 flex-1 truncate text-center text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>{statusText}</p>
        {infoSlot ?? <span className="w-8" />}
      </div>
    </div>
  );
}

function ToolIconCircle({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path d="M7.2 9.5c-0.4-2.2 1.2-4.6 3.8-5.1 1.6-0.3 3.2 0.2 4.4 1.3 1.3 1.2 1.6 2.9 1.2 4.4 0.9 0.3 1.9 1.1 2.1 2.4 0.3 1.8-0.8 3.3-2.4 3.8 0.2 1.4-0.4 3-1.8 3.6-1.5 0.6-3.2 0.1-4.1-1.1-0.9 0.7-2.3 0.8-3.4 0.1-1.4-0.9-1.8-2.6-1.2-4-1.1-0.6-1.7-1.9-1.4-3.2 0.2-1 0.9-1.9 1.8-2.2z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" opacity={active ? 1 : 0.88} />
      <circle cx="7.5" cy="10.2" r="1.35" fill="currentColor" opacity={active ? 1 : 0.75} />
      <circle cx="8.8" cy="8.6" r="1.05" fill="none" stroke="currentColor" strokeWidth="1.2" opacity={0.9} />
    </svg>
  );
}

function ToolIconBrush({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path d="M15.2 3.2l5.6 5.6" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" opacity={active ? 1 : 0.85} />
      <path d="M12.6 8.4l3 3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity={0.75} />
      <path d="M4.2 19.2c1.6-2.4 3.8-4.2 6.4-5.2l2.4 2.4c-1.1 2.5-2.9 4.6-5.4 6.1-0.9 0.5-2.1 0.1-2.4-0.9-0.3-0.9 0.1-1.7-1-2.4z" fill="currentColor" opacity={active ? 0.95 : 0.8} />
    </svg>
  );
}

function ToolIconEraser({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path d="M4 15.2L11.2 8l6.8 6.8-3.4 3.4H7.4L4 15.2z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" opacity={active ? 1 : 0.88} />
      <path d="M8.2 17.2h8.4" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <path d="M5.5 19.8h9.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity={0.55} />
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
  const items: { id: CircleDrawTool; label: string; Icon: typeof ToolIconCircle }[] = hideCircle
    ? [{ id: "brush", label: "Brush", Icon: ToolIconBrush }, { id: "eraser", label: "Eraser", Icon: ToolIconEraser }]
    : [{ id: "circle", label: "Circle", Icon: ToolIconCircle }, { id: "brush", label: "Brush", Icon: ToolIconBrush }, { id: "eraser", label: "Eraser", Icon: ToolIconEraser }];
  const inkColors: { id: InkColor; label: string; swatch: string }[] = [
    { id: "purple", label: "Purple", swatch: "#7B6FE0" },
    { id: "white", label: "White", swatch: "#FFFFFF" },
    { id: "black", label: "Black", swatch: "#1A1C24" },
  ];
  return (
    <div className="flex flex-col gap-2" data-circle-draw-toolbar="true">
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <button
          type="button"
          aria-label="Undo"
          title="Undo"
          disabled={!canUndo}
          onClick={() => onUndo?.()}
          data-testid="circle-undo"
          className={cn(
            "flex h-10 min-w-[2.75rem] items-center justify-center gap-0.5 rounded-xl border px-2 text-[12px] font-bold backdrop-blur-md disabled:opacity-35",
            isDark ? "border-white/10 bg-white/5 text-[#C8C4E8]" : "border-black/8 bg-white/70 text-[#5C6170]",
          )}
        >
          <span aria-hidden className="text-[15px] leading-none">↶</span>
          <span className="text-[10px] font-semibold">Undo</span>
        </button>
        <button
          type="button"
          aria-label="Redo"
          title="Redo"
          disabled={!canRedo}
          onClick={() => onRedo?.()}
          data-testid="circle-redo"
          className={cn(
            "flex h-10 min-w-[2.75rem] items-center justify-center gap-0.5 rounded-xl border px-2 text-[12px] font-bold backdrop-blur-md disabled:opacity-35",
            isDark ? "border-white/10 bg-white/5 text-[#C8C4E8]" : "border-black/8 bg-white/70 text-[#5C6170]",
          )}
        >
          <span aria-hidden className="text-[15px] leading-none">↷</span>
          <span className="text-[10px] font-semibold">Redo</span>
        </button>
        {items.map((it) => {
          const active = tool === it.id;
          return (
            <button key={it.id} type="button" onClick={() => onTool(it.id)} aria-label={it.label} title={it.label} className={cn("flex h-11 w-11 flex-col items-center justify-center rounded-xl border backdrop-blur-md transition-colors", active ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.18)] text-[#7B6FE0]" : isDark ? "border-white/10 bg-white/5 text-[#9AA0B0]" : "border-black/8 bg-white/60 text-[#5C6170]")}>
              <it.Icon active={active} />
            </button>
          );
        })}
      </div>
      {(tool === "brush" || tool === "eraser" || tool === "circle") && onInkColor ? (
        <div className="flex items-center justify-center gap-2" data-testid="circle-ink">
          <span className={cn("text-[10px] font-medium", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>Ink</span>
          {inkColors.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              title={c.label}
              onClick={() => onInkColor(c.id)}
              className={cn(
                "h-7 w-7 rounded-full border-2 shadow-sm transition-transform",
                inkColor === c.id ? "border-[#7B6FE0] scale-110 ring-2 ring-[#7B6FE0]/30" : isDark ? "border-white/20" : "border-black/15",
              )}
              style={{ background: c.swatch }}
            />
          ))}
        </div>
      ) : null}
      {(tool === "brush" || tool === "eraser") && (
        <div className="flex items-center gap-2 px-1">
          <span className={cn("text-[10px]", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>Size</span>
          <input type="range" min={1} max={100} value={brushSize} onChange={(e) => onBrushSize(Number(e.target.value))} className="flex-1" />
          <span className="w-7 text-right text-[10px] tabular-nums">{brushSize}</span>
        </div>
      )}
    </div>
  );
}
