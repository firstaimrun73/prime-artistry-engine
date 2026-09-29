#!/usr/bin/env python3
"""Assemble music.functions.ts from base64 parts and write to src/lib/music.functions.ts"""
from pathlib import Path
import base64
import sys

root = Path(__file__).resolve().parents[2]
parts_dir = Path(__file__).resolve().parent
parts = sorted(parts_dir.glob("part*.b64"))
if not parts:
    print("No parts found", file=sys.stderr)
    sys.exit(1)
b64 = "".join(p.read_text().strip() for p in parts)
data = base64.b64decode(b64)
text = data.decode("utf-8")
required = [
    "export const generateMusic",
    "export const estimateMusicCost",
    "export const getVoicePreview",
    "export const getMusicCapabilities",
    "deduct_credits",
    "music_history",
]
for r in required:
    if r not in text:
        print(f"Missing required symbol: {r}", file=sys.stderr)
        sys.exit(1)
out = root / "src/lib/music.functions.ts"
out.write_text(text)
print(f"Wrote {out} ({len(text)} bytes)")
