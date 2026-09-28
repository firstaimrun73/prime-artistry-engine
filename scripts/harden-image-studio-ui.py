#!/usr/bin/env python3
"""Surgical Image Studio UI harden/polish — does not touch generate.functions.ts."""
from pathlib import Path

changed = []

# ---------------------------------------------------------------------------
# 1) ImageEditor — premium watermark control (paid only; free already gated)
# ---------------------------------------------------------------------------
ie = Path("src/components/editor/image/ImageEditor.tsx")
t = ie.read_text()
assert "execute" not in t[:200]  # not a backend file
assert len(t) > 20000, f"ImageEditor unexpectedly small: {len(t)}"

old_wm = '''{!isFree && !isAdmin && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/40 px-3 py-2">
                        <span className="text-xs font-medium text-muted-foreground">Watermark</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={keepWatermark}
                          onClick={() =>
                            setKeepWatermark((v) => {
                              const next = !v;
                              try {
                                localStorage.setItem(WATERMARK_PREF_KEY, next ? "on" : "off");
                              } catch {
                                /* ignore */
                              }
                              return next;
                            })
                          }
                          className={cn(
                            "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            keepWatermark ? "bg-[#FF5A1F]" : "bg-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform",
                              keepWatermark && "translate-x-5",
                            )}
                          />
                          <span className="sr-only">{keepWatermark ? "Watermark on" : "Watermark off"}</span>
                        </button>
                      </div>
                    )}'''

new_wm = '''{!isFree && !isAdmin && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 shadow-sm backdrop-blur-md">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">Watermark</p>
                          <p className="text-[11px] text-muted-foreground">
                            {keepWatermark ? "On — stamped on generated output" : "Off — clean output"}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={keepWatermark}
                          onClick={() =>
                            setKeepWatermark((v) => {
                              const next = !v;
                              try {
                                localStorage.setItem(WATERMARK_PREF_KEY, next ? "on" : "off");
                              } catch {
                                /* ignore */
                              }
                              return next;
                            })
                          }
                          className={cn(
                            "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40",
                            keepWatermark ? "bg-[#FF5A1F] shadow-[0_0_12px_-2px_rgba(255,90,31,0.55)]" : "bg-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform",
                              keepWatermark && "translate-x-5",
                            )}
                          />
                          <span className="sr-only">{keepWatermark ? "Watermark on" : "Watermark off"}</span>
                        </button>
                      </div>
                    )}'''

if old_wm in t:
    t = t.replace(old_wm, new_wm, 1)
    ie.write_text(t)
    changed.append("ImageEditor watermark UI")
elif "On — stamped on generated output" in t:
    print("watermark UI already polished")
else:
    raise SystemExit("ImageEditor watermark block not found — abort")

# ---------------------------------------------------------------------------
# 2) EditorResult — polished action buttons (mode-aware preserved)
# ---------------------------------------------------------------------------
er = Path("src/components/editor/EditorResult.tsx")
rt = er.read_text()
assert len(rt) > 500
assert "hasSourceImage" in rt
assert "Regenerate" in rt and "Edit Again" in rt

