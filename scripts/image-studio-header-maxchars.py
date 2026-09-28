#!/usr/bin/env python3
from pathlib import Path

ie = Path("src/components/editor/image/ImageEditor.tsx")
t = ie.read_text()
assert len(t) > 20000

changed = []

# Header divider on the row containing StudioBackLink
old = '          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 animate-fade-in">'
new = '          <div className="mb-1 flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3 animate-fade-in">'
if old in t:
    t = t.replace(old, new, 1)
    changed.append("header divider")
elif "border-b border-border/40 pb-3" in t:
    print("header divider present")
else:
    print("WARN header pattern not found")

# maxChars from plan limits
if "maxPromptCharsForPlan" not in t:
    t = t.replace(
        "import { getPlanLimits, MULTI_IMAGE_UPGRADE_MESSAGE } from \"@/utils/planLimits\";",
        "import { getPlanLimits, maxPromptCharsForPlan, MULTI_IMAGE_UPGRADE_MESSAGE } from \"@/utils/planLimits\";",
    )
    changed.append("import maxPromptCharsForPlan")

old_mc = 'maxChars={studioTier === "premium" ? 10000 : studioTier === "pro" ? 4000 : 2000}'
new_mc = 'maxChars={isAdmin ? 7000 : maxPromptCharsForPlan(profile?.plan ?? "free")}'
if old_mc in t:
    t = t.replace(old_mc, new_mc, 1)
    changed.append("maxChars from plan")
elif "maxPromptCharsForPlan(profile" in t:
    print("maxChars already plan-based")
else:
    print("WARN maxChars pattern not found")

ie.write_text(t)
assert len(ie.read_text()) > 20000
print("CHANGED", changed)
print("OK")
