#!/usr/bin/env python3
import base64, zlib, json
from pathlib import Path
m = json.loads(Path(".restore/ie_zlib.manifest.json").read_text())
parts = []
for i in range(m["parts"]):
    p = Path(f".restore/ie_zlib.part{i}.b64")
    if not p.exists():
        raise SystemExit(f"missing {p}")
    t = p.read_text().strip()
    if "PLACEHOLDER" in t:
        raise SystemExit(f"placeholder in {p}")
    parts.append(t)
data = zlib.decompress(base64.b64decode("".join(parts)))
Path(m["path"]).write_bytes(data)
text = data.decode()
assert "showResultView" in text
assert "generateMedia" in text
assert "Motio2edit" in text
assert "PLACEHOLDER" not in text
assert "<CreditWarningBanner" not in text
print("OK", len(data))
