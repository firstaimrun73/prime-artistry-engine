#!/usr/bin/env python3
import base64, zlib
from pathlib import Path
parts = sorted(Path(".github/scripts/music_zlib_parts").glob("part_*.b64"))
raw = zlib.decompress(base64.b64decode("".join(p.read_text().strip() for p in parts)))
text = raw.decode("utf-8")
assert text.count("{") == text.count("}")
assert "music_generation_jobs" in text and "reservationTxId" in text
assert "p_user_id: userId, p_amount" not in text
out = Path("src/lib/music.functions.ts")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text)
print("wrote", len(text))
