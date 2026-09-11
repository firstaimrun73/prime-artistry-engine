/**
 * Floating AI command bar — glass, timing chips, voice.
 */
import { useMemo } from "react";
import { X } from "lucide-react";
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
  audioActive,
}: {
  value: string;
  onChange: (v: string) => void;
  maxChars: number;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
  durationSec?: number;
  audioActive?: boolean;
}) {
  const timing = useMemo(() => parsePromptTiming(value), [value]);
  const durationErrors = useMemo(() => {
    if (!durationSec || durationSec <= 0) return [] as string[];
    return validateTimingAgainstDuration(timing.cues, durationSec);
  }, [timing.cues, durationSec]);

  const removeCue = (cue: TimingCue) => {
    onChange(value.replace(cue.raw, "").replace(/\s{2,}/g, " ").trim());
  };

  const invalidRaws = new Set(
    durationErrors
      .map((e) => e.match(/^(#\S+)/)?.[1])
      .filter(Boolean) as string[],
  );

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border border-white/12 bg-[#0B0F1E]/85 shadow-[0_8px_32px_rgba(0,0,0,0.45)]",
        "backdrop-blur-xl ring-1 ring-white/[0.06] transition-shadow duration-300",
        "focus-within:ring-red-500/25 focus-within:border-red-500/35",
        compact ? "min-h-[5.25rem]" : "min-h-[6.75rem]",
      )}
    >
      <label className="sr-only" htmlFor="video-prompt">
        Describe your video
      </label>
      <textarea
        id="video-prompt"
        value={value}
        disabled={disabled}
        maxLength={maxChars}
        rows={compact ? 3 : 4}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Describe your video…"}
        className={cn(
          "w-full flex-1 resize-none bg-transparent px-3.5 pb-11 pt-3 text-sm leading-relaxed text-white",
          "placeholder:text-zinc-500 focus:outline-none",
          disabled && "opacity-60",
        )}
      />

      {(timing.cues.length > 0 || audioActive) && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-1" aria-live="polite">
          {audioActive && (
            <span className="inline-flex items-center rounded-full border border-red-400/40 bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-200">
              Audio ✓
            </span>
          )}
          {timing.cues.map((c, i) => {
            const invalid = invalidRaws.has(c.raw);
            return (
              <button
                key={`${c.raw}-${i}`}
                type="button"
                disabled={disabled}
                onClick={() => removeCue(c)}
                aria-label={`${timingAria(c)}. Tap to remove.`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400",
                  invalid
                    ? "border-red-500/60 bg-red-500/25 text-red-200"
                    : c.kind === "interval"
                      ? "border-violet-400/40 bg-violet-500/20 text-violet-200"
                      : "border-sky-400/40 bg-sky-500/20 text-sky-200",
                )}
              >
                {timingChipLabel(c)}
                <span className="opacity-50" aria-hidden>×</span>
              </button>
            );
          })}
        </div>
      )}

      {(timing.errors[0] || durationErrors[0]) && (
        <p className="px-3 pb-1 text-[11px] text-red-400" role="alert">
          {timing.errors[0] || durationErrors[0]}
        </p>
      )}

      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <VoiceInputButton
            disabled={disabled}
            onTranscript={(text) => {
              const next = value.trim() ? `${value.trim()} ${text}` : text;
              onChange(next.slice(0, maxChars));
            }}
            className="!h-10 !w-10 !min-h-[40px] !rounded-full border border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10"
          />
          {value.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange("")}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              aria-label="Clear prompt"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <span className={cn("text-[10px] tabular-nums", value.length > maxChars * 0.9 ? "text-amber-400" : "text-zinc-500")}>
          {value.length}/{maxChars}
        </span>
      </div>
    </div>
  );
}
