import type { ReactElement } from "react";
import { cn } from "@/lib/utils";

/** Clear outline instrument diagrams — currentColor for theme, sticker-friendly size. */
function IconPiano({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="14" width="36" height="22" rx="3" />
      <path d="M12 14v14M17 14v10M22 14v14M27 14v10M32 14v14M37 14v10" />
      <path d="M14.5 14v9h5V14M24.5 14v9h5V14" fill="currentColor" fillOpacity="0.22" stroke="none" />
    </svg>
  );
}
function IconGuitar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="18" cy="28" rx="11" ry="10" />
      <circle cx="18" cy="28" r="3.5" />
      <path d="M27 20l12-12M39 8l-2.5 2.5M34 13l2.5-2.5" />
      <path d="M13 28h10" />
      <circle cx="39" cy="9" r="1.5" fill="currentColor" />
    </svg>
  );
}
function IconStrings({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 6c-7 5-10 12-10 20 0 8 4 13 10 15 6-2 10-7 10-15 0-8-3-15-10-20z" />
      <path d="M24 12v24M19 18h10M18 26h12" />
    </svg>
  );
}
function IconOrchestra({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 34c3-8 6-13 8-13s4 5 7 13" />
      <path d="M16 34c2.5-6 4-10 6.5-10s4 4 6.5 10" />
      <path d="M24 34c1.5-5 3-8 5-8s3.5 3 5 8" />
      <path d="M10 20h28M13 15h22" />
      <circle cx="24" cy="12" r="2" fill="currentColor" fillOpacity="0.3" stroke="none" />
    </svg>
  );
}
function IconSynth({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="16" width="38" height="18" rx="3" />
      <circle cx="14" cy="25" r="3" />
      <circle cx="24" cy="25" r="3" />
      <circle cx="34" cy="25" r="3" />
      <path d="M12 16V12M24 16V11M36 16V13" />
      <path d="M8 22h4M18 22h4M28 22h4" strokeWidth="1.2" />
    </svg>
  );
}
function IconDrums({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="24" cy="20" rx="14" ry="6" />
      <path d="M10 20v10c0 3.5 6 6 14 6s14-2.5 14-6V20" />
      <path d="M16 11l2.5 7M32 11l-2.5 7" />
      <path d="M24 26v4" />
    </svg>
  );
}
function IconBass({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 34c0-10 5-17 10-17s10 7 10 17" />
      <circle cx="24" cy="34" r="6" />
      <path d="M24 17V8M20 11h8" />
      <path d="M24 28v6" />
    </svg>
  );
}
function IconFlute({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 26h36" />
      <circle cx="14" cy="26" r="1.6" fill="currentColor" />
      <circle cx="22" cy="26" r="1.6" fill="currentColor" />
      <circle cx="30" cy="26" r="1.6" fill="currentColor" />
      <circle cx="38" cy="26" r="1.6" fill="currentColor" />
      <path d="M6 23v6M42 23v6" />
    </svg>
  );
}
function IconSax({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8c0 0 3 10 3 15 0 7-5 12-5 17h12c0-5-2.5-7-2.5-12 0-5 2.5-12 2.5-17" />
      <path d="M14 8h8" />
      <circle cx="21" cy="20" r="1.3" fill="currentColor" />
      <circle cx="20" cy="26" r="1.3" fill="currentColor" />
      <path d="M26 40c2 0 4-1 4-3" />
    </svg>
  );
}
function IconPerc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="24" cy="18" rx="12" ry="5" />
      <path d="M12 18v12c0 2.5 5 5 12 5s12-2.5 12-5V18" />
      <path d="M16 30l-3 8M32 30l3 8" />
    </svg>
  );
}
function IconPads({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 28c5-10 10-13 16-13s11 3 16 13" />
      <path d="M13 33c4-6 6-8 11-8s7 2 11 8" />
      <circle cx="24" cy="15" r="2.5" />
    </svg>
  );
}
function IconChoir({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="15" r="6" />
      <path d="M10 36c1.5-8 6-10 14-10s12.5 2 14 10" />
      <path d="M18 21c-2.5 2.5-4 5-4 8M30 21c2.5 2.5 4 5 4 8" />
    </svg>
  );
}

const INSTRUMENTS: ReadonlyArray<{
  id: string;
  label: string;
  emoji: string;
  Icon: (p: { className?: string }) => ReactElement;
}> = [
  { id: "piano", label: "Piano", emoji: "🎹", Icon: IconPiano },
  { id: "guitar", label: "Guitar", emoji: "🎸", Icon: IconGuitar },
  { id: "strings", label: "Strings", emoji: "🎻", Icon: IconStrings },
  { id: "orchestra", label: "Orchestra", emoji: "🎼", Icon: IconOrchestra },
  { id: "synth", label: "Synth", emoji: "🎛️", Icon: IconSynth },
  { id: "drums", label: "Drums", emoji: "🥁", Icon: IconDrums },
  { id: "bass", label: "Bass", emoji: "🔊", Icon: IconBass },
  { id: "flute", label: "Flute", emoji: "🪈", Icon: IconFlute },
  { id: "saxophone", label: "Sax", emoji: "🎷", Icon: IconSax },
  { id: "percussion", label: "Perc", emoji: "🪘", Icon: IconPerc },
  { id: "pads", label: "Pads", emoji: "☁️", Icon: IconPads },
  { id: "choir", label: "Choir", emoji: "👥", Icon: IconChoir },
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
      <div className="flex w-max gap-2.5">
        {INSTRUMENTS.map((item) => {
          const active = value === item.id;
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(active ? "" : item.id)}
              aria-pressed={active}
              className={cn(
                "flex w-[84px] shrink-0 flex-col items-center gap-1 rounded-2xl border px-1.5 py-3 transition-all active:scale-[0.97]",
                active
                  ? "border-transparent bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600 text-white shadow-lg ring-2 ring-orange-400/40"
                  : "border-border/60 bg-card text-foreground hover:border-orange-500/45 hover:shadow-sm",
              )}
            >
              <span className="text-lg leading-none" aria-hidden>
                {item.emoji}
              </span>
              <Icon className={cn("h-9 w-9", active ? "text-white" : "text-primary")} />
              <span className={cn("text-[10px] font-bold tracking-tight", active ? "text-white" : "text-foreground")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
