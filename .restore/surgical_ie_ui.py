#!/usr/bin/env python3
"""Surgical Image Studio UI fixes on existing ImageEditor.tsx."""
from pathlib import Path
import itertools, random, re

ROOT = Path(".")
path = ROOT / "src/components/editor/image/ImageEditor.tsx"
src = path.read_text()
assert "PLACEHOLDER" not in src or len(src) > 1000

# imports
if "InspirationTagline" not in src:
    src = src.replace(
        'import { RotateCcw, Image as ImageIcon, ChevronDown, Mic, Sparkles, Upload as UploadIcon } from "lucide-react";',
        'import { RotateCcw, Image as ImageIcon, ChevronDown, Mic, Sparkles, Upload as UploadIcon, Crown, WandSparkles } from "lucide-react";\nimport { InspirationTagline } from "@/components/editor/image/InspirationTagline";',
    )
elif "Crown" not in src:
    src = src.replace(
        'Upload as UploadIcon } from "lucide-react";',
        'Upload as UploadIcon, Crown, WandSparkles } from "lucide-react";',
    )

if "promptFocused" not in src:
    src = src.replace(
        'const [prompt, setPrompt] = useState(bootstrap?.initialPrompt ?? "");',
        'const [prompt, setPrompt] = useState(bootstrap?.initialPrompt ?? "");\n  const [promptFocused, setPromptFocused] = useState(false);',
    )

old = '              <div className="flex shrink-0 items-center justify-center p-1.5 sm:p-2">\n                {displayPreview ? ('
idx = src.find(old)
if idx != -1:
    end = src.find("{/* Compact upload + gallery", idx)
    if end != -1:
        rep = (
            "              {/* Empty-state inspiration only \u2014 no large selected-image preview */}\n"
            "              {gallery.length === 0 && !promptFocused && !prompt.trim() && (\n"
            '                <InspirationTagline active className="shrink-0" />\n'
            "              )}\n\n              "
        )
        src = src[:idx] + rep + src[end:]
        print("removed display block")

oldc = (
    "              {!isAdmin && (\n"
    '                <span className="rounded-full border border-border/50 bg-card/50 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground backdrop-blur-sm">\n'
    "                  {profile?.credits ?? 0} credits\n"
    "                </span>\n"
    "              )}"
)
newc = (
    "              {!isAdmin && (\n"
    '                <div className="flex flex-col items-end rounded-xl border border-border/50 bg-card/60 px-2.5 py-1 backdrop-blur-sm leading-tight">\n'
    '                  <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Balance</span>\n'
    '                  <span className="text-xs font-bold tabular-nums text-foreground sm:text-sm">\n'
    '                    {profile?.credits ?? 0} <span className="font-medium text-muted-foreground">credits</span>\n'
    "                  </span>\n"
    "                </div>\n"
    "              )}"
)
if oldc in src:
    src = src.replace(oldc, newc)
    print("credits")

oldi = (
    "                                {studioExperienceLabel(tier)}\n"
    "                                {!canAccessImageExperience(profile?.plan, tier, isAdmin) && (\n"
    '                                  <span className="ml-2 shrink-0 text-[11px] font-semibold text-[#FF5A1F]">Upgrade</span>\n'
    "                                )}"
)
newi = (
    '                                <span className="inline-flex items-center gap-1.5">\n'
    '                                  {tier === "standard" && <ImageIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />}\n'
    '                                  {tier === "pro" && <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-80" />}\n'
    '                                  {tier === "premium" && <Crown className="h-3.5 w-3.5 shrink-0 opacity-80" />}\n'
    "                                  {studioExperienceLabel(tier)}\n"
    "                                </span>\n"
    "                                {!canAccessImageExperience(profile?.plan, tier, isAdmin) && (\n"
    '                                  <span className="ml-2 shrink-0 text-[11px] font-semibold text-[#FF5A1F]">Upgrade</span>\n'
    "                                )}"
)
if oldi in src:
    src = src.replace(oldi, newi)
    print("icons")

if "onFocus={() => setPromptFocused(true)}" not in src:
    src = src.replace(
        "                  onChange={(e) => setPrompt(e.target.value)}\n"
        "                  disabled={loading}\n"
        "                  rows={2}\n"
        '                  placeholder="Describe what you want to create..."',
        "                  onChange={(e) => setPrompt(e.target.value)}\n"
        "                  onFocus={() => setPromptFocused(true)}\n"
        "                  onBlur={() => setPromptFocused(false)}\n"
        "                  disabled={loading}\n"
        "                  rows={2}\n"
        '                  placeholder="Describe what you want to create..."',
    )
    print("focus")

path.write_text(src)
assert "InspirationTagline" in src
assert 'alt="Selected"' not in src
print("IE", len(src))

# 2000 unique taglines
random.seed(42)
verbs = ["Create", "Build", "Craft", "Shape", "Forge", "Design", "Invent", "Compose", "Render", "Generate", "Reveal", "Unlock", "Spark", "Ignite", "Launch"]
nouns = ["vision", "idea", "scene", "world", "portrait", "story", "moment", "mood", "style", "frame", "concept", "dream", "look", "atmosphere", "character"]
adj = ["bold", "quiet", "cinematic", "vivid", "subtle", "epic", "intimate", "surreal", "precise", "playful", "dramatic", "soft", "sharp", "warm", "cool"]
endings = ["today", "now", "in one prompt", "with a single description", "from pure imagination", "before the day ends", "while inspiration is fresh", "without leaving this page", "and share it instantly", "as only you would"]
base = ["Turn your imagination into reality", "Every image begins with an idea", "Create something extraordinary today", "Your imagination has no limits", "Make your vision visible", "Transform ordinary into extraordinary", "Bring your creative ideas to life", "Imagine it. Describe it. Create it", "Your next masterpiece starts here", "Let creativity take the lead", "Frame the moment you imagine", "Paint with language instead of brushes", "Cinematic frames from a logline", "Worlds that only exist in your head", "Bring faded photos back to life"]
lines = set(base)
for v, n, a, e in itertools.product(verbs, nouns, adj, endings):
    if len(lines) >= 2300:
        break
    lines.add(f"{v} a {a} {n} {e}")
for v, n in itertools.product(verbs, nouns):
    lines.add(f"{v} the {n} you have been holding")
    lines.add(f"Your {n} deserves a {random.choice(adj)} frame")
clean, seen = [], set()
for s in sorted(lines):
    s = " ".join(s.split()).strip(" .")
    if not s or len(s) < 12 or len(s) > 90:
        continue
    k = s.lower()
    if k in seen:
        continue
    seen.add(k)
    clean.append(s + ".")
    if len(clean) >= 2000:
        break
assert len(clean) == 2000 and len(set(clean)) == 2000
A, B = clean[:1000], clean[1000:]

def fmt(arr, name):
    body = ",\n".join(f'  "{x}"' for x in arr)
    return f"export const {name}: readonly string[] = [\n{body},\n];\n"

(ROOT / "src/lib/studio/studio-taglines-a.ts").write_text(fmt(A, "STUDIO_TAGLINES_A"))
(ROOT / "src/lib/studio/studio-taglines-b.ts").write_text(fmt(B, "STUDIO_TAGLINES_B"))
print("TAGLINES", len(clean), "VERIFY_OK")
