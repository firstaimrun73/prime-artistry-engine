/**
 * Video Studio prompt bar — light/dark glass, timing surface labels, voice.
 * Timing chips only remove their token; never clear the whole prompt.
 */
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import {
  parsePromptTiming,
  timingChipLabel,
  validateTimingAgainstDuration,
  type TimingCue,
} from "@/lib/video/prompt-timing";

export const STANDARD_VIDEO_PROMPT_MAX = 3000;
export const PREMIUM_VIDEO_PROMPT_MAX = 10000;

function timingAria(cue: TimingCue): string {
  if (cue.kind === "timestamp") return `Timing marker at ${cue.startSec} seconds`;
  return `Timing interval from ${cue.startSec} to ${cue.endSec} seconds`;
}

export function VideoPromptBar({
  value,
  onChange,
  maxChars,
  disabled,
  placeholder,
  compact,
  durationSec,
}: {
  value: string;
  onChange: (v: string) => void;
  maxChars: number;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
  durationSec?: number;
  /** @deprecated ignored — prompt words must not drive audio */
  audioActive?: boolean;
}) {
  const timing = useMemo(() => parsePromptTiming(value), [value]);
  const durationErrors = useMemo(() => {
    if (!durationSec || durationSec <= 0) return [] as string[];
    return validateTimingAgainstDuration(timing.cues, durationSec);
  }, [timing.cues, durationSec]);

  /** Remove only the matching timing token — never the whole prompt. */
  const removeCue = (cue: TimingCue) => {
    const next = value
      .replace(cue.raw, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trimStart();
    onChange(next);
  };

  const invalidRaws = new Set(
    durationErrors
      .map((e) => e.match(/^(#\S+)/)?.[1])
      .filter(Boolean) as string[],
  );

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border transition-shadow duration-300",
        "border-border/70 bg-white/80 shadow-[0_8px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl",
        "ring-1 ring-black/[0.04]",
        "dark:border-white/12 dark:bg-[#0B0F1E]/85 dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]",
        "dark:ring-white/[0.06]",
        "focus-within:border-orange-400/50 focus-within:ring-orange-500/20",
        "dark:focus-within:border-red-500/35 dark:focus-within:ring-red-500/25",
        compact ? "min-h-[5.5rem]" : "min-h-[7rem]",
      )}
    >
      {timing.cues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border/40 px-3 pb-2 pt-2.5 dark:border-white/10">
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
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-sm",
                  "backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400",
                  invalid
                    ? "border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-200"
                    : c.kind === "interval"
                      ? "border-violet-400/40 bg-violet-500/10 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200"
                      : "border-sky-400/40 bg-sky-500/10 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
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
        id="video-prompt"
        value={value}
        disabled={disabled}
        maxLength={maxChars}
        rows={compact ? 3 : 5}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Describe your video…"}
        className={cn(
          "w-full flex-1 resize-none overflow-y-auto bg-transparent px-3.5 pb-12 pt-3 text-sm leading-relaxed",
          "text-foreground placeholder:text-muted-foreground",
          "dark:text-white dark:placeholder:text-zinc-500",
          "focus:outline-none",
          disabled && "opacity-60",
        )}
      />

      {(timing.errors[0] || durationErrors[0]) && (
        <p className="px-3 pb-1 text-[11px] text-red-600 dark:text-red-400" role="alert">
          {timing.errors[0] || durationErrors[0]}
        </p>
      )}

      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
        <VoiceInputButton
          disabled={disabled}
          onTranscript={(text) => {
            const next = value.trim() ? `${value.trim()} ${text}` : text;
            onChange(next.slice(0, maxChars));
          }}
          className={cn(
            "!h-10 !w-10 !min-h-[40px] !rounded-full border",
            "border-border/70 bg-background/80 text-foreground hover:bg-muted",
            "dark:border-white/15 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10",
          )}
        />
        <span
          className={cn(
            "text-[10px] tabular-nums",
            value.length > maxChars * 0.9
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground",
          )}
        >
          {value.length}/{maxChars}
        </span>
      </div>
    </div>
  );
}