new_er = '''import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Recycle, Share2, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface EditorResultProps {
  output: string | null;
  loading: boolean;
  onDownload: () => void;
  onRegenerate: () => void;
  onEditAgain: () => void;
  onShare: () => void;
  onClear: () => void;
  isFree: boolean;
  downloaded: boolean;
  /** When true (I2I / multi-ref), show Edit Again. When false (T2I), show Regenerate. Never both. */
  hasSourceImage?: boolean;
}

const btnBase =
  "min-h-[42px] rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/35";

export function EditorResult({
  output,
  loading,
  onDownload,
  onRegenerate,
  onEditAgain,
  onShare,
  onClear,
  isFree,
  downloaded,
  hasSourceImage = false,
}: EditorResultProps) {
  return (
    <>
      {output && !loading && (
        <div className="space-y-2.5 animate-fade-in">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Button
              variant="default"
              className={`${btnBase} bg-[#FF5A1F] text-white hover:bg-[#FF5A1F]/90 shadow-sm shadow-[#FF5A1F]/25`}
              onClick={onDownload}
            >
              <Download className="mr-1.5 h-4 w-4" /> Download
            </Button>
            {hasSourceImage ? (
              <Button
                variant="outline"
                className={`${btnBase} border-border/70 bg-card/40 backdrop-blur-sm hover:border-[#FF5A1F]/40`}
                onClick={onEditAgain}
              >
                <Recycle className="mr-1.5 h-4 w-4" /> Edit Again
              </Button>
            ) : (
              <Button
                variant="outline"
                className={`${btnBase} border-border/70 bg-card/40 backdrop-blur-sm hover:border-[#FF5A1F]/40`}
                onClick={onRegenerate}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerate
              </Button>
            )}
            <Button
              variant="outline"
              className={`${btnBase} border-border/70 bg-card/40 backdrop-blur-sm hover:border-[#FF5A1F]/40`}
              onClick={onShare}
            >
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
          </div>
          <Button
            variant="ghost"
            className={`${btnBase} w-full text-muted-foreground hover:text-foreground`}
            onClick={onClear}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" /> New Edit
          </Button>
          {isFree && (
            <p className="text-center text-[11px] text-muted-foreground">
              Free images include a small watermark.{" "}
              <Link to="/pricing" className="underline decoration-[#FF5A1F]/50 underline-offset-2 hover:text-[#FF5A1F]">
                Upgrade
              </Link>{" "}
              to remove it.
            </p>
          )}
        </div>
      )}

      {downloaded && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-3 text-sm shadow-sm backdrop-blur-sm animate-fade-in">
          <span className="text-muted-foreground">Saved! What next?</span>
          <Button size="sm" variant="secondary" className="rounded-lg" onClick={onClear}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> New Edit
          </Button>
        </div>
      )}
    </>
  );
}
'''

if "btnBase" not in rt:
    er.write_text(new_er)
    changed.append("EditorResult polish")
else:
    print("EditorResult already polished")

# ---------------------------------------------------------------------------
# 3) Weekly carousel title → Weekly Top 10
# ---------------------------------------------------------------------------
car = Path("src/components/editor/image/ImageStudioWeeklyCarousel.tsx")
ct = car.read_text()
assert len(ct) > 500
assert "modeIcon" in ct
old_title = "Motion2Ai · This Week's Creative Generations"
new_title = "Weekly Top 10"
if old_title in ct:
    ct = ct.replace(old_title, new_title, 1)
    car.write_text(ct)
    changed.append("carousel title")
elif "Weekly Top 10" in ct:
    print("carousel title already set")
else:
    # try alternate encoding
    alt = "Motion2Ai · This Week's Creative Generations"
    if alt in ct:
        ct = ct.replace(alt, new_title, 1)
        car.write_text(ct)
        changed.append("carousel title")
    else:
        print("WARN: carousel title not matched")

# ---------------------------------------------------------------------------
# 4) Registry comment only — do not change live routing
# ---------------------------------------------------------------------------
reg = Path("src/lib/studio/image/image-model-registry.ts")
rg = reg.read_text()
note = (
    " * NOTE: Live Image Studio generation routes through generate.functions.ts →\n"
    " * executeStandardImage / executePremiumImage / executeUltraImage.\n"
    " * This registry is documentation / future selection only — not the runtime path.\n"
)
if "not the runtime path" not in rg:
    marker = " * Isolated from Video/Music.\n"
    if marker in rg:
        rg = rg.replace(marker, marker + note, 1)
        reg.write_text(rg)
        changed.append("registry note")
    else:
        print("WARN: registry marker missing")
else:
    print("registry note present")

# ---------------------------------------------------------------------------
# Final safety assertions
# ---------------------------------------------------------------------------
gen = Path("src/lib/generate.functions.ts").read_text()
assert len(gen) > 20000, "generate.functions.ts shrank — abort"
assert "PLACEHOLDER" not in gen or len(gen) > 1000
assert "Fail closed" in gen
assert "returning clean URL" not in gen
assert "executeStandardImage" in gen
assert "executePremiumImage" in gen
assert "executeUltraImage" in gen
assert "finalizeMediaAsset" in gen
assert "persistGenerationHistory" in gen

ie2 = ie.read_text()
assert "ImageStudioWeeklyCarousel" in ie2
assert 'StudioBackLink className="shrink-0"' in ie2
assert "readKeepWatermarkPref" in ie2 or "useState(true)" in ie2
assert "{!isFree && !isAdmin &&" in ie2

er2 = er.read_text()
assert "hasSourceImage" in er2
assert "Regenerate" in er2 and "Edit Again" in er2

print("CHANGED:", changed)
print("OK")
