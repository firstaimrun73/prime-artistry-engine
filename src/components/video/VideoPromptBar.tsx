import { useRef } from "react";
import { X } from "lucide-react";
import { VoiceInputButton } from "@/components/VoiceInputButton";

export function VideoPromptBar({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl border border-border/70 bg-background/80 focus-within:ring-2 focus-within:ring-red-500/30">
        <textarea
          ref={taRef}
          value={value}
          disabled={disabled}
          rows={4}
          maxLength={2000}
          onChange={(e) => onChange(e.target.value.slice(0, 2000))}
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
              onChange(next.slice(0, 2000));
            }}
          />
        </div>
      </div>
      <p className="text-right text-[11px] text-muted-foreground">{value.length}/2000</p>
    </div>
  );
}
