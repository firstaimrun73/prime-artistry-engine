#!/usr/bin/env python3
"""Surgical Image Studio fixes applied on checkout (no large blob restore)."""
from pathlib import Path
import re

# 1) Ultra AI max refs = 9
st = Path("src/lib/studio/studio-tier.ts")
stt = st.read_text()
if "return 9;" not in stt:
    stt2, n = re.subn(
        r'(case "premium":\s*\n\s*)return 10;',
        r'\1// Ultra AI product cap is 9 reference images\n      return 9;',
        stt,
        count=1,
    )
    if n != 1:
        raise SystemExit(f"studio-tier patch failed n={n}")
    st.write_text(stt2)
print("studio-tier OK")

# 2) Server assert in generate.functions.ts
gf = Path("src/lib/generate.functions.ts")
g = gf.read_text()
if "assertImageExperienceAccess" not in g:
    if 'from "@/lib/studio/image/image-experience-credits"' in g and "image-experience-access" not in g:
        g = g.replace(
            'import { computeImageExperienceCredits } from "@/lib/studio/image/image-experience-credits";',
            'import { computeImageExperienceCredits } from "@/lib/studio/image/image-experience-credits";\nimport { assertImageExperienceAccess } from "@/lib/studio/image/image-experience-access";\nimport { maxImagesForStudioTier } from "@/lib/studio/studio-tier";',
        )
    needle = 'const plan = (profile.plan || "free") as PlanId;\n    const credits = profile.credits ?? 0;'
    inject = (
        'const plan = (profile.plan || "free") as PlanId;\n'
        '    const credits = profile.credits ?? 0;\n\n'
        '    // Authoritative experience entitlement - never trust client-only tier selection\n'
        '    if (data.type === "image" && data.studioTier) {\n'
        '      assertImageExperienceAccess(plan, data.studioTier, isAdmin);\n'
        '      const multi = (data.imageUrls || []).filter(Boolean) as string[];\n'
        '      const expMax = maxImagesForStudioTier(data.studioTier);\n'
        '      if (multi.length > expMax && !isAdmin) {\n'
        '        throw new Error(\n'
        '          `This experience allows up to ${expMax} reference images (received ${multi.length}).`,\n'
        '        );\n'
        '      }\n'
        '    }'
    )
    if needle not in g:
        raise SystemExit("generate.functions plan needle missing")
    g = g.replace(needle, inject, 1)
    gf.write_text(g)
print("generate.functions assert OK")

# 3) ImageEditor gates
iep = Path("src/components/editor/image/ImageEditor.tsx")
ie = iep.read_text()
changed = False

if 'from "@/components/ui/avatar"' not in ie:
    ie = ie.replace(
        'import { StudioBackLink } from "@/components/StudioBackLink";',
        'import { StudioBackLink } from "@/components/StudioBackLink";\nimport { resolveAvatarSrc } from "@/lib/avatar-presets";\nimport { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";',
    )
    changed = True

if ie.count('canAccessImageExperience(profile?.plan, tier') < 1 or 'window.location.href = "/pricing"' not in ie:
    ie2, n = re.subn(
        r'onClick=\{\(\) => \{\s*setStudioTier\(tier\);\s*const preferred = studioTierToImageQuality\(tier\);',
        'onClick={() => {\n'
        '                                  if (!canAccessImageExperience(profile?.plan, tier, isAdmin)) {\n'
        '                                    setTierMenuOpen(false);\n'
        '                                    window.location.href = "/pricing";\n'
        '                                    return;\n'
        '                                  }\n'
        '                                  setStudioTier(tier);\n'
        '                                  const preferred = studioTierToImageQuality(tier);',
        ie,
        count=1,
    )
    if n == 1:
        ie = ie2
        changed = True
        print("tier onClick gated")
    else:
        print("WARN tier onClick not matched", n)

if "Upgrade</span>" not in ie and "{studioExperienceLabel(tier)}" in ie:
    ie = ie.replace(
        "{studioExperienceLabel(tier)}\n                              </button>",
        "{studioExperienceLabel(tier)}\n"
        "                                {!canAccessImageExperience(profile?.plan, tier, isAdmin) && (\n"
        "                                  <span className=\"ml-2 shrink-0 text-[11px] font-semibold text-[#FF5A1F]\">Upgrade</span>\n"
        "                                )}\n"
        "                              </button>",
        1,
    )
    changed = True
    print("Upgrade label added")

if "Upgrade to use this experience" not in ie:
    ie2, n = re.subn(
        r'const runGenerate = async \(\) => \{\n',
        'const runGenerate = async () => {\n'
        '    if (!isAdmin && !canAccessImageExperience(profile?.plan, studioTier, isAdmin)) {\n'
        '      toast.error("Upgrade to use this experience.");\n'
        '      window.location.href = "/pricing";\n'
        '      return;\n'
        '    }\n',
        ie,
        count=1,
    )
    if n == 1:
        ie = ie2
        changed = True
        print("runGenerate gated")

for a, b in [
    ('max-h-[min(28vh,240px)]', 'max-h-[min(18vh,160px)]'),
    ('max-h-[min(36vh,320px)]', 'max-h-[min(20vh,180px)]'),
    ('max-h-[min(42vh,420px)]', 'max-h-[min(22vh,200px)]'),
    ('max-h-[min(34vh,320px)]', 'max-h-[min(20vh,180px)]'),
    ('max-h-[min(48vh,480px)]', 'max-h-[min(28vh,260px)]'),
]:
    if a in ie:
        ie = ie.replace(a, b)
        changed = True

if changed:
    if ie.count('{') != ie.count('}'):
        raise SystemExit('ImageEditor brace mismatch')
    iep.write_text(ie)
    print('ImageEditor written', len(ie.encode()))
else:
    print('ImageEditor no textual changes')

assert 'if (isAdmin) return true;' in Path('src/lib/studio/image/image-experience-access.ts').read_text()
assert 'return 9;' in Path('src/lib/studio/studio-tier.ts').read_text()
assert 'assertImageExperienceAccess' in Path('src/lib/generate.functions.ts').read_text()
print('ALL OK')
