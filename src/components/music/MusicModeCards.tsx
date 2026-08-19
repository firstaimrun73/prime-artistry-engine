import { Music, Waves, Mic2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MusicMode } from "@/lib/music.functions";

const MODES: {
  id: MusicMode;
  label: string;
  hint: string;
  icon: typeof Music;
  gradient: string;
}[] = [
  {
    id: "song",
    label: "Music",
    hint: "Vocals + arrangement",
    icon: Music,
    gradient: "from-orange-500/90 to-rose-500/90",
  },
  {
    id: "instrumental",
    label: "Instrumental",
    hint: "No vocals",
    icon: Waves,
    gradient: "from-violet-500/90 to-purple-600/90",
  },
  {
    id: "voiceover",
    label: "Voiceover",
    hint: "Script → speech",
    icon: Mic2,
    gradient: "from-sky-500/90 to-indigo-600/90",
  },
  {
    id: "sfx",
    label: "Sound",
    hint: "SFX & ambience",
    icon: Sparkles,
    gradient: "from-amber-500/90 to-orange-600/90",
  },
];

export function MusicModeCards({
  mode,
  onChange,
}: {
  mode: MusicMode;
  onChange: (m: MusicMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
      {MODES.map((m) => {
        const active = mode === m.id;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={cn(
              "group relative overflow-hidden rounded-2xl border p-3.5 text-left transition-all sm:p-4",
              active
                ? "border-transparent shadow-lg shadow-orange-500/20 ring-2 ring-orange-500/40"
                : "border-border/70 bg-card hover:border-orange-500/40 hover:shadow-md",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity",
                m.gradient,
                active && "opacity-100",
              )}
            />
            <div className="relative z-10">
              <div
                className={cn(
                  "mb-2 flex h-9 w-9 items-center justify-center rounded-xl",
                  active ? "bg-white/20 text-white" : "bg-muted text-primary",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p
                className={cn(
                  "text-sm font-bold tracking-tight",
                  active ? "text-white" : "text-foreground",
                )}
              >
                {m.label}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[11px] leading-snug",
                  active ? "text-white/85" : "text-muted-foreground",
                )}
              >
                {m.hint}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
