#!/usr/bin/env python3
"""Second pass: plan-based prompt limits, Standard 5-cap (no page crash), Master unlimited UI."""
from pathlib import Path
import re

changed = []

def read(p, n=100):
    path = Path(p)
    t = path.read_text()
    assert len(t) >= n, f"{p} too small {len(t)}"
    return path, t

gen_path, gen0 = read("src/lib/generate.functions.ts", 20000)
gen_before = len(gen0)
assert "executeUltraImage" in gen0 and "Fail closed" in gen0

ie_path, ie = read("src/components/editor/image/ImageEditor.tsx", 20000)

old_mc = 'maxChars={isAdmin ? 7000 : maxPromptCharsForPlan(profile?.plan ?? "free")}'
new_mc = 'maxChars={maxPromptCharsForPlan(profile?.plan ?? "free", isAdmin)}'
if old_mc in ie:
    ie = ie.replace(old_mc, new_mc, 1)
    changed.append("maxChars plan-based")
elif 'maxPromptCharsForPlan(profile?.plan ?? "free", isAdmin)' in ie:
    print("maxChars already ok")
else:
    ie2, n = re.subn(
        r"maxChars=\{[^}]+\}",
        'maxChars={maxPromptCharsForPlan(profile?.plan ?? "free", isAdmin)}',
        ie,
        count=1,
    )
    if n:
        ie = ie2
        changed.append("maxChars regex")

old_eff = (
    "  const effectiveMaxImages = isAdmin\n"
    "    ? Math.max(experienceMax, 10)\n"
    "    : isFree\n"
    "      ? 1\n"
    '      : Math.min(getPlanLimits(profile?.plan ?? "free").maxImages, experienceMax);'
)
new_eff = (
    "  // Experience ceiling is hard (Standard multi = 5 total). Admin may bypass plan locks\n"
    "  // but must never exceed the experience/provider contract — that caused page crashes.\n"
    "  const planMaxImages = isFree\n"
    "    ? 1\n"
    '    : getPlanLimits(profile?.plan ?? "free").maxImages;\n'
    "  const effectiveMaxImages = Math.min(\n"
    "    isAdmin ? Math.max(planMaxImages, experienceMax) : planMaxImages,\n"
    "    experienceMax,\n"
    "  );"
)
if old_eff in ie:
    ie = ie.replace(old_eff, new_eff, 1)
    changed.append("effectiveMaxImages hard-cap")
elif "Experience ceiling is hard" in ie:
    print("effectiveMaxImages already hardened")
else:
    print("WARN effectiveMaxImages pattern mismatch")
    idx = ie.find("effectiveMaxImages")
    print(repr(ie[idx:idx+220]))

old_on = (
    "  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {\n"
    "    const files = Array.from(e.target.files ?? []);\n"
    "    if (files.length === 0) return;\n"
    '    e.target.value = "";\n'
    "\n"
    "    const maxAllowed = effectiveMaxImages;\n"
    "    const room = Math.min(MAX_GALLERY_IMAGES, maxAllowed) - gallery.length;\n"
    "    if (room <= 0) {\n"
    "      if (isFree) {\n"
    "        return toast.error(MULTI_IMAGE_UPGRADE_MESSAGE, {\n"
    '          action: { label: "Upgrade", onClick: () => { window.location.href = "/pricing"; } },\n'
    "        });\n"
    "      }\n"
    "      return toast.error(`This experience allows up to ${maxAllowed} images at a time.`);\n"
    "    }"
)
new_on = (
    "  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {\n"
    "    // onFile safe wrapper — never let selection errors reach the route error boundary\n"
    "    try {\n"
    "    const files = Array.from(e.target.files ?? []);\n"
    "    if (files.length === 0) return;\n"
    '    e.target.value = "";\n'
    "\n"
    "    const maxAllowed = Math.max(1, effectiveMaxImages);\n"
    "    const room = Math.min(MAX_GALLERY_IMAGES, maxAllowed) - gallery.length;\n"
    "    if (room <= 0) {\n"
    "      if (isFree) {\n"
    "        return toast.error(MULTI_IMAGE_UPGRADE_MESSAGE, {\n"
    '          action: { label: "Upgrade", onClick: () => { window.location.href = "/pricing"; } },\n'
    "        });\n"
    "      }\n"
    "      return toast.error(\n"
    "        maxAllowed <= 5\n"
    "          ? `Standard supports up to ${maxAllowed} images (base + references).`\n"
    "          : `This experience allows up to ${maxAllowed} images at a time.`,\n"
    "      );\n"
    "    }\n"
    "    if (files.length > room) {\n"
    '      toast.message(`Only ${room} more image${room === 1 ? "" : "s"} can be added (max ${maxAllowed}).`);\n'
    "    }"
)
if old_on in ie:
    ie = ie.replace(old_on, new_on, 1)
    start = ie.find("const onFile = async")
    nxt = ie.find("\n  const ", start + 80)
    if nxt > start and "onFile safe wrapper" in ie[start:nxt]:
        ie = (
            ie[:nxt]
            + "\n    } catch (err) {\n"
            + "      console.error(err);\n"
            + '      toast.error("Could not add images. Try fewer or smaller files.");\n'
            + "    }\n"
            + ie[nxt:]
        )
        changed.append("onFile try/catch")
