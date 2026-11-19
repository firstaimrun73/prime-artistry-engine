#!/usr/bin/env python3
import base64, zlib, sys, re
from pathlib import Path
sys.path.insert(0, str(Path(".restore").resolve()))
from ie_fix_a import IE_FIX_A
from ie_fix_b import IE_FIX_B
from gen_fix_a import GEN_FIX_A
from gen_fix_b import GEN_FIX_B

def write(path, b64, checks):
    data = zlib.decompress(base64.b64decode(b64))
    text = data.decode()
    for c in checks:
        if c not in text:
            raise SystemExit(f"missing {c!r} in {path}")
    Path(path).write_bytes(data)
    print("OK", path, len(data))

write("src/components/editor/image/ImageEditor.tsx", IE_FIX_A + IE_FIX_B, [
    "canAccessImageExperience", "References", "Avatar", "showResultView", "generateMedia", "Motio2edit"
])
write("src/lib/generate.functions.ts", GEN_FIX_A + GEN_FIX_B, [
    "assertImageExperienceAccess", "Authoritative experience entitlement"
])

st = Path("src/lib/studio/studio-tier.ts")
stt = st.read_text()
if "return 9;" not in stt:
    stt2, n = re.subn(
        r"(case \"premium\":\s*\n\s*)return 10;",
        r"\1// Ultra AI — product cap is 9 reference images\n      return 9;",
        stt,
        count=1,
    )
    if n != 1:
        raise SystemExit(f"studio-tier patch failed n={n}")
    st.write_text(stt2)
print("studio-tier OK")
print("ALL OK")
