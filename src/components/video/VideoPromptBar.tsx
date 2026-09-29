/**
 * Video Studio prompt bar — glass, mic, empty-state idea chips, char counter.
 */
import { useMemo, useRef } from "react";
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

export const PROMPT_IDEA_CHIPS = [
  { id: "drone", label: "Drone sunrise", text: "A cinematic drone shot over a mountain range at sunrise, golden light, smooth camera glide" },
  { id: "city", label: "Neon city", text: "A stylish woman walks through a neon-lit Tokyo street at night, reflections on wet pavement" },
  { id: "ocean", label: "Ocean waves", text: "Powerful waves crash against dark rocks at golden hour, spray catching the light" },
  { id: "forest", label: "Misty forest", text: "Slow push through a misty pine forest at dawn, volumetric light rays through the trees" },
  { id: "portrait", label: "Soft portrait", text: "Close-up portrait of a person looking out a rainy window, soft natural light, shallow depth of field" },
  { id: "product", label: "Product spin", text: "Elegant product turntable shot of a perfume bottle on black glass, studio lighting, slow rotation" },
  { id: "sports", label: "Sports action", text: "Dynamic slow-motion of a soccer player kicking the ball, dirt flying, stadium lights" },
  { id: "food", label: "Food pour", text: "Chocolate sauce poured over a dessert in slow motion, appetizing macro shot" },
] as const;

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
  audioActive?: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
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
  const limit = Number.isFinite(maxChars) && maxChars > 0 ? maxChars : 3000;

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[22px] border transition-shadow duration-300",
        "border-white/70 bg-white/55 shadow-[0_8px_32px_rgba(80,60,140,0.12)] backdrop-blur-xl saturate-150",
        "ring-1 ring-black/5",
        "focus-within:ring-[#FF7A45]/30",
        compact ? "min-h-[5.5rem]" : "min-h-[7rem]",
      )}
    >
      {timing.cues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-black/5 px-3 pb-2 pt-2.5">
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
                    : "border-slate-200 bg-white/70 text-slate-700",
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
        disabled={disabled}
        maxLength={limit}
        rows={compact ? 3 : 5}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Describe your video…"}
        className={cn(
          "w-full flex-1 resize-none overflow-y-auto bg-transparent px-3.5 pb-14 pt-3 text-sm leading-relaxed",
          "text-slate-800 placeholder:text-slate-400",
          "focus:outline-none",
          disabled && "opacity-60",
        )}
      />

      {(timing.errors[0] || durationErrors[0]) && (
        <p className="px-3 pb-1 text-[11px] text-red-600" role="alert">
          {timing.errors[0] || durationErrors[0]}
        </p>
      )}

      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span
            className={cn(
              "text-[10px] tabular-nums",
              value.length > limit * 0.9 ? "text-amber-600" : "text-slate-400",
            )}
          >
            {value.length}/{limit}
          </span>
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
                className="h-7 shrink-0 rounded-full border border-white/70 bg-white/70 px-2.5 text-[11px] font-semibold text-slate-600 backdrop-blur-md"
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
          )}
        />
      </div>
    </div>
  );
}
