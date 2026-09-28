#!/usr/bin/env python3
"""Surgical ImageEditor UI pass — no full-file rewrite."""
from pathlib import Path

p = Path("src/components/editor/image/ImageEditor.tsx")
t = p.read_text()
changed = False

# 1) Imports
if "ImageStudioWeeklyCarousel" not in t:
    needle = 'import { StudioBackLink } from "@/components/StudioBackLink";'
    insert = (
        needle
        + "\n"
        + 'import { ImageStudioWeeklyCarousel } from "@/components/editor/image/ImageStudioWeeklyCarousel";'
        + "\n"
        + 'import { readKeepWatermarkPref } from "@/lib/watermark-pref";'
    )
    if needle not in t:
        raise SystemExit("StudioBackLink import not found")
    t = t.replace(needle, insert, 1)
    changed = True

# 2) keepWatermark default ON
old_kw = "const [keepWatermark, setKeepWatermark] = useState(false);"
new_kw = "const [keepWatermark, setKeepWatermark] = useState(true); // default ON; hydrated from pref"
if old_kw in t:
    t = t.replace(old_kw, new_kw, 1)
    changed = True

# 3) Hydrate from shared pref
old_eff = """  useEffect(() => {
    try {
      const pref = localStorage.getItem(WATERMARK_PREF_KEY);
      if (pref === "on") setKeepWatermark(true);
      if (pref === "off") setKeepWatermark(false);
    } catch {
      /* ignore */
    }
  }, []);"""
new_eff = """  useEffect(() => {
    setKeepWatermark(readKeepWatermarkPref());
  }, []);"""
if old_eff in t:
    t = t.replace(old_eff, new_eff, 1)
    changed = True
elif "readKeepWatermarkPref()" not in t:
    print("WARN: watermark pref effect not rewritten")

# 4) Header: Home same row
old_header = """          <div className=\"flex min-w-0 flex-wrap items-center justify-between gap-2 animate-fade-in\">
            <div className=\"min-w-0 space-y-1\">
              <StudioBackLink />
              <div className=\"flex min-w-0 items-center gap-2\">"""
new_header = """          <div className=\"flex min-w-0 flex-wrap items-center justify-between gap-2 animate-fade-in\">
            <div className=\"flex min-w-0 items-center gap-2 sm:gap-3\">
              <StudioBackLink className=\"shrink-0\" />
              <span className=\"hidden h-5 w-px shrink-0 bg-border/60 sm:block\" aria-hidden />
              <div className=\"flex min-w-0 items-center gap-2\">"""
if old_header in t:
    t = t.replace(old_header, new_header, 1)
    changed = True
elif 'StudioBackLink className="shrink-0"' not in t:
    print("WARN: header block not found")

# 5) Carousel below Output
old_out = """              </section>
              <EditorDisclaimer />"""
new_out = """              </section>
              <ImageStudioWeeklyCarousel />
              <EditorDisclaimer />"""
if old_out in t and "<ImageStudioWeeklyCarousel" not in t:
    t = t.replace(old_out, new_out, 1)
    changed = True

# 6) hasSourceImage on EditorResult
if "hasSourceImage=" not in t and "<EditorResult" in t:
    old_er = """                    <EditorResult
                      output={output}
                      loading={loading || standardCompleteHold || premiumCompleteHold || ultraCompleteHold}
                      onDownload={handleDownload}
                      onRegenerate={runGenerate}
                      onEditAgain={handleUseResultAsInput}
                      onShare={handleShare}
                      onClear={handleClear}
                      isFree={isFree}
                      downloaded={downloaded}
                    />"""
    new_er = """                    <EditorResult
                      output={output}
                      loading={loading || standardCompleteHold || premiumCompleteHold || ultraCompleteHold}
                      onDownload={handleDownload}
                      onRegenerate={runGenerate}
                      onEditAgain={handleUseResultAsInput}
                      onShare={handleShare}
                      onClear={handleClear}
                      isFree={isFree}
                      downloaded={downloaded}
                      hasSourceImage={!!inputDataUrl || refImages.length > 0}
                    />"""
    if old_er in t:
        t = t.replace(old_er, new_er, 1)
        changed = True
    else:
        print("WARN: EditorResult block not exact match")

if not changed:
    print("no changes needed")
else:
    p.write_text(t)
    print("patched", p)

# Assertions
text = p.read_text()
assert "ImageStudioWeeklyCarousel" in text
assert 'StudioBackLink className="shrink-0"' in text
assert "useState(false)" not in text or "keepWatermark" not in text.split("useState(false)")[0][-40:]
assert "hasSourceImage=" in text
print("OK")
