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

# ---------------------------------------------------------------------------
# SAFETY
# ---------------------------------------------------------------------------
gen_path, gen0 = read("src/lib/generate.functions.ts", 20000)
gen_before = len(gen0)
assert "executeUltraImage" in gen0 and "Fail closed" in gen0

# ---------------------------------------------------------------------------
# 1) ImageEditor — effectiveMaxImages + maxChars + hardened onFile
# ---------------------------------------------------------------------------
ie_path, ie = read("src/components/editor/image/ImageEditor.tsx", 20000)

# Fix: admin must NOT force 7000 chars; use plan always
old_mc = 'maxChars={isAdmin ? 7000 : maxPromptCharsForPlan(profile?.plan ?? "free")}'
new_mc = 'maxChars={maxPromptCharsForPlan(profile?.plan ?? "free", isAdmin)}'
if old_mc in ie:
    ie = ie.replace(old_mc, new_mc, 1)
    changed.append("maxChars plan-based (no admin 7000)")
elif "maxPromptCharsForPlan(profile?.plan ?? \"free\", isAdmin)" in ie:
    print("maxChars already plan+admin aware")
else:
    # try without isAdmin second arg yet
    if "maxPromptCharsForPlan(profile?.plan" in ie:
        ie = re.sub(
            r"maxChars=\{[^}]+\}",
            'maxChars={maxPromptCharsForPlan(profile?.plan ?? "free", isAdmin)}',
            ie,
            count=1,
        )
        changed.append("maxChars replaced via regex")

# Fix: effectiveMaxImages — never exceed experience max (Standard = 5 hard)
old_eff = '''  const effectiveMaxImages = isAdmin
    ? Math.max(experienceMax, 10)
    : isFree
      ? 1
      : Math.min(getPlanLimits(profile?.plan ?? "free").maxImages, experienceMax);'''
new_eff = '''  // Experience ceiling is hard (Standard multi = 5 total). Admin may bypass plan locks
  // but must never exceed the experience/provider contract — that caused page crashes.
  const planMaxImages = isFree
    ? 1
    : getPlanLimits(profile?.plan ?? "free").maxImages;
  const effectiveMaxImages = Math.min(
    isAdmin ? Math.max(planMaxImages, experienceMax) : planMaxImages,
    experienceMax,
  );'''
if old_eff in ie:
    ie = ie.replace(old_eff, new_eff, 1)
    changed.append("effectiveMaxImages experience-hard-cap")
elif "Experience ceiling is hard" in ie:
    print("effectiveMaxImages already hardened")
else:
    print("WARN effectiveMaxImages pattern mismatch")

# Harden onFile with outer try/catch if missing
if "const onFile = async" in ie and "onFile safe wrapper" not in ie:
    # Wrap body start after files check
    old_on = '''  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = "";

    const maxAllowed = effectiveMaxImages;
    const room = Math.min(MAX_GALLERY_IMAGES, maxAllowed) - gallery.length;
    if (room <= 0) {
      if (isFree) {
        return toast.error(MULTI_IMAGE_UPGRADE_MESSAGE, {
          action: { label: "Upgrade", onClick: () => { window.location.href = "/pricing"; } },
        });
      }
      return toast.error(`This experience allows up to ${maxAllowed} images at a time.`);
    }'''
    new_on = '''  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // onFile safe wrapper — never let selection errors reach the route error boundary
    try {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = "";

    const maxAllowed = Math.max(1, effectiveMaxImages);
    const room = Math.min(MAX_GALLERY_IMAGES, maxAllowed) - gallery.length;
    if (room <= 0) {
      if (isFree) {
        return toast.error(MULTI_IMAGE_UPGRADE_MESSAGE, {
          action: { label: "Upgrade", onClick: () => { window.location.href = "/pricing"; } },
        });
      }
      return toast.error(
        maxAllowed <= 5
          ? `Standard supports up to ${maxAllowed} images (base + references).`
          : `This experience allows up to ${maxAllowed} images at a time.`,
      );
    }
    if (files.length > room) {
      toast.message(`Only ${room} more image${room === 1 ? "" : "s"} can be added (max ${maxAllowed}).`);
    }'''
    if old_on in ie:
        ie = ie.replace(old_on, new_on, 1)
        # Close try at end of onFile — find the function end is hard; add catch before last closing of onFile
        # Locate onFile and the next top-level const after it
        start = ie.find("const onFile = async")
        # Find next "\n  const " after start+50 that is a sibling
        nxt = ie.find("\n  const ", start + 80)
        if nxt > start and "onFile safe wrapper" in ie[start:nxt]:
            # Insert catch before nxt
            ie = ie[:nxt] + "\n    } catch (err) {\n      console.error(err);\n      toast.error(\"Could not add images. Try fewer or smaller files.\");\n    }\n" + ie[nxt:]
            changed.append("onFile try/catch + extra-file toast")
    else:
        print("WARN onFile pattern not matched for wrapper")

