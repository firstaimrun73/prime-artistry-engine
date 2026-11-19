#!/usr/bin/env python3
import zlib, base64, pathlib
root = pathlib.Path(__file__).with_name("ui_payload")
manifest = (root / "MANIFEST.txt").read_text().split()
groups = {}
for name in manifest:
  key = name.rsplit("_", 1)[0]
  groups.setdefault(key, []).append(name)
mapping = {
  "tag_a": "src/lib/studio/studio-taglines-a.ts",
  "tag_b": "src/lib/studio/studio-taglines-b.ts",
  "ie": "src/components/editor/image/ImageEditor.tsx",
}
for key, files in groups.items():
  files = sorted(files, key=lambda n: int(n.rsplit("_",1)[1].split(".")[0]))
  b64 = "".join((root / f).read_text().strip() for f in files)
  raw = zlib.decompress(base64.b64decode(b64))
  pathlib.Path(mapping[key]).write_bytes(raw)
  print(mapping[key], len(raw))
print("OK")
