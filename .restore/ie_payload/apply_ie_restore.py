#!/usr/bin/env python3
"""Restore ImageEditor.tsx from zlib+base64 chunks in this directory."""
from pathlib import Path
import base64, zlib, sys

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "MANIFEST"
TARGET = Path("src/components/editor/image/ImageEditor.tsx")

def main():
    names = [ln.strip() for ln in MANIFEST.read_text().splitlines() if ln.strip()]
    b64 = "".join((ROOT / n).read_text().strip() for n in names)
    raw = zlib.decompress(base64.b64decode(b64))
    text = raw.decode("utf-8")
    if "export function ImageEditor" not in text:
        print("ERROR: missing export function ImageEditor", file=sys.stderr)
        sys.exit(1)
    if text.count("{") != text.count("}"):
        print("ERROR: brace mismatch", file=sys.stderr)
        sys.exit(1)
    if "return <div>ImageEditor stub" in text:
        print("ERROR: stub content detected", file=sys.stderr)
        sys.exit(1)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_bytes(raw)
    print(f"Restored {TARGET} ({len(raw)} bytes)")
    print("tail:", text[-120:].replace("\\n", " "))

if __name__ == "__main__":
    main()
