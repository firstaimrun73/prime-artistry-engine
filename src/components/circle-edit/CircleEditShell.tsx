/**
 * Circle 2edit product shell — premium glass mobile editor.
 * Layout: header → stage → tools → compact generate control.
 * Continuous Meta-style ring (not dashed). Separate Clear Mask / Clear Image.
 * NO floating pull-down generation lever.
 */
import { useEffect, useState } from "react";
import { ArrowLeft, Info, Upload, X, Sparkles } from "lucide-react";
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
  addLocked?: boolean;
  onGenerate?: () => void;
  generateDisabled?: boolean;
  generateHint?: string;
  generateLabel?: string;
  /** When true, Add button shows a short energy/charge blink before commit */
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
  const stroke = isDark ? "url(#circle2editRingDark)" : "url(#circle2editRingLight)";
  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      aria-hidden
      data-circle-brand-mark="true"
    >
      <svg viewBox="0 0 32 32" width={size} height={size} className="overflow-visible">
        <defs>
          <linearGradient id="circle2editRingLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A8A0F0" />
            <stop offset="45%" stopColor="#7B6FE0" />
            <stop offset="100%" stopColor="#C8C4E8" />
          </linearGradient>
          <linearGradient id="circle2editRingDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9B93F0" />
            <stop offset="50%" stopColor="#7B6FE0" />
            <stop offset="100%" stopColor="#5C6170" />
          </linearGradient>
        </defs>
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            transformOrigin: "16px 16px",
            animation: generating
              ? "circle2edit-ring-spin 2.4s linear infinite"
              : "circle2edit-ring-spin 8s linear infinite",
          }}
        />
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke={isDark ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.85)"}
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeDasharray="10 66"
          style={{
            transformOrigin: "16px 16px",
            animation: "circle2edit-ring-spin 8s linear infinite",
          }}
        />
        <circle
          cx="16"
          cy="16"
          r="4.5"
          fill="none"
          stroke="#7B6FE0"
          strokeWidth="1.4"
          opacity={0.9}
          style={{
            animation: generating
              ? "circle2edit-core-pulse 1.2s ease-in-out infinite"
              : "circle2edit-core-pulse 2.8s ease-in-out infinite",
          }}
        />
      </svg>
      <style>{`
        @keyframes circle2edit-ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes circle2edit-core-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/** Title with paint-splash "2" — orange flash every ~12s, paused while generating. Ring untouched. */
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
      <p
        className="flex items-baseline gap-0 truncate text-[14px] font-bold tracking-tight sm:text-[15px]"
        style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
      >
        <span className={isDark ? "text-[#F2F2F5]" : "text-[#1A1C24]"}>Circle </span>
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
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: "1.35em",
              height: "1.15em",
              borderRadius: "42% 58% 55% 45% / 48% 42% 58% 52%",
              background:
                paintFlash && !generating
                  ? "radial-gradient(ellipse at 40% 40%, rgba(249,115,22,0.55), rgba(249,115,22,0.12) 70%, transparent)"
                  : isDark
                    ? "radial-gradient(ellipse at 40% 40%, rgba(123,111,224,0.28), transparent 72%)"
                    : "radial-gradient(ellipse at 40% 40%, rgba(123,111,224,0.18), transparent 72%)",
              opacity: paintFlash && !generating ? 1 : 0.65,
              transition: "opacity 0.4s ease, background 0.4s ease",
              transform: paintFlash && !generating ? "scale(1.2)" : "scale(1)",
            }}
          />
        </span>
        <span className={isDark ? "text-[#F2F2F5]" : "text-[#1A1C24]"}>edit</span>
      </p>
      <p
        className={cn(
          "truncate text-[10px] font-medium leading-tight tracking-wide",
          isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
        )}
      >
        powered by Motion2AI
      </p>
      <p className={cn("truncate text-[11px]", isDark ? "text-[#7A8090]" : "text-[#6B7080]")}>
        {mode === "remove" ? "Circle · Remove" : "Circle · Add"}
      </p>
    </div>
  );
}

/** Compact premium glass generate control — energy blink on press for Add. */
export function CircleGenerateControl({
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
    if (!energyBlink) {
      onCommit();
      return;
    }
    setBlinking(true);
    // 2–3 charge flashes (~450ms) then commit
    window.setTimeout(() => {
      setBlinking(false);
      onCommit();
    }, 480);
  };

  return (
    <div className="relative flex flex-col items-center gap-1">
      {blinking ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(123,111,224,0.45) 30%, rgba(200,190,255,0.5) 50%, rgba(123,111,224,0.45) 70%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: "circle2edit-charge-blink 0.16s ease-in-out 3",
            opacity: 0.48,
          }}
        />
      ) : null}
      <button
        type="button"
        disabled={disabled || blinking}
        onClick={handleClick}
        aria-label={label}
        className={cn(
          "group relative flex h-11 items-center gap-2 overflow-hidden rounded-2xl border px-4 shadow-md backdrop-blur-xl transition-all active:scale-[0.97]",
          disabled || blinking
            ? "cursor-not-allowed opacity-45"
            : "hover:shadow-lg",
          isDark
            ? "border-[#7B6FE0]/45 bg-gradient-to-b from-[#7B6FE0]/35 to-[#5C54C0]/25 text-[#F2F2F5]"
            : "border-[#7B6FE0]/35 bg-gradient-to-b from-white/90 to-[#F0EEFA] text-[#1A1C24] shadow-[0_4px_20px_rgba(123,111,224,0.18)]",
        )}
      >
        <span
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full",
            isDark ? "bg-[#7B6FE0]/40" : "bg-[#7B6FE0]/15",
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-[#7B6FE0]" />
        </span>
        <span className="text-[13px] font-semibold tracking-tight">{label}</span>
      </button>
      {hint ? (
        <p className={cn("max-w-[14rem] text-center text-[10px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          {hint}
        </p>
      ) : null}
      <style>{`
        @keyframes circle2edit-charge-blink {
          0% { opacity: 0.15; background-position: 100% 0; }
          50% { opacity: 0.55; background-position: 0% 0; }
          100% { opacity: 0.2; background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
}

export function CircleCreditsInfo({
  title,
  lines,
}: {
  title: string;
  lines: { label: string; value: string }[];
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Credit information"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md",
          isDark
            ? "border-white/12 bg-white/8 text-[#9AA0B0] hover:text-[#F2F2F5]"
            : "border-black/8 bg-white/70 text-[#5C6170] hover:text-[#1A1C24]",
        )}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-[60]" aria-label="Close" onClick={() => setOpen(false)} />
          <div
            className={cn(
              "fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] right-3 z-[70] w-56 rounded-xl border p-3 text-[11px] shadow-xl backdrop-blur-xl",
              isDark ? "border-white/12 bg-[#1A1C24]/95 text-[#F2F2F5]" : "border-black/8 bg-white/98 text-[#1A1C24]",
            )}
            role="dialog"
            aria-label={title}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">{title}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close info">
                <X className="h-3.5 w-3.5 opacity-60" />
              </button>
            </div>
            <ul className="space-y-1.5">
              {lines.map((l) => (
                <li key={l.label} className="flex justify-between gap-2 tabular-nums">
                  <span className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>{l.label}</span>
                  <span className="font-medium">{l.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
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
  const genLabel =
    generateLabel || (mode === "remove" ? "Remove Object" : "Add Object");

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
          isDark
            ? "border-white/8 bg-[#181A22]/70 backdrop-blur-xl"
            : "border-black/[0.05] bg-white/55 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.6)]",
        )}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Studio"
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-xl border backdrop-blur-md transition-colors",
            isDark
              ? "border-white/10 bg-white/5 text-[#9AA0B0] hover:border-[#7B6FE0]/50 hover:text-[#F2F2F5]"
              : "border-black/8 bg-white/70 text-[#5C6170] hover:border-[#7B6FE0]/40 hover:text-[#1A1C24]",
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
                  "rounded-full border px-4 py-1.5 text-[12px] font-semibold backdrop-blur-md transition-colors",
                  active
                    ? "border-[#7B6FE0] bg-[#7B6FE0] text-white shadow-sm"
                    : isDark
                      ? "border-white/10 bg-white/5 text-[#9AA0B0] hover:border-[#7B6FE0]/40"
                      : "border-black/10 bg-white/50 text-[#5C6170] hover:border-[#7B6FE0]/40",
                  (generating || locked) && "opacity-50",
                )}
              >
                {id === "remove" ? "Remove" : locked ? "Add locked" : "Add"}
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
        >
          {controls}
        </div>
      ) : null}

      {!generating ? actionBar : null}
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
        "flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 backdrop-blur-md transition-colors",
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
  progressPct: _progressPct,
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
        "absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 px-6 backdrop-blur-md",
        isDark ? "bg-[#12141A]/88" : "bg-[#F4F5F8]/88",
      )}
      data-circle-generating="true"
    >
      <ContinuousMetaRing size={96} generating isDark={isDark} />
      <p className="text-center text-[15px] font-bold tracking-tight">
        Circle <span style={{ color: "#7B6FE0", fontStyle: "italic" }}>2</span>edit
      </p>
      <p className="text-center text-[10px] font-medium tracking-wide text-[#9AA0B0]">
        powered by Motion2AI
      </p>
      <p className="text-center text-sm font-medium text-[#7B6FE0]">{caption || "Generating…"}</p>
      <p className={cn("text-center text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
        Preparing selection · Matching scene · Applying AI
      </p>
      <p className={cn("text-center text-[10px] tabular-nums", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
        Stage {Math.min(activeStage + 1, stageCount)} of {stageCount}
      </p>
    </div>
  );
}

/** Separate Clear Mask and Clear Image — never one ambiguous Clear. */
export function CircleEditActionBar({
  onClearMask,
  onClearImage,
  hasMask,
  hasImage,
  statusText,
  infoSlot,
}: {
  onClearMask?: () => void;
  onClearImage?: () => void;
  hasMask?: boolean;
  hasImage?: boolean;
  statusText: string;
  infoSlot?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 border-t px-3 py-2.5 backdrop-blur-xl sm:px-4",
        isDark ? "border-white/8 bg-[#181A22]/80" : "border-black/[0.05] bg-white/65",
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {hasImage ? (
            <button
              type="button"
              onClick={onClearMask}
              disabled={!hasMask}
              title={hasMask ? "Clear selection mask only" : "No mask to clear"}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-35",
                isDark ? "border-white/10 text-[#9AA0B0]" : "border-black/10 text-[#5C6170]",
              )}
            >
              Clear mask
            </button>
          ) : null}
          {hasImage ? (
            confirmClear ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmClear(false);
                    onClearImage?.();
                  }}
                  className="rounded-lg border border-red-400/50 bg-red-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-red-500"
                >
                  Confirm clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-[11px]",
                    isDark ? "border-white/10 text-[#9AA0B0]" : "border-black/10 text-[#5C6170]",
                  )}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                title="Remove uploaded image"
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-[11px] font-medium",
                  isDark ? "border-white/10 text-[#9AA0B0]" : "border-black/10 text-[#5C6170]",
                )}
              >
                Clear image
              </button>
            )
          ) : null}
        </div>
        <p className={cn("min-w-0 flex-1 truncate text-center text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          {statusText}
        </p>
        {infoSlot ?? <span className="w-8" />}
      </div>
    </div>
  );
}

