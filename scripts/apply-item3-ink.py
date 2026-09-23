#!/usr/bin/env python3
"""Apply Circle2edit item 3: sticky ink colour swatch selection UI."""
from pathlib import Path
import re
import sys

p = Path("src/components/circle-edit/CircleEditShell.tsx")
t = p.read_text()
print("file len", len(t))
if "PLACEHOLDER" in t and len(t) < 500:
    print("shell is placeholder — abort", file=sys.stderr)
    sys.exit(1)
if "data-active-ink=" in t:
    print("item3 already present")
    sys.exit(0)

pat = re.compile(
    r'\{\(tool === "brush" \|\| tool === "eraser" \|\| tool === "circle"\) && onInkColor \? \([\s\S]*?data-testid="circle-ink"[\s\S]*?\) : null\}',
    re.M,
)
m = pat.search(t)
if not m:
    idx = t.find("circle-ink")
    print("circle-ink idx", idx)
    if idx >= 0:
        print(repr(t[max(0, idx - 80) : idx + 200]))
    print("ink block regex not found", file=sys.stderr)
    sys.exit(1)

new = """{onInkColor ? (
        <div className="flex items-center justify-center gap-2" data-testid="circle-ink" data-active-ink={inkColor}>
          <span className={cn("text-[10px] font-medium", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
            Ink
          </span>
          {inkColors.map((c) => {
            const selected = inkColor === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-label={c.label}
                aria-pressed={selected}
                title={c.label}
                data-ink={c.id}
                data-selected={selected ? "true" : "false"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onInkColor(c.id);
                }}
                className={cn(
                  "relative h-8 w-8 rounded-full border-2 shadow-sm transition-all",
                  selected
                    ? "border-[#7B6FE0] scale-110 ring-2 ring-[#7B6FE0]/45 shadow-[0_0_0_1px_rgba(123,111,224,0.35)]"
                    : isDark
                      ? "border-white/25 hover:border-white/40"
                      : "border-black/20 hover:border-black/35",
                )}
                style={{ background: c.swatch }}
              >
                {selected ? (
                  <span
                    className="pointer-events-none absolute inset-0 grid place-items-center"
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        c.id === "white" ? "bg-[#7B6FE0]" : "bg-white",
                        c.id === "white" ? "shadow-sm" : "shadow-[0_0_0_1px_rgba(0,0,0,0.25)]",
                      )}
                    />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}"""

t2 = pat.sub(new, t, count=1)
p.write_text(t2)
print("item3 applied", len(t2))
assert "data-active-ink=" in t2
