#!/usr/bin/env python3
from pathlib import Path
p1 = Path(".restore/apply_ui_final_embedded_p1.py.txt").read_text()
p2 = Path(".restore/apply_ui_final_embedded_p2.py.txt").read_text()
Path(".restore/apply_ui_final_embedded.py").write_text(p1+p2)
print("assembled", len(p1)+len(p2))
