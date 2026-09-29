#!/usr/bin/env python3
"""Fix Standard multi-image Image Studio page crash root causes."""
from pathlib import Path
import re
import sys

def main() -> None:
    path = Path("src/components/editor/image/ImageEditor.tsx")
    t = path.read_text()
    if len(t) < 20000:
        sys.exit("ImageEditor too small")

    start = t.find("const onFile = async")
    end = t.find("const runImageJob")
    if start < 0 or end <= start:
        sys.exit("onFile/runImageJob anchors missing")

    new_onfile = """const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Memory-safe multi-select: never base64 the whole selection.
    // Preview via blob URL; File is the source of truth for upload.
    try {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;
      e.target.value = "";

      const maxAllowed = Math.max(1, effectiveMaxImages);
      const room = Math.min(MAX_GALLERY_IMAGES, maxAllowed) - gallery.length;
      if (room <= 0) {
        if (isFree) {
          return toast.error(MULTI_IMAGE_UPGRADE_MESSAGE, {
            action: { label: "Upgrade", onClick: () => { window.location.href = "/pricing"; } },
          });
        }
        return toast.error(
          maxAllowed <= 5
            ? ("Standard supports up to " + maxAllowed + " images (base + references).")
            : ("This experience allows up to " + maxAllowed + " images at a time."),
        );
      }
      if (files.length > room) {
        toast.message(
          "Only " + room + " more image" + (room === 1 ? "" : "s") + " can be added (max " + maxAllowed + ").",
        );
      }
      if (isFree && files.length > 1) {
        toast.message("Free plan: only 1 image. Extra files were ignored.");
      }

      // Cap BEFORE any preview allocation (critical for 9/11-at-once mobile).
      const accepted: File[] = [];
      for (const f of files.slice(0, room)) {
        if (!f.type.startsWith("image")) {
          toast.error("This workspace accepts images only. Use Video Editor for video.");
          continue;
        }
        if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
          toast.error(
            f.name + " is too large (" + (f.size / 1024 / 1024).toFixed(1) + " MB). Maximum is " + MAX_IMAGE_MB + " MB.",
          );
          continue;
        }
        accepted.push(f);
      }
      if (accepted.length === 0) return;

      const items: GalleryItem[] = accepted.map((f) => ({
        id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8),
        preview: URL.createObjectURL(f),
        dataUrl: null,
        file: f,
      }));

      const next = [...gallery, ...items];
      setGallery(next);
      activateSlot(next, gallery.length);
      toast.success(items.length > 1 ? String(items.length) + " images added" : "Upload complete");
    } catch (err) {
      console.error(err);
      toast.error("Could not add images. Try fewer or smaller files.");
    }
  };

  """
    t = t[:start] + new_onfile + t[end:]

    t = t.replace(
        "setInputDataUrl(item.dataUrl);",
        "setInputDataUrl(item.dataUrl || item.preview);",
        1,
    )

    rm_pat = re.compile(
        r"const removeImage = \(idx: number\) => \{[\s\S]*?activateSlot\(next, Math\.min\(idx, next\.length - 1\)\);\n  \};",
    )
    rm_new = """const removeImage = (idx: number) => {
    if (loading) return;
    const doomed = gallery[idx];
    if (doomed?.preview?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(doomed.preview);
      } catch {
        /* ignore */
      }
    }
    const next = gallery.filter((_, i) => i !== idx);
    setGallery(next);
    if (next.length === 0) {
      setActiveImage(0);
      setInputPreview(null);
      setInputDataUrl(null);
      setInputFile(null);
      setInputKind(null);
      setOutput(null);
      return;
    }
    activateSlot(next, Math.min(idx, next.length - 1));
  };"""
    m = rm_pat.search(t)
    if not m:
        sys.exit("removeImage not found")
    t = t[: m.start()] + rm_new + t[m.end() :]

    t = t.replace(
        "const stages = getEditorStages(!!inputDataUrl);",
        "const stages = getEditorStages(!!(inputDataUrl || inputFile || inputPreview));",
        1,
    )
    t = t.replace(
        "const hasSource = !!inputDataUrl;",
        "const hasSource = !!(inputDataUrl || inputFile || inputPreview);",
        1,
    )
    t = t.replace(
        "const canAddRefImages = !!inputDataUrl && effectiveMaxImages > 1;",
        "const canAddRefImages = !!(inputDataUrl || inputFile || gallery.length > 0) && effectiveMaxImages > 1;",
        1,
    )

    trim_pat = re.compile(
        r"useEffect\(\(\) => \{\n    if \(gallery\.length <= effectiveMaxImages\) return;\n    setGallery\(\(prev\) => prev\.slice\(0, effectiveMaxImages\)\);[\s\S]*?\}, \[effectiveMaxImages\]\); // eslint-disable-line react-hooks/exhaustive-deps",
    )
    trim_new = """useEffect(() => {
    if (gallery.length <= effectiveMaxImages) return;
    setGallery((prev) => {
      if (prev.length <= effectiveMaxImages) return prev;
      const kept = prev.slice(0, effectiveMaxImages);
      for (const g of prev.slice(effectiveMaxImages)) {
        if (g.preview?.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(g.preview);
          } catch {
            /* ignore */
          }
        }
      }
      return kept;
    });
    setActiveImage((idx) => Math.min(idx, Math.max(0, effectiveMaxImages - 1)));
  }, [effectiveMaxImages]); // eslint-disable-line react-hooks/exhaustive-deps"""
    m = trim_pat.search(t)
    if m:
        t = t[: m.start()] + trim_new + t[m.end() :]

    if "dataUrl: await readAsDataUrl" in t:
        sys.exit("still has eager readAsDataUrl")
    if "const items: GalleryItem[] = accepted.map" not in t:
        sys.exit("items map missing")
    if "item.dataUrl || item.preview" not in t:
        sys.exit("activateSlot preview fallback missing")

    start = t.find("const onFile = async")
    end = t.find("const runImageJob")
    block = t[start:end]
    if block.count("(") != block.count(")"):
        sys.exit(f"paren imbalance {block.count('(')} vs {block.count(')')}")
    if block.count("{") != block.count("}"):
        sys.exit(f"brace imbalance {block.count('{')} vs {block.count('}')}")

    path.write_text(t)
    print("OK", len(t))

if __name__ == "__main__":
    main()
