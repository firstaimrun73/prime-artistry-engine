/**
 * Circle 2edit product shell — premium glass mobile editor.
 * Layout: compact header → maximized stage with floating glass toolbar → generate.
 * Continuous Meta-style ring (not dashed). Separate Clear Mask / Clear Image.
 * Tool icons stay at full opacity (no idle/disabled wash-out except deliberate primary disabled).
 * Floating toolbar docks to bottom edge of canvas (9:16-optimized).
 */
import { useEffect, useState } from "react";
import { ArrowLeft, Info, Upload, Sparkles } from "lucide-react";
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
  /** When true, collapse header/toggle for max canvas (image loaded). */
  hasImage?: boolean;
};

function ContinuousMetaRing({ size = 32, generating }: { size?: number; generating?: boolean }) {
  const id = `c2e-ring-${size}`;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-hidden>
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
        <circle cx="20" cy="20" r="14" fill="none" stroke={`url(#${id})`} strokeWidth="2.4" strokeLinecap="round" className={cn("origin-center", generating ? "motion-safe:animate-[spin_1.2s_linear_infinite]" : "motion-safe:animate-[spin_10s_linear_infinite]")} />
        <circle cx="20" cy="20" r="8.5" fill="none" stroke="#7B6FE0" strokeWidth="1.6" opacity={0.7} />
      </svg>
    </span>
  );
}

