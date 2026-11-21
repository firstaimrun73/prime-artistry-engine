#!/usr/bin/env python3
from pathlib import Path
parts = sorted(Path('.').glob('.restore/maluto_plain_*.txt'))
assert len(parts) >= 10, f'need plain parts, got {len(parts)}: {[p.name for p in parts]}'
text = ''.join(p.read_text() for p in parts)
assert 'pickMalutoTagline' in text, 'missing tagline picker'
assert 'Upload Your Photo' in text, 'missing Upload CTA'
assert 'resolveAvatarSrc' in text, 'missing avatar'
assert 'auto 2MP' not in text, '2MP chrome leak'
assert len(text) > 15000, f'too short: {len(text)}'
Path('src/components/auto-edit/AutoEditPage.tsx').write_text(text)
print('OK', len(text))
