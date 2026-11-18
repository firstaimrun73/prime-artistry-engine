#!/usr/bin/env python3
import base64, zlib
from pathlib import Path

def load_chunks(prefix, n):
    parts = []
    for i in range(n):
        p = Path(f".restore/{prefix}{i}.txt")
        if not p.exists():
            raise SystemExit(f"missing {p}")
        parts.append("".join(p.read_text().split()))
    return "".join(parts)

def write(path, b64, checks):
    data = zlib.decompress(base64.b64decode(b64))
    text = data.decode()
    for c in checks:
        if c not in text:
            raise SystemExit(f"missing {c!r} in {path}")
    if path.endswith("ImageEditor.tsx") and "<CreditWarningBanner" in text:
        raise SystemExit("banner")
    Path(path).write_bytes(data)
    print("OK", path, len(data))

n = len(list(Path(".restore").glob("ie_v3_chunk*.txt")))
ie = load_chunks("ie_v3_chunk", n)
write("src/components/editor/image/ImageEditor.tsx", ie,
      ["showResultView", "generateMedia", "Motio2edit", "Try Something New", "lg:grid-cols-"])
ns = {}
exec(Path(".restore/up_v3_data.py").read_text(), ns)
write("src/components/editor/EditorUpload.tsx", ns["UP"], ["compact"])
print("ALL OK")
