import { cn } from "@/lib/utils";

/** Horizontal-scroll chips — never flex-wrap + max-height (avoids clipped genre rows). */
export function MusicScrollChips({
  items,
  value,
  onChange,
  activeClass = "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-sm",
  capitalize = true,
}: {
  items: readonly string[];
  value: string;
  onChange: (v: string) => void;
  activeClass?: string;
  capitalize?: boolean;
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
      {items.map((item) => {
        const active = value === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(active ? "" : item)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all",
              capitalize && "capitalize",
              active
                ? activeClass
                : "border-border/80 bg-background/80 text-foreground hover:border-orange-500/50 hover:bg-orange-500/5",
            )}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
