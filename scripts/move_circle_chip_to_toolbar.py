#!/usr/bin/env python3
"""Move Ready-to-place chip from canvas overlay into controls toolbar."""
from pathlib import Path

path = Path("src/routes/studio.image.circle-remove.tsx")
lines = path.read_text().splitlines(True)
out = []
i = 0
while i < len(lines):
    if 'mode === "add" && addConfirmed && selectedAsset' in lines[i]:
        window = "".join(lines[i : min(len(lines), i + 20)])
        if "data-circle-place-chip" in window and "absolute" in window:
            while i < len(lines) and ") : null}" not in lines[i]:
                i += 1
            if i < len(lines):
                i += 1
            continue
    out.append(lines[i])
    i += 1
rt = "".join(out)

old = """          {!addConfirmed ? (
  <button
    type="button"
    onClick={() => setAddDrawerOpen(true)}
    className="rounded-xl border border-[#7B6FE0]/40 bg-[rgba(123,111,224,0.08)] px-3 py-1.5 text-[12px] font-semibold text-[#7B6FE0] backdrop-blur-md"
  >
    Browse objects
  </button>
) : null}"""

new = """          {!addConfirmed ? (
            <button
              type="button"
              onClick={() => setAddDrawerOpen(true)}
              className="rounded-xl border border-[#7B6FE0]/40 bg-[rgba(123,111,224,0.08)] px-3 py-1.5 text-[12px] font-semibold text-[#7B6FE0] backdrop-blur-md"
            >
              Browse objects
            </button>
          ) : selectedAsset ? (
            <div
              className={cn(
                "flex w-full max-w-full items-center gap-1.5 overflow-hidden rounded-xl border px-2.5 py-1.5",
                isDark ? "border-[#7B6FE0]/35 bg-[rgba(123,111,224,0.10)]" : "border-[#7B6FE0]/25 bg-[rgba(123,111,224,0.06)]",
              )}
              data-circle-place-chip="true"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[rgba(123,111,224,0.2)]">
                <AssetIcon asset={selectedAsset} size={16} isDark={isDark} selected />
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#7B6FE0]">
                Ready to place {selectedAsset.name}
              </span>
              <button
                type="button"
                aria-label="Change object"
                onClick={() => {
                  setAddConfirmed(false);
                  setConfirmOpen(true);
                }}
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-[#7B6FE0]/90"
              >
                Change
              </button>
              <button
                type="button"
                aria-label="Clear selected object"
                onClick={() => {
                  setAddObjectId(null);
                  setFactorSelection({});
                  setAddConfirmed(false);
                  setConfirmOpen(false);
                  maskStageRef.current?.clear();
                  setHasMask(false);
                }}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-bold text-[#7B6FE0]/80"
              >
                X
              </button>
            </div>
          ) : null}"""

if old not in rt:
    raise SystemExit("browse block missing")
if "data-circle-place-chip" not in rt:
    rt = rt.replace(old, new, 1)

if "PLACEHOLDER" in rt:
    raise SystemExit("placeholder")
if rt.count("data-circle-place-chip") != 1:
    raise SystemExit(f"chip count={rt.count('data-circle-place-chip')}")
idx = rt.find("data-circle-place-chip")
if "absolute" in rt[max(0, idx - 220) : idx]:
    raise SystemExit("chip still absolute")
if "const controls" not in rt[:idx]:
    raise SystemExit("chip not under controls")

path.write_text(rt)
print("moved chip into toolbar ok")
