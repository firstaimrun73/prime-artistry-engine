#!/usr/bin/env python3
import base64, zlib, re
from pathlib import Path

def load(prefix, n):
    parts = []
    for i in range(n):
        p = Path(f".restore/{prefix}_c{i}.txt")
        if not p.exists():
            raise SystemExit(f"missing {p}")
        parts.append("".join(p.read_text().split()))
    return "".join(parts)

def write(path, b64, checks):
    data = zlib.decompress(base64.b64decode(b64))
    text = data.decode()
    for c in checks:
        if c not in text:
            raise SystemExit(f"missing {c!r} in {path}")
    Path(path).write_bytes(data)
    print("OK", path, len(data))

n_ie = int(Path(".restore/ie_n.txt").read_text().strip())
n_gen = int(Path(".restore/gen_n.txt").read_text().strip())
write("src/components/editor/image/ImageEditor.tsx", load("ie", n_ie), [
    "canAccessImageExperience", "References", "Avatar", "showResultView", "generateMedia", "Motio2edit"
])
write("src/lib/generate.functions.ts", load("gen", n_gen), [
    "assertImageExperienceAccess", "Authoritative experience entitlement"
])
st = Path("src/lib/studio/studio-tier.ts")
stt = st.read_text()
if "return 9;" not in stt:
    stt2, n = re.subn(
        r'(case "premium":\s*\n\s*)return 10;',
        r'\1// Ultra AI — product cap is 9 reference images\n      return 9;',
        stt,
        count=1,
    )
    if n != 1:
        raise SystemExit(f"studio-tier patch failed n={n}")
    st.write_text(stt2)
print("studio-tier OK")
print("ALL OK")
