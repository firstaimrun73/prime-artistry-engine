#!/usr/bin/env python3
from pathlib import Path
p = Path('src/components/editor/image/ImageEditor.tsx')
text = p.read_text(encoding='utf-8')
if 'workspaceMode,' in text and 'generate({' in text:
    block = text.split('generate({')[1].split('});')[0]
    if 'workspaceMode' in block:
        print('workspaceMode already in generate payload')
        raise SystemExit(0)
needle = '          keepWatermark: isFreePlanForWm ? true : keepWatermark,\n        },\n      });'
insert = '          keepWatermark: isFreePlanForWm ? true : keepWatermark,\n          // Backend mode separation: Composer = raw prompt path; Auto = mode-aware orchestration.\n          workspaceMode,\n        },\n      });'
if needle not in text:
    raise SystemExit('needle not found in ImageEditor')
p.write_text(text.replace(needle, insert, 1), encoding='utf-8')
print('patched ImageEditor workspaceMode field')
