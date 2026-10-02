import { Sparkles, Camera, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoMode } from "./video-studio-types";

const MODES: { id: VideoMode; icon: typeof Sparkles; label: string; hint: string }[] = [
  { id: "text", icon: Sparkles, label: "Text → Video", hint: "Describe a scene" },
  { id: "image", icon: Camera, label: "Image → Video", hint: "Animate a photo" },
  { id: "video", icon: Film, label: "Video → Video", hint: "Enhance a clip" },
];

export function VideoModeSelector({
  value,
  onChange,
  disabled,
}: {
  value: VideoMode;
  onChange: (m: VideoMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center",
              "transition-all duration-150 ease-out select-none",
              "active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30",
              active
                ? "border-red-500 bg-gradient-to-b from-red-500 to-orange-500 text-white shadow-md shadow-red-500/20"
                : "border-border/70 bg-card text-foreground hover:border-red-400/50 dark:hover:border-red-400/40",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <Icon className={cn("h-4 w-4 transition-transform duration-150", active && "scale-110")} />
            <span className="text-[11px] font-bold leading-tight sm:text-xs">{m.label}</span>
            <span className={cn("text-[10px]", active ? "text-white/80" : "text-muted-foreground")}>
              {m.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
