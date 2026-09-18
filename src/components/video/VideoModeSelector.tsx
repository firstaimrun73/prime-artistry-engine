/**
 * Compact Text / Image / Video mode segmented control.
 */
import { Sparkles, Camera, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoGenMode } from "@/lib/video-model-registry";

const MODES: { id: VideoGenMode; label: string; icon: typeof Sparkles }[] = [
  { id: "text", label: "Text → Video", icon: Sparkles },
  { id: "image", label: "Image → Video", icon: Camera },
  { id: "video", label: "Video → Video", icon: Film },
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
    <div
      className="inline-flex rounded-full border border-white/12 bg-white/5 p-0.5"
      role="tablist"
      aria-label="Generation mode"
    >
      {MODES.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition sm:gap-1.5 sm:px-3 sm:text-[11px]",
              active
                ? "bg-red-500/20 text-red-200 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200",
              disabled && "opacity-50",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
