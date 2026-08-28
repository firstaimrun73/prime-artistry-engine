import { useRef } from "react";
import { X } from "lucide-react";
import { VoiceInputButton } from "@/components/VoiceInputButton";

/** Standard video prompts: 3,000 chars. Premium: 10,000 chars. */
export const STANDARD_VIDEO_PROMPT_MAX = 3000;
export const PREMIUM_VIDEO_PROMPT_MAX = 10000;

export function VideoPromptBar({
  value,
  onChange,
  disabled,
  placeholder,
  maxLength = STANDARD_VIDEO_PROMPT_MAX,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Enforced on input; server also validates. */
  maxLength?: number;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const limit = Math.max(1, maxLength);

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl border border-border/70 bg-background/80 focus-within:ring-2 focus-within:ring-red-500/30">
        <textarea
          ref={taRef}
          value={value}
          disabled={disabled}
          rows={4}
          maxLength={limit}
          onChange={(e) => onChange(e.target.value.slice(0, limit))}
          placeholder={placeholder ?? "Describe what you want to create…"}
          className="w-full resize-y rounded-2xl bg-transparent px-3 py-3 pr-20 text-sm outline-none disabled:opacity-60"
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
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
      <p className="text-right text-[11px] text-muted-foreground">
        {value.length}/{limit}
      </p>
    </div>
  );
}