else:
    print("WARN onFile pattern not matched")

ie_path.write_text(ie)
assert len(ie_path.read_text()) > 20000
assert "isAdmin ? 7000" not in ie_path.read_text()

pl_path, pl = read("src/utils/planLimits.ts", 200)
if "isPromptEffectivelyUnlimited" not in pl:
    old_fn = (
        "export function maxPromptCharsForPlan(plan: string | undefined | null, isAdmin = false): number {\n"
        "  if (isAdmin) return 7000;\n"
        '  return getPlanLimits(plan ?? "free").maxPromptChars;\n'
        "}"
    )
    new_fn = (
        "/** UI + client clamp. Uses effective plan — admin does not force 7000. */\n"
        "export function maxPromptCharsForPlan(plan: string | undefined | null, _isAdmin = false): number {\n"
        "  void _isAdmin;\n"
        '  return getPlanLimits(plan ?? "free").maxPromptChars;\n'
        "}\n"
        "\n"
        "/** True when UI should hide a numeric character limit (Master Studio). */\n"
        "export function isPromptEffectivelyUnlimited(plan: string | undefined | null): boolean {\n"
        '  return getPlanLimits(plan ?? "free").maxPromptChars >= 7000;\n'
        "}"
    )
    if old_fn in pl:
        pl = pl.replace(old_fn, new_fn, 1)
        changed.append("maxPromptCharsForPlan")
    else:
        m = re.search(r"export function maxPromptCharsForPlan[\s\S]*?\n\}", pl)
        if m:
            pl = pl[: m.start()] + new_fn + pl[m.end() :]
            changed.append("maxPromptCharsForPlan regex")
        else:
            print("WARN maxPromptCharsForPlan not found")
    pl_path.write_text(pl)
else:
    print("isPromptEffectivelyUnlimited present")

epp_path, epp = read("src/components/editor/EditorPromptPanel.tsx", 2000)
old_counter = '<span className="shrink-0 tabular-nums">{prompt.length}/{limit}</span>'
new_counter = '''<span className="shrink-0 tabular-nums text-muted-foreground">
              {limit >= 7000 ? (
                <span title="No practical limit in the Studio UI">{prompt.length.toLocaleString()} · Unlimited</span>
              ) : (
                <>{prompt.length}/{limit}</>
              )}
            </span>'''
if old_counter in epp:
    epp = epp.replace(old_counter, new_counter, 1)
    epp_path.write_text(epp)
    changed.append("Master unlimited counter")
else:
    print("WARN counter not found")

