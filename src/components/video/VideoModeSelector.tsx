import { Sparkles, Camera, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoMode } from "./video-studio-types";

const MODES: { id: VideoMode; icon: typeof Sparkles; label: string }[] = [
  { id: "text", icon: Sparkles, label: "Text" },
  { id: "image", icon: Camera, label: "Image" },
  { id: "video", icon: Film, label: "Video" },
];

export function VideoModeSelector({
  value, onChange, disabled,
}: { value: VideoMode; onChange: (m: VideoMode) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-black/40 p-0.5 backdrop-blur-md" role="tablist" aria-label="Generation source">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = value === m.id;
        return (
          <button key={m.id} type="button" role="tab" aria-selected={active} disabled={disabled}
            onClick={() => onChange(m.id)}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070A12]",
              active
                ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md shadow-red-500/25"
                : "text-zinc-400 hover:text-white",
              disabled && "opacity-50",
            )}>
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
