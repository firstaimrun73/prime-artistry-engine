import { cn } from "@/lib/utils";

export type MusicChipItem =
  | string
  | {
      id: string;
      label: string;
      glyph?: string;
    };

function normalizeChip(item: MusicChipItem): { id: string; label: string; glyph?: string } {
  if (typeof item === "string") return { id: item, label: item };
  return { id: item.id, label: item.label, glyph: item.glyph };
}

/** Horizontal-scroll chips — never flex-wrap + max-height (avoids clipped genre rows). */
export function MusicScrollChips({
  items,
  value,
  onChange,
  activeClass = "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-sm",
  capitalize = true,
}: {
  items: readonly MusicChipItem[];
  value: string;
  onChange: (v: string) => void;
  activeClass?: string;
  capitalize?: boolean;
}) {
  return (
    <div className="w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
      <div className="flex w-max max-w-none gap-2">
        {items.map((raw) => {
          const item = normalizeChip(raw);
          const active = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(active ? "" : item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                capitalize && !item.glyph && "capitalize",
                active
                  ? activeClass
                  : "border-border/80 bg-background/80 text-foreground hover:border-orange-500/50 hover:bg-orange-500/5",
              )}
            >
              {item.glyph ? <span aria-hidden className="text-[13px] leading-none">{item.glyph}</span> : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
