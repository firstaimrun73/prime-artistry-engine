#!/usr/bin/env python3
from pathlib import Path
import base64, zlib, sys
ROOT = Path(__file__).resolve().parent
names = [ln.strip() for ln in (ROOT/"MANIFEST").read_text().splitlines() if ln.strip()]
b64 = "".join((ROOT/n).read_text().strip() for n in names)
raw = zlib.decompress(base64.b64decode(b64))
text = raw.decode("utf-8")
assert "export const generateMedia" in text
assert "{ falKey, runStep" in text
assert "executePremiumImage({\n            falKey," not in text
assert "AUTO_SERVER_ORCHESTRATION" in text
TARGET = Path("src/lib/generate.functions.ts")
TARGET.write_bytes(raw)
print(f"Restored {TARGET} ({len(raw)} bytes)")
