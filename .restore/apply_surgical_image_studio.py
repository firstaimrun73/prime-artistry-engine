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
            'import { computeImageExperienceCredits } from "@/lib/studio/image/image-experience-credits";\n'
            'import { assertImageExperienceAccess } from "@/lib/studio/image/image-experience-access";\n'
            'import { maxImagesForStudioTier } from "@/lib/studio/studio-tier";',
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

# 3) ImageEditor
iep = Path("src/components/editor/image/ImageEditor.tsx")
ie = iep.read_text()
changed = False

if 'from "@/components/ui/avatar"' not in ie:
    ie = ie.replace(
        'import { StudioBackLink } from "@/components/StudioBackLink";',
        'import { StudioBackLink } from "@/components/StudioBackLink";\n'
        'import { resolveAvatarSrc } from "@/lib/avatar-presets";\n'
        'import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";',
    )
    changed = True

if "const avatarSrc = resolveAvatarSrc" not in ie:
    needle = '  const isFreePlanForWm = (profile?.plan ?? "free") === "free";'
    if needle in ie:
        ie = ie.replace(
            needle,
            needle
            + "\n  const avatarSrc = resolveAvatarSrc(profile?.avatar_url, profile?.avatar_signed_url, {\n"
            + "    userId: profile?.id,\n"
            + "    nameOrEmail: profile?.display_name || profile?.email,\n"
            + "  });\n"
            + '  const avatarInitial = (profile?.display_name || profile?.email || "U").trim().charAt(0).toUpperCase() || "U";',
            1,
        )
        changed = True

if "window.location.href = \"/pricing\"" not in ie or ie.count("canAccessImageExperience(profile?.plan, tier") < 1:
    ie2, n = re.subn(
        r"onClick=\{\(\) => \{\s*setStudioTier\(tier\);\s*const preferred = studioTierToImageQuality\(tier\);",
        "onClick={() => {\n"
        "                                  if (!canAccessImageExperience(profile?.plan, tier, isAdmin)) {\n"
        "                                    setTierMenuOpen(false);\n"
        '                                    window.location.href = "/pricing";\n'
        "                                    return;\n"
        "                                  }\n"
        "                                  setStudioTier(tier);\n"
        "                                  const preferred = studioTierToImageQuality(tier);",
        ie,
        count=1,
    )
    if n == 1:
        ie = ie2
        changed = True
        print("tier onClick gated")

if "Upgrade</span>" not in ie and "{studioExperienceLabel(tier)}" in ie:
    ie = ie.replace(
        "{studioExperienceLabel(tier)}\n                              </button>",
        "{studioExperienceLabel(tier)}\n"
        "                                {!canAccessImageExperience(profile?.plan, tier, isAdmin) && (\n"
        '                                  <span className="ml-2 shrink-0 text-[11px] font-semibold text-[#FF5A1F]">Upgrade</span>\n'
        "                                )}\n"
        "                              </button>",
        1,
    )
    changed = True
    print("Upgrade label added")

if "Upgrade to use this experience" not in ie:
    ie2, n = re.subn(
        r"const runGenerate = async \(\) => \{\n",
        "const runGenerate = async () => {\n"
        "    if (!isAdmin && !canAccessImageExperience(profile?.plan, studioTier, isAdmin)) {\n"
        '      toast.error("Upgrade to use this experience.");\n'
        '      window.location.href = "/pricing";\n'
        "      return;\n"
        "    }\n",
        ie,
        count=1,
    )
    if n == 1:
        ie = ie2
        changed = True
        print("runGenerate gated")

if 'aria-label="Open dashboard"' not in ie:
    old = (
        "            {!isAdmin && (\n"
        '              <span className="shrink-0 rounded-full border border-border/50 bg-card/50 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground backdrop-blur-sm">\n'
        "                {profile.credits} credits\n"
        "              </span>\n"
        "            )}\n"
        "          </header>"
    )
    new = (
        '            <div className="flex shrink-0 items-center gap-2">\n'
        "              {!isAdmin && (\n"
        '                <span className="rounded-full border border-border/50 bg-card/50 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground backdrop-blur-sm">\n'
        "                  {profile?.credits ?? 0} credits\n"
        "                </span>\n"
        "              )}\n"
        "              <button\n"
        '                type="button"\n'
        '                onClick={() => { window.location.href = "/dashboard"; }}\n'
        '                className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/50"\n'
        '                aria-label="Open dashboard"\n'
        "              >\n"
        '                <Avatar className="h-8 w-8 border border-border/60 sm:h-9 sm:w-9">\n'
        '                  <AvatarImage src={avatarSrc} alt="" />\n'
        '                  <AvatarFallback className="bg-[#FF5A1F]/15 text-xs font-semibold text-[#FF5A1F]">\n'
        "                    {avatarInitial}\n"
        "                  </AvatarFallback>\n"
        "                </Avatar>\n"
        "              </button>\n"
        "            </div>\n"
        "          </header>"
    )
    if old in ie:
        ie = ie.replace(old, new, 1)
        changed = True
        print("avatar header added")

for a, b in [
    ("max-h-[min(28vh,240px)]", "max-h-[min(12vh,110px)]"),
    ("max-h-[min(36vh,320px)]", "max-h-[min(14vh,120px)]"),
    ("max-h-[min(42vh,420px)]", "max-h-[min(14vh,130px)]"),
    ("max-h-[min(34vh,320px)]", "max-h-[min(14vh,120px)]"),
    ("max-h-[min(48vh,480px)]", "max-h-[min(16vh,140px)]"),
    ("max-h-[min(18vh,160px)]", "max-h-[min(12vh,110px)]"),
    ("max-h-[min(20vh,180px)]", "max-h-[min(14vh,120px)]"),
    ("max-h-[min(22vh,200px)]", "max-h-[min(14vh,130px)]"),
    ("max-h-[min(28vh,260px)]", "max-h-[min(16vh,140px)]"),
]:
    if a in ie:
        ie = ie.replace(a, b)
        changed = True

ie = ie.replace(
    '{/* DISPLAY */}\n            <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/40 shadow-sm backdrop-blur-xl">',
    '{/* REFERENCES — compact strip (no large empty display) */}\n            <section className="flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/40 shadow-sm backdrop-blur-xl lg:min-h-0 lg:flex-1">',
)
ie = ie.replace(
    'className="flex min-h-0 flex-1 items-center justify-center p-2 sm:p-3"',
    'className="flex shrink-0 items-center justify-center p-1.5 sm:p-2"',
)
ie = ie.replace(
    "Upload references from the Display strip. Charge updates with experience and quality.",
    "Add up to the experience limit as references. Charge updates with experience and quality.",
)

if ie.count("{") != ie.count("}"):
    raise SystemExit("ImageEditor brace mismatch")
iep.write_text(ie)
print("ImageEditor written", len(ie.encode()))

assert "if (isAdmin) return true;" in Path("src/lib/studio/image/image-experience-access.ts").read_text()
assert "return 9;" in Path("src/lib/studio/studio-tier.ts").read_text()
assert "assertImageExperienceAccess" in Path("src/lib/generate.functions.ts").read_text()
print("ALL OK")
