#!/usr/bin/env python3
"""Assemble full ImageEditor.tsx from plain-text parts and commit if needed."""
from pathlib import Path
import subprocess, sys
root = Path(".")
parts = sorted(root.glob(".restore/ie_full_part*.txt"))
if len(parts) < 12:
    print("ERROR: expected 12 parts, got", len(parts))
    sys.exit(1)
text = "".join(p.read_text() for p in parts)
assert "export function ImageEditor" in text
assert "VoiceInputButton" in text
assert "pickStudioTagline" in text
assert "canAccessImageExperience" in text
assert "Describe or upload" not in text
assert "Image Studio loading" not in text
assert len(text) > 50000
out = Path("src/components/editor/image/ImageEditor.tsx")
out.write_text(text)
print("WROTE", out, len(text), "bytes")
