#!/usr/bin/env python3
from pathlib import Path
import base64, zlib, sys
ROOT = Path(__file__).resolve().parent
names = [ln.strip() for ln in (ROOT/'MANIFEST').read_text().splitlines() if ln.strip()]
b64 = ''.join((ROOT/n).read_text().strip() for n in names)
raw = zlib.decompress(base64.b64decode(b64))
text = raw.decode('utf-8')
if 'export const generateMedia' not in text: sys.exit('missing export')
if 'runStep: runPremiumStep' not in text: sys.exit('missing Premium fix')
if 'PLACEHOLDER' in text: sys.exit('placeholder')
if text.count('{') != text.count('}'): sys.exit('brace mismatch')
out = Path('src/lib/generate.functions.ts')
out.write_bytes(raw)
print(f'Restored {out} ({len(raw)} bytes)')
