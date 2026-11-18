#!/usr/bin/env python3
import base64
from pathlib import Path
parts = []
i = 0
while True:
    p = Path(f".restore/ie_patch_b64_{i}.txt")
    if not p.exists():
        break
    parts.append(p.read_text().strip())
    i += 1
if not parts:
    raise SystemExit("no parts")
b = "".join(parts)
pad = (-len(b)) % 4
if pad:
    b += "=" * pad
data = base64.b64decode(b)
out = Path("scripts/patch_image_editor_motio2edit_full.py")
out.write_bytes(data)
text = data.decode()
assert "VoiceInputButton" in text
assert "canAccessImageExperience" in text
print("installed", len(data))
