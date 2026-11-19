#!/usr/bin/env python3
from pathlib import Path
p1 = Path(__file__).with_name("apply_ui_taglines_ie_p1.py.txt").read_text()
p2 = Path(__file__).with_name("apply_ui_taglines_ie_p2.py.txt").read_text()
code = p1 + p2
ns = {}
exec(compile(code, "apply_ui_taglines_ie_full.py", "exec"), ns, ns)