function ToolIconCircle({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        opacity={active ? 1 : 0.85}
      />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity={0.7} />
    </svg>
  );
}

/** Classic paint brush — bristles + handle (not a pen). */
function ToolIconBrush({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M14.5 3.5c.8-.8 2.1-.8 2.9 0l3.1 3.1c.8.8.8 2.1 0 2.9L12 18l-4.2 1.2L9 15 14.5 3.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.85}
      />
      <path
        d="M4.5 19.5c1.2-1.8 3.2-2.2 4.8-1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
      <path
        d="M5 20.2h4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity={0.75}
      />
    </svg>
  );
}

/** Classic rectangular eraser (rubber block), not a brush. */
function ToolIconEraser({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M5.5 14.5 12 8l5.5 5.5L14 17H7.5L5.5 14.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.85}
      />
      <path
        d="M9.2 17h7.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 8l2.2-2.2 3.3 3.3-2.2 2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
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
}: {
  tool: CircleDrawTool;
  onTool: (t: CircleDrawTool) => void;
  brushSize: number;
  onBrushSize: (n: number) => void;
  /** Add mode: no circle tool — user paints the placement region */
  hideCircle?: boolean;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const items: { id: CircleDrawTool; label: string; Icon: typeof ToolIconCircle }[] = hideCircle
    ? [
        { id: "brush", label: "Brush", Icon: ToolIconBrush },
        { id: "eraser", label: "Eraser", Icon: ToolIconEraser },
      ]
    : [
        { id: "circle", label: "Circle", Icon: ToolIconCircle },
        { id: "brush", label: "Brush", Icon: ToolIconBrush },
        { id: "eraser", label: "Eraser", Icon: ToolIconEraser },
      ];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-2">
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