# Ensure gallery trim effect still present
if "Keep gallery within the active experience" not in ie:
    print("WARN gallery trim missing")

ie_path.write_text(ie)
assert len(ie_path.read_text()) > 20000

# ---------------------------------------------------------------------------
# 2) planLimits — maxPromptCharsForPlan Master UI flag
# ---------------------------------------------------------------------------
pl_path, pl = read("src/utils/planLimits.ts", 200)
# Update maxPromptCharsForPlan to accept isAdmin but still use plan (admin does not force 7000)
if "export function maxPromptCharsForPlan" in pl:
    old_fn = '''export function maxPromptCharsForPlan(plan: string | undefined | null, isAdmin = false): number {
  if (isAdmin) return 7000;
  return getPlanLimits(plan ?? "free").maxPromptChars;
}'''
    new_fn = '''/** UI + client clamp. Master (business) returns a high ceiling; UI may hide the counter. */
export function maxPromptCharsForPlan(plan: string | undefined | null, _isAdmin = false): number {
  void _isAdmin; // admin does not override the effective plan's prompt allowance in the UI
  return getPlanLimits(plan ?? "free").maxPromptChars;
}

/** True when the UI should hide a numeric character limit (Master Studio). */
export function isPromptEffectivelyUnlimited(plan: string | undefined | null): boolean {
  return getPlanLimits(plan ?? "free").maxPromptChars >= 7000;
}'''
    if old_fn in pl:
        pl = pl.replace(old_fn, new_fn, 1)
        changed.append("maxPromptCharsForPlan no admin override")
    elif "isPromptEffectivelyUnlimited" not in pl:
        # append helper after existing function
        pl = pl.replace(
            "export function maxPromptCharsForPlan(plan: string | undefined | null, isAdmin = false): number {
  if (isAdmin) return 7000;
  return getPlanLimits(plan ?? \"free\").maxPromptChars;
}",
            new_fn,
        )
        if "isPromptEffectivelyUnlimited" not in pl:
            # try looser
            m = re.search(r"export function maxPromptCharsForPlan[\s\S]*?\n\}", pl)
            if m:
                pl = pl[: m.start()] + new_fn + pl[m.end() :]
                changed.append("maxPromptCharsForPlan replaced")
            else:
                print("WARN could not patch maxPromptCharsForPlan")
    else:
        print("isPromptEffectivelyUnlimited present")
pl_path.write_text(pl)

# ---------------------------------------------------------------------------
# 3) EditorPromptPanel — Master shows Unlimited, not n/7000
# ---------------------------------------------------------------------------
epp_path, epp = read("src/components/editor/EditorPromptPanel.tsx", 2000)

# Add optional hideLimit / unlimited UI
if "promptEffectivelyUnlimited" not in epp and "isPromptEffectivelyUnlimited" not in epp:
    # Soften counter: if maxChars >= 7000, show count only or Unlimited
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
        changed.append("Master unlimited counter")
    else:
        print("WARN counter pattern not found")

# When Master: don't hard-slice aggressively in a way that shows limit errors — still slice at limit for safety
epp_path.write_text(epp)

# ---------------------------------------------------------------------------
# 4) generate.functions.ts — surgical prompt length by plan
# ---------------------------------------------------------------------------
gen = gen0
if "Plan prompt character ceiling" not in gen:
    # Insert after free multi-ref / image-count block — after experience ceilings if present
    anchor = "Experience image-count ceilings"
    aidx = gen.find(anchor)
    if aidx < 0:
        anchor = "Multiple reference images require a paid plan"
        aidx = gen.find(anchor)
    if aidx >= 0:
        # Find end of that block (next blank line after a reasonable span)
        # Insert prompt ceiling after image-count block closing
        # Search for the image-count block end
        block = gen[aidx : aidx + 1200]
        # Find last closing of the inserted ceilings object
        # Simpler: after "supports up to 10 images total"
        m = re.search(
            r"supports up to 10 images total \(base \+ references\)\."[\s\S]{0,120}?\}",
            gen[aidx:],
        )
        insert_pos = None
        if m:
            insert_pos = aidx + m.end()
        else:
            # after free multi closing
            m2 = re.search(
                r"Upgrade to unlock multi-image generation\."[\s\S]{0,200}?\}\s*\}",
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
          planId === "business" || isAdmin
            ? 7000
            : planId === "pro" || planId === "studio"
              ? 6000
              : planId === "plus"
                ? 4000
                : 2000;
        if (promptLen > planCeil) {
          // Master/admin: clamp rather than reject with a noisy error when slightly over.
          if (planId === "business" || isAdmin) {
            data = { ...data, prompt: String(data.prompt).slice(0, 7000) };
          } else {
            throw new Error(
              `Prompt is too long for your plan (max ${planCeil} characters).`,
            );
          }
        }
      }
