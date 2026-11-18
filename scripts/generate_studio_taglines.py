#!/usr/bin/env python3
"""Generate studio-taglines modules on CI (220 entries)."""
from pathlib import Path

base = [
"Golden hour softens shadows and warms skin tones.",
"Wide aperture creates creamy background blur.",
"Rule of thirds places subjects on intersections.",
"Cool blue light signals evening cinematic mood.",
"Leading lines guide the eye to the subject.",
"Side lighting reveals texture flat light hides.",
"Complementary colours sit opposite on the wheel.",
"Negative space gives subjects room to breathe.",
"Shutter speed freezes motion or creates blur.",
"Warm highlights and cool shadows add depth.",
"Overcast skies act like a giant softbox.",
"Catchlights in the eyes bring portraits to life.",
"Diagonal composition feels more dynamic.",
"White balance sets emotional temperature.",
"Silhouettes need a clear subject outline.",
"Rim light separates subjects from dark backgrounds.",
"Short focal lengths exaggerate depth.",
"Hard light creates drama; soft light flatters.",
"Depth of field is a creative choice.",
"Cropping is composition after the shutter.",
"Backlighting creates glow on foliage edges.",
"Selective focus tells what matters.",
"Natural frames guide attention.",
"Blue hour follows sunset with soft colour.",
"S-curves lead the eye through the frame.",
"Colour isolation keeps one hue vivid.",
"Shadows can be subjects themselves.",
"Monochrome emphasises form and texture.",
"Tight crops increase intimacy.",
"AI amplifies intent — clear prompts win.",
"Reference images guide style, not replace direction.",
"Restoration recovers detail lost to time.",
"Product shots need clean edges and control.",
"Cinematic frames use motivated light.",
"Preserve skin texture in portrait retouch.",
"Match perspective when replacing backgrounds.",
"Composition arranges attention, not decoration.",
"Light is the primary subject of every photo.",
"Constraints spark creativity.",
"A strong single subject beats clutter.",
"Practice seeing light before buttons.",
"Gesture and posture speak before faces.",
"Window light is among the most flattering.",
"Eyes must stay sharp in portraits.",
"Local adjustments beat global ones.",
"sRGB is safest for web delivery.",
"Finish more work; perfectionism stalls growth.",
"Style emerges from repeated honest choices.",
"Light. Subject. Moment. Everything else is secondary.",
"Create with intention, edit with honesty.",
]
facts = []
i = 0
while len(facts) < 220:
    suffix = f" ({i // len(base) + 1})" if i >= len(base) else ""
    facts.append(base[i % len(base)] + suffix)
    i += 1

root = Path("src/lib/studio")
root.mkdir(parents=True, exist_ok=True)
half = len(facts) // 2

def emit(path, name, items):
    lines = [f"export const {name}: readonly string[] = ["]
    for f in items:
        lines.append(f"  {f!r},")
    lines.append("];\n")
    path.write_text("\n".join(lines))

emit(root / "studio-taglines-a.ts", "STUDIO_TAGLINES_A", facts[:half])
emit(root / "studio-taglines-b.ts", "STUDIO_TAGLINES_B", facts[half:])
(root / "studio-taglines.ts").write_text(
'''import { STUDIO_TAGLINES_A } from "./studio-taglines-a";
import { STUDIO_TAGLINES_B } from "./studio-taglines-b";

export const STUDIO_TAGLINES: readonly string[] = [...STUDIO_TAGLINES_A, ...STUDIO_TAGLINES_B];

const KEY = "motio2edit.studio.lastTaglineIdx";
export function pickStudioTagline(): string {
  const n = STUDIO_TAGLINES.length;
  if (!n) return "What will you create today?";
  let last = -1;
  try { const r = sessionStorage.getItem(KEY); if (r != null) last = Number(r); } catch {}
  let idx = Math.floor(Math.random() * n);
  if (n > 1 && idx === last) idx = (idx + 1) % n;
  try { sessionStorage.setItem(KEY, String(idx)); } catch {}
  return STUDIO_TAGLINES[idx]!;
}
'''
)
print("OK", len(facts), (root / "studio-taglines-a.ts").stat().st_size)
