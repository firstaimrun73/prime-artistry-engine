#!/usr/bin/env python3
import base64, zlib, sys
from pathlib import Path
sys.path.insert(0, str(Path(".restore").resolve()))
from ie_v3_data_a import IE_A
from ie_v3_data_b import IE_B
from up_v3_data import UP

def write(path, b64, checks):
    data = zlib.decompress(base64.b64decode(b64))
    text = data.decode()
    for c in checks:
        if c not in text:
            raise SystemExit(f"missing {c!r} in {path}")
    if "PLACE" + "HOLDER" in text:
        raise SystemExit("bad marker")
    if path.endswith("ImageEditor.tsx") and "<CreditWarningBanner" in text:
        raise SystemExit("banner")
    Path(path).write_bytes(data)
    print("OK", path, len(data))

write("src/components/editor/image/ImageEditor.tsx", IE_A + IE_B,
      ["showResultView", "generateMedia", "Motio2edit", "Try Something New", "lg:grid-cols-"])
write("src/components/editor/EditorUpload.tsx", UP, ["compact"])
print("ALL OK")