function Circle2editTitle({ isDark, generating, mode, compact }: { isDark: boolean; generating?: boolean; mode: CircleEditMode; compact?: boolean }) {
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
      <p className={cn("truncate font-extrabold tracking-tight", compact ? "text-[13px]" : "text-[15px]")}>
        Circle{" "}
        <span className="relative inline-flex items-center justify-center px-[0.12em]" style={{ fontWeight: 800, fontStyle: "italic", letterSpacing: "-0.04em", color: paintFlash && !generating ? "#F97316" : baseTwo, textShadow: paintFlash && !generating ? "0 0 10px rgba(249,115,22,0.55), 0 1px 0 rgba(249,115,22,0.25)" : isDark ? "0 0 6px rgba(123,111,224,0.35)" : "0 1px 0 rgba(123,111,224,0.15)", transition: "color 0.45s ease, text-shadow 0.45s ease, transform 0.45s ease", transform: paintFlash && !generating ? "scale(1.12) rotate(-4deg)" : "scale(1) rotate(0deg)", display: "inline-block", lineHeight: 1 }}>2</span>
        edit
      </p>
      {!compact ? <p className={cn("truncate text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>Motio2edit · {mode === "remove" ? "Remove" : "Add"}</p> : null}
    </div>
  );
}

function CircleGenerateControl({ disabled, onCommit, label, hint, energyBlink }: { disabled?: boolean; onCommit: () => void; label: string; hint?: string; energyBlink?: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [blinking, setBlinking] = useState(false);
  const handleClick = () => {
    if (disabled) return;
    if (energyBlink) {
      setBlinking(true);
      window.setTimeout(() => { setBlinking(false); onCommit(); }, 280);
      return;
    }
    onCommit();
  };
  const disabledLook = disabled || blinking;
  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" disabled={disabledLook} onClick={handleClick} aria-label={label} className={cn("group relative flex h-11 items-center gap-2 overflow-hidden rounded-2xl border px-4 shadow-md backdrop-blur-xl transition-all active:scale-[0.97]", disabledLook ? cn("cursor-not-allowed", isDark ? "border-white/10 bg-[#2A2C36] text-[#6B7080]" : "border-black/10 bg-[#E8E9EE] text-[#8A90A0]") : "hover:shadow-lg", !disabledLook && (isDark ? "border-[#7B6FE0]/45 bg-gradient-to-b from-[#7B6FE0]/35 to-[#5C54C0]/25 text-[#F2F2F5]" : "border-[#7B6FE0]/35 bg-gradient-to-b from-white/90 to-[#F0EEFA] text-[#1A1C24] shadow-[0_4px_20px_rgba(123,111,224,0.18)]"))}>
        <Sparkles className={cn("h-4 w-4", disabledLook ? "text-current" : "text-[#7B6FE0]")} />
        <span className="text-[13px] font-bold tracking-tight">{label}</span>
      </button>
      {hint ? <p className={cn("text-center text-[10px]", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>{hint}</p> : null}
    </div>
  );
}

export function CircleEditShell({ creditsLabel, mode, onModeChange, generating, onBack, children, controls, actionBar, sheet, hideModeToggle, addLocked, onGenerate, generateDisabled, generateHint, generateLabel, energyBlink, hasImage }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const genLabel = generateLabel || (mode === "remove" ? "Remove Object" : "Add Object");
  const compact = !!hasImage && !generating;
  return (
    <div className={cn("flex h-[100dvh] flex-col overflow-hidden", isDark ? "bg-gradient-to-b from-[#12141A] via-[#14161E] to-[#101218] text-[#F2F2F5]" : "bg-gradient-to-b from-[#F7F8FB] via-[#F2F3F7] to-[#EEEFF4] text-[#1A1C24]")} data-circle-2edit="true" data-theme={theme} data-compact={compact ? "true" : "false"}>
      <header className={cn("flex shrink-0 items-center border-b backdrop-blur-xl", compact ? "gap-1.5 px-2 py-1.5" : "gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3", isDark ? "border-white/8 bg-[#181A22]/70" : "border-black/[0.05] bg-white/55")}>
        <button type="button" onClick={onBack} aria-label="Back" className={cn("grid shrink-0 place-items-center rounded-xl border backdrop-blur-md", compact ? "h-7 w-7" : "h-9 w-9", isDark ? "border-white/10 bg-white/5 text-[#9AA0B0]" : "border-black/8 bg-white/70 text-[#5C6170]")}>
          <ArrowLeft className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
        <div className={cn("flex min-w-0 flex-1 items-center", compact ? "gap-1.5" : "gap-2.5")}>
          <ContinuousMetaRing size={compact ? 22 : 32} generating={generating} />
          <Circle2editTitle isDark={isDark} generating={generating} mode={mode} compact={compact} />
        </div>
        <div className={cn("shrink-0 rounded-xl border font-medium tabular-nums backdrop-blur-md", compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]", isDark ? "border-white/10 bg-white/5" : "border-black/8 bg-white/70")}>{creditsLabel}</div>
      </header>
      {!hideModeToggle && !generating ? (
        <div className={cn("flex shrink-0 items-center justify-center gap-1.5 border-b", compact ? "px-2 py-1" : "px-3 py-2 sm:px-4", isDark ? "border-white/6 bg-white/[0.02]" : "border-black/[0.04] bg-white/30")}>
          {(["remove", "add"] as const).map((id) => {
            const active = mode === id;
            const locked = id === "add" && !!addLocked;
            return (
              <button key={id} type="button" disabled={!!generating || locked} onClick={() => onModeChange(id)} className={cn("rounded-full border font-semibold backdrop-blur-md", compact ? "px-2.5 py-0.5 text-[11px]" : "px-4 py-1.5 text-[12px]", active ? "border-[#7B6FE0] bg-[#7B6FE0] text-white shadow-sm" : isDark ? "border-white/10 bg-white/5 text-[#9AA0B0]" : "border-black/10 bg-white/50 text-[#5C6170]", locked && !active ? "opacity-60" : undefined)}>
                {id === "remove" ? "Remove" : locked ? (<span className="inline-flex items-center gap-1"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>Add</span>) : "Add"}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
        {controls && !generating ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-2 pb-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }} data-circle-toolbar="floating">
            <div className={cn("pointer-events-auto w-full max-w-lg rounded-2xl border shadow-lg backdrop-blur-xl", isDark ? "border-white/12 bg-[rgba(18,20,28,0.82)]" : "border-black/10 bg-[rgba(255,255,255,0.88)]")} style={{ boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)" : "0 8px 28px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
              <div className="px-2 py-1.5">{controls}</div>
            </div>
          </div>
        ) : null}
      </div>
      {!generating && actionBar ? <div className="shrink-0">{actionBar}</div> : null}
      {!generating ? sheet : null}
      {onGenerate && !generating ? (
        <div className={cn("flex shrink-0 justify-center border-t px-3 py-2.5 backdrop-blur-xl", isDark ? "border-white/8 bg-[#181A22]/85" : "border-black/[0.05] bg-white/70")} style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
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

export function CircleEditGenOverlay({ progressPct, activeStage, stageCount, caption }: { progressPct: number; activeStage: number; stageCount: number; caption?: string }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-md">
      <p className="text-center text-[15px] font-bold tracking-tight">Circle <span style={{ color: "#7B6FE0", fontStyle: "italic" }}>2</span>edit</p>
      <p className="text-center text-sm font-medium text-[#7B6FE0]">{caption || "Generating…"}</p>
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#7B6FE0] transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} /></div>
      <p className="text-[11px] text-white/60">Step {activeStage + 1} / {stageCount}</p>
    </div>
  );
}

export function CircleEditActionBar({ hasImage, hasMask, onClearMask, onClearImage, statusText, infoSlot }: { hasImage: boolean; hasMask: boolean; onClearMask: () => void; onClearImage: () => void; statusText?: string; infoSlot?: React.ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div className={cn("flex shrink-0 flex-col gap-1.5 border-t px-2 py-1.5 backdrop-blur-xl sm:px-3", isDark ? "border-white/8 bg-[#181A22]/80" : "border-black/[0.05] bg-white/65")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {hasImage ? (<button type="button" onClick={onClearMask} disabled={!hasMask} className={cn("rounded-lg border px-2 py-1 text-[11px] font-medium", !hasMask ? (isDark ? "border-white/8 bg-[#2A2C36] text-[#5C6170] cursor-not-allowed" : "border-black/8 bg-[#E8E9EE] text-[#9AA0B0] cursor-not-allowed") : (isDark ? "border-white/10 text-[#9AA0B0]" : "border-black/10 text-[#5C6170]"))}>Clear mask</button>) : null}
          {hasImage ? (<button type="button" onClick={onClearImage} className={cn("rounded-lg border px-2 py-1 text-[11px] font-medium", isDark ? "border-white/10 text-[#9AA0B0]" : "border-black/10 text-[#5C6170]")}>Clear image</button>) : null}
        </div>
        {infoSlot}
      </div>
      {statusText ? <p className={cn("text-center text-[11px]", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>{statusText}</p> : null}
    </div>
  );
}

function ToolIconCircle({ active }: { active: boolean }) {
  return (<svg width="14" height="14" viewBox="0 0 18 18" aria-hidden><circle cx="9" cy="9" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.9" opacity={active ? 1 : 0.92} /></svg>);
}
function ToolIconBrush({ active }: { active: boolean }) {
  return (<svg width="14" height="14" viewBox="0 0 18 18" aria-hidden><path d="M7.2 9.5c-0.4-2.2 1.2-4.6 3.8-5.1 1.6-0.3 3.2 0.2 4.4 1.3 1.3 1.2 1.6 2.9 1.2 4.4 0.9 0.3 1.9 1.1 2.1 2.4 0.3 1.8-0.8 3.3-2.4 3.8 0.2 1.4-0.4 3-1.8 3.6-1.5 0.6-3.2 0.1-4.1-1.1-0.9 0.7-2.3 0.8-3.4 0.1-1.4-0.9-1.8-2.6-1.2-4-1.1-0.6-1.7-1.9-1.4-3.2 0.2-1 0.9-1.9 1.8-2.2z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round" opacity={active ? 1 : 0.92} /><circle cx="7.5" cy="10.2" r="1.35" fill="currentColor" opacity={active ? 1 : 0.85} /></svg>);
}
function ToolIconEraser({ active }: { active: boolean }) {
  return (<svg width="14" height="14" viewBox="0 0 18 18" aria-hidden><path d="M4 12.5 L9.5 4.5 L13.5 7.5 L8 15.5 Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" opacity={active ? 1 : 0.92} /></svg>);
}

export function CircleDrawToolbar({ tool, onTool, brushSize, onBrushSize, hideCircle, onUndo, onRedo, canUndo, canRedo, inkColor = "purple", onInkColor, onZoomIn, onZoomOut }: { tool: CircleDrawTool; onTool: (t: CircleDrawTool) => void; brushSize: number; onBrushSize: (n: number) => void; hideCircle?: boolean; onUndo?: () => void; onRedo?: () => void; canUndo?: boolean; canRedo?: boolean; inkColor?: InkColor; onInkColor?: (c: InkColor) => void; onZoomIn?: () => void; onZoomOut?: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [tapId, setTapId] = useState<string | null>(null);
  const flashTap = (id: string) => { setTapId(id); window.setTimeout(() => setTapId((cur) => (cur === id ? null : cur)), 160); };
  const items: { id: CircleDrawTool; label: string; Icon: (p: { active: boolean }) => JSX.Element }[] = [...(hideCircle ? [] : [{ id: "circle" as const, label: "Lasso", Icon: ToolIconCircle }]), { id: "brush", label: "Brush", Icon: ToolIconBrush }, { id: "eraser", label: "Eraser", Icon: ToolIconEraser }];
  const inkColors: { id: InkColor; label: string; swatch: string }[] = [{ id: "purple", label: "Purple", swatch: "#7B6FE0" }, { id: "white", label: "White", swatch: "#FFFFFF" }, { id: "black", label: "Black", swatch: "#111111" }];
  const touchBtn = "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-center gap-0.5">
        <button type="button" disabled={!canUndo} onClick={() => { if (!canUndo) return; flashTap("undo"); onUndo?.(); }} data-testid="circle-undo" aria-label="Undo" className={cn(touchBtn, "text-[13px] font-bold transition-transform", tapId === "undo" && "scale-[1.15]", canUndo ? (isDark ? "text-[#E8E6F5]" : "text-[#3A3E4C]") : (isDark ? "text-[#4A4E5C] cursor-not-allowed" : "text-[#B0B4C0] cursor-not-allowed"))}><span aria-hidden className="text-[15px] leading-none">↶</span></button>
        <button type="button" disabled={!canRedo} onClick={() => { if (!canRedo) return; flashTap("redo"); onRedo?.(); }} data-testid="circle-redo" aria-label="Redo" className={cn(touchBtn, "text-[13px] font-bold transition-transform", tapId === "redo" && "scale-[1.15]", canRedo ? (isDark ? "text-[#E8E6F5]" : "text-[#3A3E4C]") : (isDark ? "text-[#4A4E5C] cursor-not-allowed" : "text-[#B0B4C0] cursor-not-allowed"))}><span aria-hidden className="text-[15px] leading-none">↷</span></button>
        <span className={cn("mx-0.5 h-4 w-px", isDark ? "bg-white/15" : "bg-black/10")} aria-hidden />
        {items.map((it) => {
          const active = tool === it.id;
          return (
            <button key={it.id} type="button" onClick={() => { flashTap(it.id); onTool(it.id); }} aria-label={it.label} title={it.label} aria-pressed={active} className={cn(touchBtn, "transition-transform duration-150", tapId === it.id && "scale-[1.15]", active ? "bg-[rgba(123,111,224,0.28)] text-[#7B6FE0] ring-1 ring-[#7B6FE0]/50" : isDark ? "text-[#D0CCE8]" : "text-[#4A4E5C]")}>
              <it.Icon active={active} />
            </button>
          );
        })}
        {onInkColor ? (
          <>
            <span className={cn("mx-0.5 h-4 w-px", isDark ? "bg-white/15" : "bg-black/10")} aria-hidden />
            <div className="flex items-center gap-0.5" data-testid="circle-ink" data-active-ink={inkColor}>
              {inkColors.map((c) => {
                const selected = inkColor === c.id;
                return (
                  <button key={c.id} type="button" aria-label={c.label} aria-pressed={selected} title={c.label} data-ink={c.id} data-selected={selected ? "true" : "false"} onClick={(e) => { e.preventDefault(); e.stopPropagation(); flashTap(`ink-${c.id}`); onInkColor(c.id); }} className={cn(touchBtn, "transition-transform duration-150", tapId === `ink-${c.id}` && "scale-[1.15]")}>
                    <span className={cn("block h-3.5 w-3.5 rounded-full border-2 shadow-sm", selected ? "border-[#7B6FE0] ring-2 ring-[#7B6FE0]/40 scale-110" : isDark ? "border-white/30" : "border-black/25")} style={{ background: c.swatch }} />
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
        {(onZoomIn || onZoomOut) && (
          <>
            <span className={cn("mx-0.5 h-4 w-px", isDark ? "bg-white/15" : "bg-black/10")} aria-hidden />
            {onZoomOut ? <button type="button" aria-label="Zoom out" onClick={() => { flashTap("zout"); onZoomOut(); }} className={cn(touchBtn, "text-[15px] font-bold transition-transform", tapId === "zout" && "scale-[1.15]", isDark ? "text-[#D0CCE8]" : "text-[#4A4E5C]")}>−</button> : null}
            {onZoomIn ? <button type="button" aria-label="Zoom in" onClick={() => { flashTap("zin"); onZoomIn(); }} className={cn(touchBtn, "text-[15px] font-bold transition-transform", tapId === "zin" && "scale-[1.15]", isDark ? "text-[#D0CCE8]" : "text-[#4A4E5C]")}>+</button> : null}
          </>
        )}
      </div>
      {(tool === "brush" || tool === "eraser") && (
        <div className="flex items-center gap-2 px-1 pb-0.5">
          <span className={cn("text-[10px]", isDark ? "text-[#8A90A0]" : "text-[#6B7080]")}>Size</span>
          <input type="range" min={1} max={100} value={brushSize} onChange={(e) => onBrushSize(Number(e.target.value))} className="flex-1" />
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
      <button type="button" aria-label={title} onClick={() => setOpen((v) => !v)} className={cn("grid h-8 w-8 place-items-center rounded-lg border", isDark ? "border-white/10 text-[#9AA0B0]" : "border-black/10 text-[#5C6170]")}>
        <Info className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className={cn("absolute right-0 z-30 mt-1 w-56 rounded-xl border p-2.5 text-[11px] shadow-lg backdrop-blur-xl", isDark ? "border-white/10 bg-[#1A1C24]/95 text-[#C8C4E8]" : "border-black/10 bg-white/95 text-[#3A3E4C]")}>
          <p className="mb-1 font-semibold">{title}</p>
          <ul className="space-y-0.5">{lines.map((l) => (<li key={l}>• {l}</li>))}</ul>
          <button type="button" className="mt-2 text-[10px] underline opacity-70" onClick={() => setOpen(false)}>Close</button>
        </div>
      ) : null}
    </div>
  );
}
