import { Type, Image as ImageIcon, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoGenMode } from "@/lib/video-model-registry";

const MODES: {
  id: VideoGenMode;
  label: string;
  aria: string;
  helper: string;
  Icon: typeof Type;
}[] = [
  { id: "text", label: "Text", aria: "Text to Video", helper: "Describe a scene", Icon: Type },
  { id: "image", label: "Image", aria: "Image to Video", helper: "Animate a photo", Icon: ImageIcon },
  { id: "video", label: "Video", aria: "Video to Video", helper: "Enhance a clip", Icon: Film },
];

export function modeHelperText(mode: VideoGenMode): string {
  return MODES.find((m) => m.id === mode)?.helper ?? "";
}

export function VideoModeSelector({
  value,
  onChange,
  disabled,
}: {
  value: VideoGenMode;
  onChange: (m: VideoGenMode) => void;
  disabled?: boolean;
}) {
  const activeIdx = Math.max(0, MODES.findIndex((m) => m.id === value));

  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label="Video generation mode"
        className={cn(
          "relative grid grid-cols-3 overflow-hidden rounded-[20px] p-1",
          "border border-white/70 bg-white/55 shadow-[0_8px_32px_rgba(80,60,140,0.12)] backdrop-blur-xl saturate-150",
          "ring-1 ring-black/5",
          "dark:border-white/[0.12] dark:bg-white/[0.06] dark:ring-white/[0.06]",
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 rounded-[16px] bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] shadow-[0_6px_18px_rgba(244,63,94,0.35)] transition-transform duration-[250ms] ease-out"
          style={{
            left: 4,
            width: "calc((100% - 8px) / 3)",
            transform: `translateX(${activeIdx * 100}%)`,
          }}
        />
        {MODES.map((m) => {
          const active = value === m.id;
          const Icon = m.Icon;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={m.aria}
              disabled={disabled}
              onClick={() => onChange(m.id)}
              className={cn(
                "relative z-10 flex flex-col items-center gap-0.5 rounded-[16px] px-2 py-2.5 text-center transition-colors duration-200",
                active ? "text-white" : "text-slate-600 dark:text-zinc-300",
                disabled && "opacity-50",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="text-[12px] font-bold leading-tight">{m.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[12px] text-slate-500 dark:text-zinc-400">
        {modeHelperText(value)}
      </p>
    </div>
  );
}
