#!/usr/bin/env python3
import base64, zlib, json
from pathlib import Path
root = Path('.')
man = json.loads((root / '.restore/restore_manifest.json').read_text())
n = man['chunks']
b64 = ''.join((root / f'.restore/restore_chunk_{i}.b64').read_text().strip() for i in range(n))
blob = zlib.decompress(base64.b64decode(b64))
for e in man['manifest']:
  data = blob[e['start']:e['end']]
  assert len(data) == e['size'], (e['path'], len(data), e['size'])
  p = root / e['path']
  p.parent.mkdir(parents=True, exist_ok=True)
  p.write_bytes(data)
  print('wrote', e['path'], e['size'])
ie = (root / 'src/components/editor/image/ImageEditor.tsx').read_text()
assert 'InspirationTagline' in ie
assert 'PLACEHOLDER' not in ie
assert 'gallery.length === 0' in ie
gf = (root / 'src/lib/generate.functions.ts').read_text()
assert 'FAL_API_KEY' in gf and 'PLACEHOLDER' not in gf
assert 'not configured on the server' in gf or 'FAL API key is not configured' in gf
a = (root / 'src/lib/studio/studio-taglines-a.ts').read_text()
assert 'Create the world of your own thoughts' in a
print('VERIFY_OK')
