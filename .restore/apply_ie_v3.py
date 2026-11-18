#!/usr/bin/env python3
import base64, zlib, json
from pathlib import Path

def apply(prefix):
    m = json.loads(Path(f".restore/{prefix}.manifest.json").read_text())
    parts = []
    for i in range(m["parts"]):
        p = Path(f".restore/{prefix}.part{i}.b64")
        if not p.exists():
            raise SystemExit(f"missing {p}")
        parts.append("".join(p.read_text().split()))
    data = zlib.decompress(base64.b64decode("".join(parts)))
    Path(m["path"]).write_bytes(data)
    print(prefix, "OK", len(data), m["path"])
    return data

ie = apply("ie_v3")
text = ie.decode()
assert "showResultView" in text
assert "generateMedia" in text
assert "Motio2edit" in text
assert "Try Something New" in text
assert "lg:grid-cols-" in text
assert "<CreditWarningBanner" not in text
up = apply("up_v3")
assert b"compact" in up
print("ALL OK")
