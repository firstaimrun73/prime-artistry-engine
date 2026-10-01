import { cn } from "@/lib/utils";

/** Emoji-only instrument stickers — no SVG diagrams (cleaner, faster scan). */
const INSTRUMENTS: ReadonlyArray<{ id: string; label: string; emoji: string }> = [
  { id: "piano", label: "Piano", emoji: "🎹" },
  { id: "guitar", label: "Guitar", emoji: "🎸" },
  { id: "strings", label: "Strings", emoji: "🎻" },
  { id: "orchestra", label: "Orchestra", emoji: "🎼" },
  { id: "synth", label: "Synth", emoji: "🎛️" },
  { id: "drums", label: "Drums", emoji: "🥁" },
  { id: "bass", label: "Bass", emoji: "🔊" },
  { id: "flute", label: "Flute", emoji: "🪈" },
  { id: "saxophone", label: "Sax", emoji: "🎷" },
  { id: "percussion", label: "Perc", emoji: "🪘" },
  { id: "pads", label: "Pads", emoji: "☁️" },
  { id: "choir", label: "Choir", emoji: "👥" },
];

export function MusicInstrumentCards({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain pb-1 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2">
        {INSTRUMENTS.map((item) => {
          const active = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(active ? "" : item.id)}
              aria-pressed={active}
              className={cn(
                "flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-2xl border px-1.5 py-2.5 transition-all active:scale-[0.97]",
                active
                  ? "border-transparent bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600 text-white shadow-lg ring-2 ring-orange-400/40"
                  : "border-border/60 bg-card text-foreground hover:border-orange-500/45 hover:shadow-sm",
              )}
            >
              <span className="text-2xl leading-none" aria-hidden>
                {item.emoji}
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold tracking-tight",
                  active ? "text-white" : "text-foreground",
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
