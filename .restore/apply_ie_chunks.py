#!/usr/bin/env python3
import base64, zlib, itertools, random, re
from pathlib import Path
ROOT = Path(".")
chunks = sorted(ROOT.glob(".restore/ie_fix_chunk_*.txt"), key=lambda p: int(p.stem.split("_")[-1]))
b64 = "".join(p.read_text().strip() for p in chunks)
data = zlib.decompress(base64.b64decode(b64))
path = ROOT / "src/components/editor/image/ImageEditor.tsx"
path.write_bytes(data)
text = data.decode()
assert "InspirationTagline" in text and 'alt="Selected"' not in text and "promptFocused" in text
print("IE", len(data))

random.seed(42)
bases = {"c": ["Turn your imagination into reality", "Every image begins with an idea", "Create something extraordinary today", "Your imagination has no limits", "Make your vision visible", "Transform ordinary into extraordinary", "Bring your creative ideas to life", "Imagine it. Describe it. Create it", "Your next masterpiece starts here", "Let creativity take the lead"]}
verbs = ["Create", "Build", "Craft", "Shape", "Forge", "Design", "Invent", "Compose", "Render", "Generate", "Reveal", "Unlock", "Spark", "Ignite", "Launch"]
nouns = ["vision", "idea", "scene", "world", "portrait", "story", "moment", "mood", "style", "frame", "concept", "dream", "look", "atmosphere", "character"]
adj = ["bold", "quiet", "cinematic", "vivid", "subtle", "epic", "intimate", "surreal", "precise", "playful", "dramatic", "soft", "sharp", "warm", "cool"]
endings = ["today", "now", "in one prompt", "with a single description", "from pure imagination", "before the day ends", "while inspiration is fresh", "without leaving this page", "and share it instantly", "as only you would"]
lines=set(bases["c"])
for v,n,a,e in itertools.product(verbs,nouns,adj,endings):
    if len(lines)>=2300: break
    lines.add(f"{v} a {a} {n} {e}")
for v,n in itertools.product(verbs,nouns):
    lines.add(f"{v} the {n} you have been holding")
    lines.add(f"Your {n} deserves a {random.choice(adj)} frame")
clean=[]; seen=set()
for s in sorted(lines):
    s=" ".join(s.split()).strip(" .")
    if not s or len(s)<12 or len(s)>90: continue
    k=s.lower()
    if k in seen: continue
    seen.add(k); clean.append(s+".")
    if len(clean)>=2000: break
assert len(clean)==2000
A,B=clean[:1000],clean[1000:]
def fmt(arr,name):
    body=",\n".join(f'  "{x}"' for x in arr)
    return f"export const {name}: readonly string[] = [\n{body},\n];\n"
(ROOT/"src/lib/studio/studio-taglines-a.ts").write_text(fmt(A,"STUDIO_TAGLINES_A"))
(ROOT/"src/lib/studio/studio-taglines-b.ts").write_text(fmt(B,"STUDIO_TAGLINES_B"))
print("TAGLINES", len(clean), "VERIFY_OK")
