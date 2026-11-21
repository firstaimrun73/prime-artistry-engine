#!/usr/bin/env python3
"""Apply Maluto glass UI patches to AutoEditPage.tsx in place."""
from pathlib import Path
import re

p = Path("src/components/auto-edit/AutoEditPage.tsx")
t = p.read_text()
orig = len(t)

if "pickMalutoTagline" not in t:
    t = t.replace(
        'from "lucide-react";\nimport { Button }',
        'from "lucide-react";\nimport { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";\nimport { resolveAvatarSrc } from "@/lib/avatar-presets";\nimport { pickMalutoTagline } from "@/lib/auto-edit/maluto-taglines";\nimport { Button }',
    )
    t = t.replace(
        "AUTO_EDIT_PRODUCT_NAME,\n  autoEditCreditCost,",
        "AUTO_EDIT_PRODUCT_NAME,\n  AUTO_EDIT_PRODUCT_VERSION,\n  autoEditCreditCost,",
    )
    t = t.replace("  ImagePlus,\n", "")

if "setTagline" not in t:
    t = t.replace(
        "  const inputRef = useRef<HTMLInputElement>(null);\n  const runLock = useRef(false);",
        "  const inputRef = useRef<HTMLInputElement>(null);\n  const [tagline, setTagline] = useState(() => pickMalutoTagline());\n  const [reduceMotion, setReduceMotion] = useState(false);\n  const runLock = useRef(false);",
    )

if "prefers-reduced-motion" not in t:
    needle = "  useEffect(() => {\n    setQuality(defaultAutoEditQualityForPlan(plan));\n  }, [plan]);"
    insert = needle + "\n\n  useEffect(() => {\n    try {\n      setReduceMotion(window.matchMedia(\"(prefers-reduced-motion: reduce)\").matches);\n    } catch {}\n  }, []);\n\n  useEffect(() => {\n    if (preview || busy || output) return;\n    const id = window.setInterval(() => setTagline(pickMalutoTagline()), 4200);\n    return () => window.clearInterval(id);\n  }, [preview, busy, output]);"
    if needle in t:
        t = t.replace(needle, insert, 1)

t = t.replace("(2MP max)", "")
t = t.replace(" · ready for Maluto AI", " · ready")
t = t.replace("auto 2MP normalize", "Maximum 25 MB")
t = t.replace("max {MAX_MB}MB · Maximum 25 MB", "Maximum {MAX_MB} MB")
t = t.replace("max {MAX_MB}MB · auto 2MP normalize", "Maximum {MAX_MB} MB")

if "v{AUTO_EDIT_PRODUCT_VERSION}" not in t:
    i0 = t.find("      {/* Header */}")
    i1 = t.find("{/* Mobile credit strip */}")
    i2 = t.find("<main", i1 if i1 > 0 else i0)
    if i0 >= 0 and i2 > i0:
        new_h = (
            "      {/* Header */}\n"
            "      <header className=\"sticky top-0 z-20 flex shrink-0 items-center gap-2 border-b border-border/40 bg-background/75 px-3 py-2.5 backdrop-blur-xl sm:gap-3\">\n"
            "        <button type=\"button\" onClick={() => void navigate({ to: \"/\", replace: true })} className=\"grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/50 bg-card/70 shadow-sm\" aria-label=\"Back to home\">\n"
            "          <ArrowLeft className=\"h-4 w-4\" />\n"
            "        </button>\n"
            "        <div className=\"min-w-0 flex-1\">\n"
            "          <h1 className=\"flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl\">\n"
            "            <span className=\"bg-gradient-to-r from-violet-500 via-[#FF5A1F] to-cyan-500 bg-clip-text text-transparent\">{AUTO_EDIT_PRODUCT_NAME}</span>\n"
            "            <span className=\"rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[10px] font-normal tracking-wide text-muted-foreground\">v{AUTO_EDIT_PRODUCT_VERSION}</span>\n"
            "            <span className=\"inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400\">\n"
            "              <span className=\"relative flex h-1.5 w-1.5\">\n"
            "                <span className={cn(\"absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60\", !reduceMotion && \"animate-ping\")} />\n"
            "                <span className=\"relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500\" />\n"
            "              </span>\n"
            "              Live\n"
            "            </span>\n"
            "          </h1>\n"
            "        </div>\n"
            "        <Link to=\"/profile\" className=\"shrink-0\" aria-label=\"Profile\">\n"
            "          <Avatar className=\"h-9 w-9 border border-border/50 shadow-sm\">\n"
            "            <AvatarImage src={resolveAvatarSrc((profile as { avatar_url?: string | null } | null)?.avatar_url, (profile as { avatar_signed_url?: string | null } | null)?.avatar_signed_url, { nameOrEmail: displayName, userId: user?.id })} alt=\"\" />\n"
            "            <AvatarFallback className=\"text-[11px] font-semibold\">{initials}</AvatarFallback>\n"
            "          </Avatar>\n"
            "        </Link>\n"
            "      </header>\n\n"
        )
        t = t[:i0] + new_h + t[i2:]

