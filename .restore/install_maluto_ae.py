#!/usr/bin/env python3
from pathlib import Path
parts = sorted(Path('.').glob('.restore/maluto_plain_*.txt'))
assert len(parts) >= 4, f'need plain parts, got {len(parts)}'
text = ''.join(p.read_text() for p in parts)
assert 'pickMalutoTagline' in text
assert 'Upload Your Photo' in text
assert 'resolveAvatarSrc' in text
assert 'auto 2MP' not in text
assert len(text) > 15000
Path('src/components/auto-edit/AutoEditPage.tsx').write_text(text)
print('OK', len(text))
