#!/usr/bin/env python3
from pathlib import Path
import base64
parts = sorted(Path(".github/scripts/music_fn_chunks").glob("chunk_*.b64"))
if not parts:
    raise SystemExit("no chunks")
data = base64.b64decode("".join(p.read_text().strip() for p in parts))
text = data.decode("utf-8")
if text.count("{") != text.count("}"):
    raise SystemExit("brace mismatch")
if "music_generation_jobs" not in text or "reservationTxId" not in text:
    raise SystemExit("missing markers")
Path("src/lib/music.functions.ts").write_text(text)
print("wrote", len(text))
