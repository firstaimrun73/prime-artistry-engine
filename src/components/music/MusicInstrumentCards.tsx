import type { ReactElement } from "react";
import { cn } from "@/lib/utils";

/** Compact outline instrument diagrams — stroke uses currentColor for theme. */
function IconPiano({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="12" width="28" height="16" rx="2" />
      <path d="M12 12v10M16 12v7M20 12v10M24 12v7M28 12v10" />
      <path d="M14 12v6h4V12M22 12v6h4V12" fill="currentColor" fillOpacity="0.2" stroke="none" />
    </svg>
  );
}
function IconGuitar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="16" cy="24" rx="9" ry="8" />
      <circle cx="16" cy="24" r="3" />
      <path d="M23 18l10-10M33 8l-2 2M29 12l2-2" />
      <path d="M12 24h8" />
    </svg>
  );
}
function IconStrings({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6c-6 4-8 10-8 16 0 6 3 10 8 12 5-2 8-6 8-12 0-6-2-12-8-16z" />
      <path d="M20 10v20M16 16h8M15 22h10" />
    </svg>
  );
}
function IconOrchestra({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 28c2-6 4-10 6-10s3 4 5 10" />
      <path d="M14 28c2-5 3-8 5-8s3 3 5 8" />
      <path d="M20 28c1-4 2-6 4-6s2 2 4 6" />
      <path d="M10 18h20M12 14h16" />
    </svg>
  );
}
function IconSynth({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="14" width="30" height="14" rx="2" />
      <circle cx="12" cy="21" r="2.5" />
      <circle cx="20" cy="21" r="2.5" />
      <circle cx="28" cy="21" r="2.5" />
      <path d="M10 14V11M20 14V10M30 14V12" />
    </svg>
  );
}
function IconDrums({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="20" cy="18" rx="12" ry="5" />
      <path d="M8 18v8c0 3 5 5 12 5s12-2 12-5v-8" />
      <path d="M14 10l2 6M26 10l-2 6" />
    </svg>
  );
}
function IconBass({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 28c0-8 4-14 8-14s8 6 8 14" />
      <circle cx="20" cy="28" r="5" />
      <path d="M20 14V8M17 10h6" />
    </svg>
  );
}
function IconFlute({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22h28" />
      <circle cx="12" cy="22" r="1.2" fill="currentColor" />
      <circle cx="18" cy="22" r="1.2" fill="currentColor" />
      <circle cx="24" cy="22" r="1.2" fill="currentColor" />
      <circle cx="30" cy="22" r="1.2" fill="currentColor" />
      <path d="M6 20v4M34 20v4" />
    </svg>
  );
}
function IconSax({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 8c0 0 2 8 2 12 0 6-4 10-4 14h10c0-4-2-6-2-10 0-4 2-10 2-14" />
      <path d="M12 8h6" />
      <circle cx="18" cy="18" r="1" fill="currentColor" />
      <circle cx="17" cy="22" r="1" fill="currentColor" />
    </svg>
  );
}
function IconPerc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="20" cy="16" rx="10" ry="4" />
      <path d="M10 16v10c0 2 4 4 10 4s10-2 10-4V16" />
      <path d="M14 26l-2 6M26 26l2 6" />
    </svg>
  );
}
function IconPads({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 24c4-8 8-10 12-10s8 2 12 10" />
      <path d="M12 28c3-5 5-6 8-6s5 1 8 6" />
      <circle cx="20" cy="14" r="2" />
    </svg>
  );
}
function IconChoir({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="20" cy="14" r="5" />
      <path d="M10 30c1-6 5-8 10-8s9 2 10 8" />
      <path d="M16 18c-2 2-3 4-3 6M24 18c2 2 3 4 3 6" />
    </svg>
  );
}

const INSTRUMENTS: ReadonlyArray<{
  id: string;
  label: string;
  Icon: (p: { className?: string }) => ReactElement;
}> = [
  { id: "piano", label: "Piano", Icon: IconPiano },
  { id: "guitar", label: "Guitar", Icon: IconGuitar },
  { id: "strings", label: "Strings", Icon: IconStrings },
  { id: "orchestra", label: "Orchestra", Icon: IconOrchestra },
  { id: "synth", label: "Synth", Icon: IconSynth },
  { id: "drums", label: "Drums", Icon: IconDrums },
  { id: "bass", label: "Bass", Icon: IconBass },
  { id: "flute", label: "Flute", Icon: IconFlute },
  { id: "saxophone", label: "Sax", Icon: IconSax },
  { id: "percussion", label: "Percussion", Icon: IconPerc },
  { id: "pads", label: "Pads", Icon: IconPads },
  { id: "choir", label: "Choir", Icon: IconChoir },
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
      <div className="flex w-max gap-2">
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
                "flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-xl border px-1.5 py-2.5 transition-all",
                active
                  ? "border-transparent bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600 text-white shadow-md ring-2 ring-orange-500/30"
                  : "border-border/60 bg-card text-foreground hover:border-orange-500/40",
              )}
            >
              <Icon className={cn("h-8 w-8", active ? "text-white" : "text-primary")} />
              <span className={cn("text-[10px] font-semibold", active ? "text-white" : "text-foreground")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
