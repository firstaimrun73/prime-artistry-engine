#!/usr/bin/env python3
import base64, zlib, json
from pathlib import Path
m = json.loads(Path(".restore/ie_zlib.manifest.json").read_text())
parts = []
bad = "PLACE" + "HOLDER"
for i in range(m["parts"]):
    p = Path(f".restore/ie_zlib.part{i}.b64")
    if not p.exists():
        raise SystemExit(f"missing {p}")
    t = "".join(p.read_text().split())
    if bad in t:
        raise SystemExit(f"bad content in {p}")
    parts.append(t)
data = zlib.decompress(base64.b64decode("".join(parts)))
Path(m["path"]).write_bytes(data)
text = data.decode()
assert "showResultView" in text or "runGenerate" in text
assert "generateMedia" in text
assert "Motio2edit" in text or "Image" in text
assert bad not in text
print("OK", len(data))
