#!/usr/bin/env python3
from pathlib import Path
parts = [Path(f".restore/ie_py_part{i}.txt").read_text() for i in range(3)]
text = "".join(parts)
assert "VoiceInputButton" in text
assert "path.write_text" in text
Path("scripts/patch_image_editor_motio2edit_full.py").write_text(text)
print("assembled", len(text))
