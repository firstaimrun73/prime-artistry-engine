#!/usr/bin/env python3
"""Restore ImageEditor from known-good commit and apply MOTIO2EDIT patches."""
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "src/components/editor/image/ImageEditor.tsx"

raw = subprocess.check_output(
    ["git", "show", "70c4f3b:src/components/editor/image/ImageEditor.tsx"],
    cwd=ROOT,
)
text = raw.decode()

# 1) Free Standard multi-ref: use planLimits (free maxImages is 5)
old_plan = (
    "const planMaxImages = isFree\n"
    "    ? 1\n"
    "    : getPlanLimits(profile?.plan ?? \"free\").maxImages;"
)
new_plan = 'const planMaxImages = getPlanLimits(profile?.plan ?? "free").maxImages;'
if old_plan not in text:
    raise SystemExit("planMaxImages block not found")
text = text.replace(old_plan, new_plan)

# 2) Remove free-only single-image client restriction
old_free = (
    "if (isFree && files.length > 1) {\n"
    "        toast.message(\"Free plan: only 1 image. Extra files were ignored.\");\n"
    "      }"
)
text = text.replace(old_free, "")

old_room = (
    "if (room <= 0) {\n"
    "        if (isFree) {\n"
    "          return toast.error(MULTI_IMAGE_UPGRADE_MESSAGE, {\n"
    "            action: { label: \"Upgrade\", onClick: () => { window.location.href = \"/pricing\"; } },\n"
    "          });\n"
    "        }\n"
    "        return toast.error(\n"
)
new_room = (
    "if (room <= 0) {\n"
    "        return toast.error(\n"
)
if old_room not in text:
    raise SystemExit("room<=0 free block not found")
text = text.replace(old_room, new_room)

# 3) Remove Try Something New block from Studio
text2, n = re.subn(
    r"\n\s*\{/\* Try Something New — mobile \+ desktop \*/\}.*?ImageStudioWeeklyCarousel\s*/>\s*</div>",
    "",
    text,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit("TSN removal failed n=%s" % n)
text = text2
text = "\n".join(ln for ln in text.splitlines() if "ImageStudioWeeklyCarousel" not in ln) + "\n"

# 4) Import for locked experiences
if "canAccessImageExperience" not in text:
    text = text.replace(
        'import { visibleImageExperiences } from "@/lib/studio/image/image-experience-access";',
        'import { visibleImageExperiences, canAccessImageExperience } from "@/lib/studio/image/image-experience-access";',
    )

TARGET.write_text(text)
assert "planMaxImages = getPlanLimits" in text
assert "ImageStudioWeeklyCarousel" not in text
assert len(text) > 40000
print("OK", len(text))
