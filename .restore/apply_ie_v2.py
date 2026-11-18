#!/usr/bin/env python3
import base64, json
from pathlib import Path
m = json.loads(Path(".restore/ie_v2.manifest.json").read_text())
missing = [i for i in range(m["parts"]) if not Path(f".restore/{m['prefix']}.part{i}.b64").exists()]
if missing:
    raise SystemExit(f"missing parts: {missing[:10]}...")
b64 = "".join(Path(f".restore/{m['prefix']}.part{i}.b64").read_text().strip() for i in range(m["parts"]))
data = base64.b64decode(b64)
Path(m["path"]).write_bytes(data)
text = data.decode()
assert "showResultView" in text and "generateMedia" in text and "Motio2edit" in text
assert "PLACEHOLDER" not in text
assert "<CreditWarningBanner" not in text
print("OK", len(data))
