import { useRef } from "react";
import { X } from "lucide-react";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { cn } from "@/lib/utils";

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
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const limit = Math.max(1, maxChars ?? maxLength ?? STANDARD_VIDEO_PROMPT_MAX);

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative rounded-2xl border border-white/70 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-black/5",
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
          placeholder={placeholder ?? "Describe what you want to create…"}
          className={cn(
            "w-full resize-y rounded-2xl bg-transparent px-3 py-3 pr-20 text-sm text-slate-900 outline-none",
            "disabled:opacity-60 placeholder:text-slate-400",
            /* Thin scrollbar — no silver OS bar */
            "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:bg-slate-300/70",
            "hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/80",
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
      <p className="text-right text-[11px] tabular-nums text-slate-500">
        {value.length}/{limit}
      </p>
    </div>
  );
}
