import { Music, Waves, Mic2, Sparkles, Film, Radio } from "lucide-react";
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
    hint: "Vocals + beat",
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
    id: "bgm",
    label: "BGM",
    hint: "Background score",
    icon: Radio,
    gradient: "from-teal-500/90 to-emerald-600/90",
  },
  {
    id: "voiceover",
    label: "AI Voice",
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
  {
    id: "video_music",
    label: "Video Music",
    hint: "Video soundtrack",
    icon: Film,
    gradient: "from-fuchsia-500/90 to-pink-600/90",
  },
];

export function MusicModeCards({
  mode,
  onChange,
  allowedModes,
}: {
  mode: MusicMode;
  onChange: (m: MusicMode) => void;
  allowedModes?: MusicMode[] | null;
}) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6 md:gap-2.5">
      {MODES.map((m) => {
        const locked = Array.isArray(allowedModes) && allowedModes.length > 0 && !allowedModes.includes(m.id);
        const active = mode === m.id && !locked;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            type="button"
            disabled={locked}
            onClick={() => !locked && onChange(m.id)}
            className={cn(
              "group relative min-w-0 overflow-hidden rounded-xl border p-3 text-left transition-all",
              locked && "cursor-not-allowed opacity-45",
              active
                ? "border-transparent shadow-md shadow-orange-500/15 ring-2 ring-orange-500/35"
                : "border-border/60 bg-card hover:border-orange-500/35",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity",
                m.gradient,
                active && "opacity-100",
              )}
            />
            <div className="relative z-10 flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  active ? "bg-white/20 text-white" : "bg-muted text-primary",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate text-sm font-bold tracking-tight",
                    active ? "text-white" : "text-foreground",
                  )}
                >
                  {m.label}
                </p>
                <p
                  className={cn(
                    "truncate text-[10px] leading-snug",
                    active ? "text-white/80" : "text-muted-foreground",
                  )}
                >
                  {locked ? "Upgrade" : m.hint}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
