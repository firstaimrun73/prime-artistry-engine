#!/usr/bin/env python3
from pathlib import Path
path = Path("src/components/editor/image/ImageEditor.tsx")
text = path.read_text(encoding="utf-8")
needle = "keepWatermark: isFreePlanForWm ? true : keepWatermark,"
idx = text.find(needle)
if idx == -1:
    raise SystemExit("keepWatermark not found")
if "workspaceMode," in text[idx : idx + 100]:
    print("workspaceMode already present")
else:
    text = text.replace(
        needle + "\n        },",
        needle + "\n          workspaceMode,\n        },",
        1,
    )
    path.write_text(text, encoding="utf-8")
    print("ImageEditor patched")
assert "export function ImageEditor" in path.read_text()
assert "ImageEditor stub" not in path.read_text()
print("IE size", path.stat().st_size)