if "Upload Your Photo" not in t and "disabled={busy || !file}" in t:
    old = (
        '            <Button\n'
        '              className="h-12 w-full rounded-full bg-[#FF5A1F] text-base font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-[#e04e1a] disabled:opacity-50"\n'
        '              size="lg"\n'
        '              disabled={busy || !file}\n'
        '              onClick={() => void run()}\n'
        '            >'
    )
    new = (
        '            {!file ? (\n'
        '              <Button className="h-12 w-full rounded-full border border-white/20 bg-gradient-to-r from-violet-600 via-[#FF5A1F] to-cyan-500 text-base font-semibold text-white shadow-lg shadow-[#FF5A1F]/25 hover:opacity-95" size="lg" type="button" onClick={() => inputRef.current?.click()}>\n'
        '                <Upload className="mr-2 h-4 w-4" />\n'
        '                Upload Your Photo\n'
        '              </Button>\n'
        '            ) : (\n'
        '            <Button\n'
        '              className="h-12 w-full rounded-full bg-gradient-to-r from-[#FF5A1F] to-orange-500 text-base font-semibold text-white shadow-lg shadow-orange-500/25 hover:opacity-95 disabled:opacity-50"\n'
        '              size="lg"\n'
        '              disabled={busy}\n'
        '              onClick={() => void run()}\n'
        '            >'
    )
    if old in t:
        t = t.replace(old, new, 1)
        for m in ["Enhance · {creditCost} credits", "Enhance \u00b7 {creditCost} credits"]:
            if m in t:
                idx = t.find(m)
                close = t.find("</Button>", idx)
                if close > 0:
                    insert_at = close + len("</Button>")
                    t = t[:insert_at] + "\n            )" + t[insert_at:]
                break

t = t.replace(
    'rounded-2xl border bg-card/90 shadow-sm dark:bg-card/60"',
    'rounded-3xl border border-white/15 bg-card/60 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-card/40"',
)

old_icon = (
    '              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#FF5A1F]/12 text-[#FF5A1F] shadow-inner">\n'
    '                <Upload className="h-7 w-7" />\n'
    '              </span>'
)
new_orb = (
    '              <div className="relative grid h-28 w-28 place-items-center sm:h-32 sm:w-32">\n'
    '                <div className={cn("absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/40 via-fuchsia-400/30 to-cyan-400/40 blur-2xl", !reduceMotion && "animate-pulse")} aria-hidden />\n'
    '                <div className={cn("absolute inset-2 rounded-full bg-gradient-to-tr from-cyan-400/50 via-[#FF5A1F]/40 to-violet-500/50 opacity-80 blur-md", !reduceMotion && "animate-[spin_14s_linear_infinite]")} aria-hidden />\n'
    '                <div className="relative grid h-20 w-20 place-items-center rounded-full border border-white/25 bg-gradient-to-br from-white/30 via-white/10 to-transparent shadow-[0_0_40px_rgba(255,90,31,0.28)] backdrop-blur-md dark:from-white/15 sm:h-24 sm:w-24">\n'
    '                  <Sparkles className="h-8 w-8 text-[#FF5A1F] drop-shadow sm:h-9 sm:w-9" />\n'
    '                </div>\n'
    '              </div>\n'
    '              <div className="min-h-[2.75rem] max-w-[18rem] px-1">\n'
    '                <p key={tagline} className={cn("text-sm font-medium leading-snug text-foreground/90 sm:text-[15px]", !reduceMotion && "animate-in fade-in duration-700")}>{tagline}</p>\n'
    '              </div>'
)
if old_icon in t:
    t = t.replace(old_icon, new_orb)

t = t.replace(
    '              <Button\n'
    '                type="button"\n'
    '                onClick={() => inputRef.current?.click()}\n'
    '                className="mt-1 h-10 rounded-full bg-[#FF5A1F] px-6 text-sm font-bold text-white hover:bg-[#e04e1a]"\n'
    '              >\n'
    '                <ImagePlus className="mr-1.5 h-4 w-4" />\n'
    '                Choose Photo\n'
    '              </Button>\n',
    '',
)
t = re.sub(
    r'\s*<Button\s+type="button"\s+onClick=\{\(\) => inputRef\.current\?\.click\(\)\}[\s\S]*?>[\s\S]*?Choose Photo[\s\S]*?</Button>',
    '',
    t,
    count=1,
)

t = t.replace("Let&apos;s solve your picture in one click.", "Intelligent photo restoration")
t = t.replace(
    "Upload a photograph. Maluto AI will understand, analyze, and restore it\n              intelligently.",
    "Upload a photograph. Maluto AI analyses and restores it with care.",
)

p.write_text(t)
print("PATCHED", orig, "->", len(t))
print("pickMaluto", "pickMalutoTagline" in t)
print("Upload Your Photo", "Upload Your Photo" in t)
print("auto 2MP", "auto 2MP" in t)
print("avatar", "resolveAvatarSrc" in t)
print("v product UI", "v{AUTO_EDIT_PRODUCT_VERSION}" in t)
print("orb", "animate-[spin_14s_linear_infinite]" in t)
