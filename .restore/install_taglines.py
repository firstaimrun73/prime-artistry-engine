#!/usr/bin/env python3
from pathlib import Path
parts = []
i = 0
while True:
    p = Path(f".restore/taglines_part{i}.txt")
    if not p.exists():
        break
    parts.append(p.read_text())
    i += 1
text = "".join(parts)
assert "STUDIO_TAGLINES" in text
assert "pickStudioTagline" in text
Path("src/lib/studio/studio-taglines.ts").write_text(text)
print("taglines OK", len(text), "lines", text.count(chr(10)))
