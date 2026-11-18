#!/usr/bin/env python3
import base64, zlib, sys
from pathlib import Path
sys.path.insert(0, str(Path(".restore").resolve()))
from ie_v3_suffix_a import SA
from ie_v3_suffix_b import SB
SUFFIX = SA + SB

def load_file_chunks(n=4):
    parts = []
    for i in range(n):
        p = Path(f".restore/ie_v3_chunk{i}.txt")
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

ie = load_file_chunks(4) + SUFFIX
write("src/components/editor/image/ImageEditor.tsx", ie,
      ["showResultView", "generateMedia", "Motio2edit", "Try Something New", "lg:grid-cols-"])
ns = {}
exec(Path(".restore/up_v3_data.py").read_text(), ns)
write("src/components/editor/EditorUpload.tsx", ns["UP"], ["compact"])
print("ALL OK")
