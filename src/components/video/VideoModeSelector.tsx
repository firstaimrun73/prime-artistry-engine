import { Sparkles, Camera, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoMode } from "./video-studio-types";

const MODES: { id: VideoMode; icon: typeof Sparkles; label: string; hint: string }[] = [
  { id: "text", icon: Sparkles, label: "Text → Video", hint: "Describe a scene" },
  { id: "image", icon: Camera, label: "Image → Video", hint: "Animate a photo" },
  { id: "video", icon: Film, label: "Video → Video", hint: "Enhance a clip" },
];

/** Accepts both `mode` (live page) and `value` (legacy) so either wiring works. */
export function VideoModeSelector({
  mode,
  value,
  onChange,
  disabled,
}: {
  mode?: VideoMode;
  value?: VideoMode;
  onChange: (m: VideoMode) => void;
  disabled?: boolean;
}) {
  const current = mode ?? value ?? "text";
  return (
    <div className="grid grid-cols-3 gap-2">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = current === m.id;
        return (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center",
              "transition-all duration-150 ease-out select-none",
              "active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F43F5E]/40",
              active
                ? "border-transparent bg-gradient-to-b from-[#FF7A45] to-[#F43F5E] text-white shadow-md shadow-rose-500/25"
                : "border-slate-200/80 bg-white/80 text-slate-800 hover:border-[#FF7A45]/50",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <Icon className={cn("h-4 w-4 transition-transform duration-150", active && "scale-110")} />
            <span className="text-[11px] font-bold leading-tight sm:text-xs">{m.label}</span>
            <span className={cn("text-[10px]", active ? "text-white/85" : "text-slate-500")}>
              {m.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