gen = gen0
if "Plan prompt character ceiling" not in gen:
    aidx = gen.find("Experience image-count ceilings")
    if aidx < 0:
        aidx = gen.find("Multiple reference images require a paid plan")
    insert_pos = None
    if aidx >= 0:
        m = re.search(
            r"supports up to 10 images total \(base \+ references\)\.[\s\S]{0,120}?\}",
            gen[aidx:],
        )
        if m:
            insert_pos = aidx + m.end()
        else:
            m2 = re.search(
                r"Upgrade to unlock multi-image generation\.[\s\S]{0,200}?\}\s*\}",
                gen[aidx:],
            )
            if m2:
                insert_pos = aidx + m2.end()
    prompt_block = '''
      // Plan prompt character ceiling (server authoritative).
      {
        const planId = (profile.plan ?? "free") as string;
        const promptLen = typeof data.prompt === "string" ? data.prompt.length : 0;
        const planCeil =
          planId === "business"
            ? 7000
            : planId === "pro" || planId === "studio"
              ? 6000
              : planId === "plus"
                ? 4000
                : 2000;
        const ceil = isAdmin ? Math.max(planCeil, 7000) : planCeil;
        if (promptLen > ceil) {
          throw new Error(
            planId === "business" || isAdmin
              ? "Prompt exceeds the safe maximum length."
              : `Prompt is too long for your plan (max ${planCeil} characters).`,
          );
        }
      }
'''
    if insert_pos is not None:
        gen = gen[:insert_pos] + prompt_block + gen[insert_pos:]
        assert len(gen) > gen_before
        assert len(gen) < gen_before + 3000
        gen_path.write_text(gen)
        changed.append("server prompt ceiling")
    else:
        print("WARN prompt ceiling insert failed")
else:
    print("prompt ceiling present")

plans_path, plans = read("src/lib/plans.ts", 2000)
if "Prompt: 2,000 characters" not in plans:
    plans = plans.replace(
        '"350 credits / month",\n      "≈ 14 image edits or ≈ 2–3 videos",\n',
        '"350 credits / month",\n      "Standard Image Studio",\n      "Up to 5 reference images",\n      "Prompt: 2,000 characters",\n      "≈ 14 image edits or ≈ 2–3 videos",\n',
        1,
    )
    plans = plans.replace(
        '"750 monthly credits",\n      "HD AI image generation",\n',
        '"750 monthly credits",\n      "Standard Image Studio",\n      "Up to 10 reference images",\n      "Prompt: 4,000 characters",\n      "HD AI image generation",\n',
        1,
    )
    plans = plans.replace(
        '"2,500 credits / month",\n      "≈ 100 images or ≈ 20 videos",\n',
        '"2,500 credits / month",\n      "Standard + Premium Image Studio",\n      "Up to 10 Premium references",\n      "Prompt: 6,000 characters",\n      "≈ 100 images or ≈ 20 videos",\n',
        1,
    )
    plans = plans.replace(
        '"5,000 credits / month",\n      "≈ 200 images or ≈ 40 videos",\n',
        '"5,000 credits / month",\n      "Standard + Premium + Ultra AI",\n      "Prompt: 6,000 characters",\n      "Ultra features partially restricted",\n      "≈ 200 images or ≈ 40 videos",\n',
        1,
    )
    plans = plans.replace(
        '"10,000 monthly credits",\n      "Advanced Image, Video and Music studios",\n',
        '"10,000 monthly credits",\n      "Standard + Premium + Ultra AI",\n      "Prompt: Unlimited*",\n      "IMAX, 8K Max, Custom aspects",\n      "Advanced Image, Video and Music studios",\n',
        1,
    )
    plans_path.write_text(plans)
    changed.append("plans feature bullets")
else:
    print("plans already have Prompt lines")

gen2 = Path("src/lib/generate.functions.ts").read_text()
assert len(gen2) >= gen_before
assert "executeUltraImage" in gen2 and "Fail closed" in gen2
ie2 = Path("src/components/editor/image/ImageEditor.tsx").read_text()
assert len(ie2) > 20000
assert "isAdmin ? 7000" not in ie2

print("CHANGED:", changed)
print("generate.functions", gen_before, "->", len(gen2))
print("OK")
