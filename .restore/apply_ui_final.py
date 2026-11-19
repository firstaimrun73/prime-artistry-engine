#!/usr/bin/env python3
import base64, zlib, json, pathlib, sys
root = pathlib.Path(".")
payload_dir = root / ".restore" / "ui_payload_final"
manifest = json.loads((payload_dir / "MANIFEST.json").read_text())
b64 = "".join((payload_dir / f"chunk_{i}.b64").read_text().strip() for i in range(manifest["chunks"]))
raw = zlib.decompress(base64.b64decode(b64))
for item in manifest["manifest"]:
  data = raw[item["start"]:item["end"]]
  path = root / item["path"]
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_bytes(data)
  print("wrote", item["path"], len(data))
# verify
import re
t = (root/"src/lib/studio/studio-taglines-a.ts").read_text() + (root/"src/lib/studio/studio-taglines-b.ts").read_text()
qs = re.findall(r'"((?:\\.|[^"\\])*)"', t)
assert len(qs) >= 2000 and len(set(qs)) == len(qs), (len(qs), len(set(qs)))
ie = (root/"src/components/editor/image/ImageEditor.tsx").read_text()
assert "InspirationTagline" in ie
assert 'alt="Selected"' not in ie
assert "promptFocused" in ie
print("VERIFY_OK")
