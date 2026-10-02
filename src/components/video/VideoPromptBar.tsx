import { useRef } from "react";
import { X } from "lucide-react";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { cn } from "@/lib/utils";
import { VIDEO_PROMPT_SUGGESTIONS } from "@/components/video/video-studio-types";

/** Standard video prompts: 3,000 chars. Premium: 10,000 chars. */
export const STANDARD_VIDEO_PROMPT_MAX = 3000;
export const PREMIUM_VIDEO_PROMPT_MAX = 10000;

export function VideoPromptBar({
  value,
  onChange,
  disabled,
  placeholder,
  maxLength,
  maxChars,
  durationSec: _durationSec,
  showSuggestions = true,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Enforced on input; server also validates. */
  maxLength?: number;
  /** Live page alias for maxLength */
  maxChars?: number;
  durationSec?: number;
  /** Compact suggested prompts (click fills; does not auto-generate). */
  showSuggestions?: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const limit = Math.max(1, maxChars ?? maxLength ?? STANDARD_VIDEO_PROMPT_MAX);

  const applySuggestion = (text: string) => {
    if (disabled) return;
    onChange(text.slice(0, limit));
    requestAnimationFrame(() => taRef.current?.focus());
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative rounded-2xl border border-white/70 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-black/5",
          "dark:border-white/15 dark:bg-white/10 dark:ring-white/10",
          "focus-within:ring-2 focus-within:ring-[#F43F5E]/30",
        )}
      >
        <textarea
          ref={taRef}
          value={value}
          disabled={disabled}
          rows={4}
          maxLength={limit}
          onChange={(e) => onChange(e.target.value.slice(0, limit))}
          onPaste={(e) => {
            const paste = e.clipboardData?.getData("text") ?? "";
            if (!paste) return;
            e.preventDefault();
            const el = taRef.current;
            const start = el?.selectionStart ?? value.length;
            const end = el?.selectionEnd ?? value.length;
            const next = (value.slice(0, start) + paste + value.slice(end)).slice(0, limit);
            onChange(next);
          }}
          placeholder={placeholder ?? "Describe what you want to create…"}
          className={cn(
            "w-full resize-none rounded-2xl bg-transparent px-3 py-3 pr-20 text-sm text-slate-900 outline-none",
            "dark:text-slate-100 dark:placeholder:text-slate-500",
            "disabled:opacity-60 placeholder:text-slate-400",
            "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:bg-slate-300/70",
            "hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/80",
            "dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/70",
          )}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className={cn(
                "rounded-full p-1.5 text-slate-400 transition-all duration-150",
                "hover:bg-slate-100 hover:text-slate-700 active:scale-90",
                "dark:hover:bg-white/10 dark:hover:text-slate-200",
              )}
              aria-label="Clear prompt"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <VoiceInputButton
            disabled={disabled}
            onTranscript={(t) => {
              const next = value.trim() ? `${value.trim()} ${t}` : t;
              onChange(next.slice(0, limit));
            }}
          />
        </div>
      </div>
      <p
        className={cn(
          "text-right text-[11px] tabular-nums text-slate-500 dark:text-slate-400",
          value.length >= limit && "text-[#F43F5E] dark:text-rose-400",
        )}
      >
        {value.length}/{limit}
      </p>

      {showSuggestions && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {VIDEO_PROMPT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => applySuggestion(s)}
              className={cn(
                "max-w-full truncate rounded-full border border-slate-200/80 bg-white/70 px-2.5 py-1",
                "text-[11px] font-medium text-slate-600 transition-colors",
                "hover:border-[#FF7A45]/50 hover:text-slate-900",
                "dark:border-white/15 dark:bg-white/10 dark:text-slate-300",
                "dark:hover:border-[#FF7A45]/40 dark:hover:text-white",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
              title={s}
            >
              {s.length > 42 ? `${s.slice(0, 40)}…` : s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