'''
        if insert_pos is not None:
            # data may be const — check
            if "const data =" in gen or "data = input" in gen:
                # If data is const from zod parse, reassignment fails — use slice only via mutable path
                # Safer: throw for all including business with soft message for non-business only;
                # for business clamp by throwing a special path — actually zod already max 10000
                # Just throw for non-master; for master/admin allow up to 7000 via throw if >7000
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
        // Admin retains a high ceiling but still bounded.
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
            gen = gen[:insert_pos] + prompt_block + gen[insert_pos:]
            assert len(gen) > gen_before
            assert len(gen) < gen_before + 3000
            gen_path.write_text(gen)
            changed.append("server prompt plan ceiling")
        else:
            print("WARN could not insert prompt ceiling")
    else:
        print("WARN no anchor for prompt ceiling")
else:
    print("prompt ceiling already present")

# ---------------------------------------------------------------------------
# 5) plans.ts features — add prompt/ref lines WITHOUT changing prices
# ---------------------------------------------------------------------------
plans_path, plans = read("src/lib/plans.ts", 2000)
# Only add feature bullets if missing "Prompt:"
if '"Prompt: 2,000 characters"' not in plans and "Prompt: 2,000" not in plans:
    replacements = [
        (
            '"Private History — up to 6 hours",
      "Community support",
',
            '"Prompt: 2,000 characters",
      "Single image per edit",
      "Private History — up to 6 hours",
      "Community support",
',
        ),
    ]
    # Lite features — inject prompt/ref if not present
    if "Prompt: 2,000 characters" not in plans:
        plans = plans.replace(
            '"350 credits / month",
      "≈ 14 image edits or ≈ 2–3 videos",
',
            '"350 credits / month",
      "Standard Image Studio",
      "Up to 5 reference images",
      "Prompt: 2,000 characters",
      "≈ 14 image edits or ≈ 2–3 videos",
',
            1,
        )
        changed.append("lite features prompt")
    if "Prompt: 4,000 characters" not in plans:
        plans = plans.replace(
            '"750 monthly credits",
      "HD AI image generation",
',
            '"750 monthly credits",
      "Standard Image Studio",
      "Up to 10 reference images",
      "Prompt: 4,000 characters",
      "HD AI image generation",
',
            1,
        )
        changed.append("plus features prompt")
    if "Prompt: 6,000 characters" not in plans:
        plans = plans.replace(
            '"2,500 credits / month",
      "≈ 100 images or ≈ 20 videos",
',
            '"2,500 credits / month",
      "Standard + Premium Image Studio",
      "Up to 10 Premium references",
      "Prompt: 6,000 characters",
      "≈ 100 images or ≈ 20 videos",
',
            1,
        )
        # Studio
        plans = plans.replace(
            '"5,000 credits / month",
      "≈ 200 images or ≈ 40 videos",
',
            '"5,000 credits / month",
      "Standard + Premium + Ultra AI",
      "Prompt: 6,000 characters",
      "Ultra features partially restricted",
      "≈ 200 images or ≈ 40 videos",
',
            1,
        )
        # Master
        plans = plans.replace(
            '"10,000 monthly credits",
      "Advanced Image, Video and Music studios",
',
            '"10,000 monthly credits",
      "Standard + Premium + Ultra AI",
      "Prompt: Unlimited*",
      "IMAX, 8K Max, Custom aspects",
      "Advanced Image, Video and Music studios",
',
            1,
        )
        changed.append("pro/studio/master feature prompts")
    plans_path.write_text(plans)
else:
    print("plans features already have Prompt lines")

# ---------------------------------------------------------------------------
# FINAL SAFETY
# ---------------------------------------------------------------------------
gen2 = Path("src/lib/generate.functions.ts").read_text()
assert len(gen2) >= gen_before
assert "executeUltraImage" in gen2 and "Fail closed" in gen2
assert "PLACEHOLDER" not in gen2 or len(gen2) > 10000

ie2 = Path("src/components/editor/image/ImageEditor.tsx").read_text()
assert len(ie2) > 20000
assert "isAdmin ? 7000" not in ie2
assert "experienceMax" in ie2

print("CHANGED:", changed)
print("generate.functions", gen_before, "->", len(gen2))
print("OK")
