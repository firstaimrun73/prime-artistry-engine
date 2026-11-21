#!/usr/bin/env python3
import base64, zlib
from pathlib import Path
parts = sorted(Path(".").glob(".restore/maluto_ae_b64_*.txt"))
assert parts, "missing b64 parts"
data = "".join(p.read_text().strip() for p in parts)
raw = zlib.decompress(base64.b64decode(data))
text = raw.decode()
assert "pickMalutoTagline" in text
assert "Upload Your Photo" in text
assert "resolveAvatarSrc" in text
assert "auto 2MP" not in text
assert len(text) > 15000
Path("src/components/auto-edit/AutoEditPage.tsx").write_bytes(raw)
print("OK", len(raw))
