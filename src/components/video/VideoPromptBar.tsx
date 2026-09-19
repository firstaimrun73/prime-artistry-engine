/**
 * Video Studio prompt bar — glass, mic, empty-state idea chips.
 * D1-1: single VIDEO_PROMPT_MAX=3000; counter hidden until length >= 2700.
 */
import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import {
  parsePromptTiming,
  timingChipLabel,
  validateTimingAgainstDuration,
  type TimingCue,
} from "@/lib/video/prompt-timing";

/** Fixed prompt limit for all modes / durations / qualities (D1-1). */
export const VIDEO_PROMPT_MAX = 3000;
/** @deprecated use VIDEO_PROMPT_MAX */
export const STANDARD_VIDEO_PROMPT_MAX = VIDEO_PROMPT_MAX;
/** @deprecated use VIDEO_PROMPT_MAX */
export const PREMIUM_VIDEO_PROMPT_MAX = VIDEO_PROMPT_MAX;

const COUNTER_SHOW_AT = 2700;

export const PROMPT_IDEA_CHIPS = [
  {
    id: "drone",
    label: "Drone sunrise",
    text: "A cinematic drone shot over a mountain range at sunrise, golden light, smooth camera glide",
  },
  {
    id: "city",
    label: "Neon city",
    text: "A stylish woman walks through a neon-lit Tokyo street at night, reflections on wet pavement",
  },
  {
    id: "ocean",
    label: "Ocean waves",
    text: "Powerful waves crash against dark rocks at golden hour, spray catching the light",
  },
  {
    id: "forest",
    label: "Misty forest",
    text: "Slow push through a misty pine forest at dawn, volumetric light rays through the trees",
  },
] as const;

function timingAria(cue: TimingCue): string {
  if (cue.kind === "timestamp") return `Timing marker at ${cue.startSec} seconds`;
  return `Timing interval from ${cue.startSec} to ${cue.endSec} seconds`;
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function VideoPromptBar({
  value,
  onChange,
  maxChars = VIDEO_PROMPT_MAX,
  disabled,
  placeholder,
  durationSec,
}: {
  value: string;
  onChange: (v: string) => void;
  maxChars?: number;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
  durationSec?: number;
  audioActive?: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const limit = Math.min(maxChars, VIDEO_PROMPT_MAX);
  const timing = useMemo(() => parsePromptTiming(value), [value]);
  const durationErrors = useMemo(() => {
    if (!durationSec || durationSec <= 0) return [] as string[];
    return validateTimingAgainstDuration(timing.cues, durationSec);
  }, [timing.cues, durationSec]);

  const removeCue = (cue: TimingCue) => {
    const next = value
      .replace(cue.raw, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trimStart();
    onChange(next);
  };

  const invalidRaws = new Set(
    durationErrors.map((e) => e.match(/^(#\S+)/)?.[1]).filter(Boolean) as string[],
  );

  const empty = !value.trim();
  const showCounter = value.length >= COUNTER_SHOW_AT;

  const syncHeight = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(168, Math.max(72, el.scrollHeight))}px`;
  };

  useEffect(() => {
    syncHeight();
  }, [value]);

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[22px] border transition-shadow duration-300",
        "border-white/70 bg-white/55 shadow-[0_8px_32px_rgba(80,60,140,0.12)] backdrop-blur-xl saturate-150",
        "ring-1 ring-black/5",
        "dark:border-white/[0.12] dark:bg-white/[0.06] dark:ring-white/[0.06]",
        "focus-within:ring-[#FF7A45]/30",
        "min-h-[9.5rem] max-h-[10.75rem]",
      )}
    >
      {timing.cues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-black/5 px-3 pb-2 pt-2.5 dark:border-white/10">
          {timing.cues.map((c, i) => {
            const invalid = invalidRaws.has(c.raw);
            return (
              <button
                key={`${c.raw}-${i}`}
                type="button"
                disabled={disabled}
                onClick={() => removeCue(c)}
                aria-label={`${timingAria(c)}. Tap to remove this timing tag only.`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  invalid
                    ? "border-red-500/50 bg-red-500/15 text-red-700"
                    : "border-slate-200 bg-white/70 text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200",
                )}
              >
                {timingChipLabel(c)}
                <span className="opacity-50" aria-hidden>
                  ×
                </span>
              </button>
            );
          })}
        </div>
      )}

      <label className="sr-only" htmlFor="video-prompt">
        Describe your video
      </label>
      <textarea
        ref={taRef}
        id="video-prompt"
        value={value}
        maxLength={limit}
        onChange={(e) => {
          onChange(e.target.value.slice(0, limit));
          requestAnimationFrame(syncHeight);
        }}
        disabled={disabled}
        rows={3}
        placeholder={placeholder ?? "Describe your video…"}
        className={cn(
          "w-full resize-none overflow-y-auto bg-transparent px-3.5 pb-14 pt-3 text-sm leading-relaxed",
          "text-slate-800 placeholder:text-slate-400",
          "dark:text-white dark:placeholder:text-zinc-500",
          "focus:outline-none",
          disabled && "opacity-60",
        )}
        style={{ minHeight: 72, maxHeight: 168 }}
      />

      {(timing.errors[0] || durationErrors[0]) && (
        <p className="px-3 pb-1 text-[11px] text-red-600 dark:text-red-400" role="alert">
          {timing.errors[0] || durationErrors[0]}
        </p>
      )}

      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {showCounter ? (
            <span
              className={cn(
                "text-[10px] tabular-nums",
                value.length > limit * 0.95
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-400 dark:text-zinc-500",
              )}
            >
              {formatCount(value.length)} / {formatCount(limit)}
            </span>
          ) : (
            <span className="h-3" aria-hidden />
          )}
          <div
            className={cn(
              "studio-hide-scroll flex gap-1.5 overflow-x-auto transition-opacity duration-200",
              empty ? "opacity-100" : "pointer-events-none h-0 opacity-0",
            )}
          >
            {PROMPT_IDEA_CHIPS.map((idea) => (
              <button
                key={idea.id}
                type="button"
                disabled={disabled || !empty}
                onClick={() => {
                  onChange(idea.text.slice(0, limit));
                  requestAnimationFrame(() => taRef.current?.focus());
                }}
                className="h-7 shrink-0 rounded-full border border-white/70 bg-white/70 px-2.5 text-[11px] font-semibold text-slate-600 backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-zinc-300"
              >
                {idea.label}
              </button>
            ))}
          </div>
        </div>
        <VoiceInputButton
          disabled={disabled}
          onTranscript={(text) => {
            const next = value.trim() ? `${value.trim()} ${text}` : text;
            onChange(next.slice(0, limit));
          }}
          className={cn(
            "!h-10 !w-10 !min-h-[40px] !rounded-full border",
            "border-white/70 bg-white/70 text-slate-700",
            "dark:border-white/15 dark:bg-white/10 dark:text-zinc-200",
          )}
        />
      </div>
    </div>
  );
}
