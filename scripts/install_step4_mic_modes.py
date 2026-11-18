#!/usr/bin/env python3
import base64
from pathlib import Path
a = Path(".restore/step4_b64_a.txt").read_text().strip()
b = Path(".restore/step4_b64_b.txt").read_text().strip()
blob = a + b
pad = (-len(blob)) % 4
if pad:
    blob += "=" * pad
Path("scripts/patch_ie_step4_mic_modes.py").write_bytes(base64.b64decode(blob))
print("installed step4", Path("scripts/patch_ie_step4_mic_modes.py").stat().st_size)
