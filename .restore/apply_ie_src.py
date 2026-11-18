#!/usr/bin/env python3
from pathlib import Path
import json
m = json.loads(Path(".restore/ie_src.manifest.json").read_text())
parts = []
for i in range(m["parts"]):
    p = Path(f".restore/ie_src_part{i}.txt")
    if not p.exists():
        raise SystemExit(f"missing {p}")
    parts.append(p.read_text())
text = "".join(parts)
if "PLACEHOLDER" in text and len(text) < 1000:
    raise SystemExit("placeholder content")
if "VoiceInputButton" not in text:
    raise SystemExit("missing VoiceInputButton")
if "canAccessImageExperience" not in text:
    raise SystemExit("missing canAccessImageExperience")
if "What will you create today" not in text:
    raise SystemExit("missing empty-state")
if "Describe or upload to begin" in text:
    raise SystemExit("old empty state still present")
Path(m["path"]).write_text(text)
print("OK", len(text))
