#!/usr/bin/env python3
"""Restore ImageEditor from known-good commit and apply MOTIO2EDIT patches."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "src/components/editor/image/ImageEditor.tsx"

raw = subprocess.check_output(
    ["git", "show", "70c4f3b:src/components/editor/image/ImageEditor.tsx"],
    cwd=ROOT,
)
text = raw.decode()

# 1 free multi-ref
text = text.replace(
"""  const planMaxImages = isFree
    ? 1
    : getPlanLimits(profile?.plan ?? \"free\").maxImages;""",
"""  const planMaxImages = getPlanLimits(profile?.plan ?? \"free\").maxImages;""",
)

# 2 remove free-only-1 toast block
old = """      if (room <= 0) {
        if (isFree) {
          return toast.error(MULTI_IMAGE_UPGRADE_MESSAGE, {
            action: { label: \"Upgrade\", onClick: () => { window.location.href = \"/pricing\"; } },
          });
        }
        return toast.error(
          maxAllowed <= 5
            ? (\"Standard supports up to \" + maxAllowed + \" images (base + references).\")
            : (\"This experience allows up to \" + maxAllowed + \" images at a time.\"),
        );
      }
      if (files.length > room) {
        toast.message(
          \"Only \" + room + \" more image\" + (room === 1 ? \"\" : \"s\") + \" can be added (max \" + maxAllowed + \").\",
        );
      }
      if (isFree && files.length > 1) {
        toast.message(\"Free plan: only 1 image. Extra files were ignored.\");
      }"""
new = """      if (room <= 0) {
        return toast.error(
          maxAllowed <= 5
            ? (\"Standard supports up to \" + maxAllowed + \" images (base + references).\")
            : (\"This experience allows up to \" + maxAllowed + \" images at a time.\"),
        );
      }
      if (files.length > room) {
        toast.message(
          \"Only \" + room + \" more image\" + (room === 1 ? \"\" : \"s\") + \" can be added (max \" + maxAllowed + \").\",
        );
      }"""
if old not in text:
    raise SystemExit(\"onFile block not found\")
text = text.replace(old, new)

# 3 remove TSN section
import re
text2, n = re.subn(
    r\"\\n\\s*\\{/* Try Something New — mobile \\+ desktop \\*/\\}.*?ImageStudioWeeklyCarousel\\s*/>\\s*</div>\",
    \"\",
    text,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit(f\"TSN removal failed n={n}\")
text = text2
# drop import lines for carousel
text = \"\\n\".join(ln for ln in text.splitlines() if \"ImageStudioWeeklyCarousel\" not in ln) + \"\\n\"

# 4 lock experiences + avatar - lighter patch: inject canAccess import
if \"canAccessImageExperience\" not in text:
    text = text.replace(
        'import { visibleImageExperiences } from \"@/lib/studio/image/image-experience-access\";',
        'import { visibleImageExperiences, canAccessImageExperience } from \"@/lib/studio/image/image-experience-access\";\\nimport { Avatar, AvatarFallback, AvatarImage } from \"@/components/ui/avatar\";\\nimport { resolveAvatarSrc } from \"@/lib/avatar-presets\";',
    )
    text = text.replace(
        'import { RotateCcw, Image as ImageIcon, ChevronDown, Mic, Sparkles, Upload as UploadIcon } from \"lucide-react\";',
        'import { RotateCcw, Image as ImageIcon, ChevronDown, Mic, Sparkles, Upload as UploadIcon, Lock } from \"lucide-react\";',
    )

TARGET.write_text(text)
assert \"planMaxImages = getPlanLimits\" in text
assert \"ImageStudioWeeklyCarousel\" not in text
assert len(text) > 40000
print(\"OK\", len(text))
