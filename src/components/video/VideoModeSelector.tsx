import { Sparkles, Camera, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoGenMode } from "@/lib/video-model-registry";

const MODES: {
  id: VideoGenMode;
  icon: typeof Sparkles;
  label: string;
  hint: string;
}[] = [
  { id: "text", icon: Sparkles, label: "Text → Video", hint: "Describe a scene" },
  { id: "image", icon: Camera, label: "Image → Video", hint: "Animate a photo" },
  { id: "video", icon: Film, label: "Video → Video", hint: "Enhance a clip" },
];

export function VideoModeSelector({
  value,
  onChange,
  disabled,
}: {
  value: VideoGenMode;
  onChange: (mode: VideoGenMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Generation mode">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(m.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center transition-all",
              active
                ? "border-orange-500 bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-md"
                : "border-border/70 bg-card text-foreground hover:border-orange-400/50",
              disabled && "opacity-50",
            )}
          >
            <span className="text-[11px] font-bold leading-tight sm:text-xs">{m.label}</span>
            <span className={cn("text-[10px]", active ? "text-white/85" : "text-muted-foreground")}>
              {m.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
