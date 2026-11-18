#!/usr/bin/env python3
import base64,zlib,json
from pathlib import Path
m=json.loads(Path(".restore/ie_motio.manifest.json").read_text())
parts=[]
for i in range(m["parts"]):
    p=Path(f".restore/{m['prefix']}{i}.b64")
    parts.append("".join(p.read_text().split()))
data=zlib.decompress(base64.b64decode("".join(parts)))
Path(m["path"]).write_bytes(data)
text=data.decode()
assert "runGenerate" in text and "canAccessImageExperience" in text and "VoiceInputButton" in text
assert "PLACEHOLDER" not in text
print("OK",len(data))
