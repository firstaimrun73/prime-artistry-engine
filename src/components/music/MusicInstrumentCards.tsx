import { cn } from "@/lib/utils";

/** Simple diagram-style instrument picker (swipe / horizontal scroll). */
const INSTRUMENT_DIAGRAMS: ReadonlyArray<{ id: string; label: string; emoji: string }> = [
  { id: "piano", label: "Piano", emoji: "🎹" },
  { id: "guitar", label: "Guitar", emoji: "🎸" },
  { id: "strings", label: "Strings", emoji: "🎻" },
  { id: "orchestra", label: "Orchestra", emoji: "🎼" },
  { id: "synth", label: "Synth", emoji: "🎛️" },
  { id: "drums", label: "Drums", emoji: "🥁" },
  { id: "bass", label: "Bass", emoji: "🔊" },
  { id: "flute", label: "Flute", emoji: "🪈" },
  { id: "saxophone", label: "Sax", emoji: "🎷" },
  { id: "percussion", label: "Percussion", emoji: "🪘" },
  { id: "pads", label: "Pads", emoji: "✨" },
  { id: "choir", label: "Choir", emoji: "🗣️" },
];

export function MusicInstrumentCards({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
      <div className="flex w-max gap-2.5">
        {INSTRUMENT_DIAGRAMS.map((item) => {
          const active = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(active ? "" : item.id)}
              className={cn(
                "flex w-[88px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition-all",
                active
                  ? "border-transparent bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md ring-2 ring-orange-500/40"
                  : "border-border/70 bg-card hover:border-orange-500/40",
              )}
            >
              <span className="text-2xl leading-none" aria-hidden>
                {item.emoji}
              </span>
              <span className={cn("text-[11px] font-semibold", active ? "text-white" : "text-foreground")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
