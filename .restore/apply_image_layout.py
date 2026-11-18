#!/usr/bin/env python3
"""Apply Motio2edit Image Studio glass layout (Auto/Composer, non-scroll shell)."""
from pathlib import Path
import re
import sys

p = Path("src/components/editor/image/ImageEditor.tsx")
t = p.read_text(encoding="utf-8")
if "workspaceMode" in t and "Motio2edit" in t:
    print("already applied")
    sys.exit(0)
if "export function ImageEditor" not in t or "generateMedia" not in t:
    print("ERROR: bad ImageEditor", file=sys.stderr)
    sys.exit(1)

t = t.replace(
    '  const [studioTier, setStudioTier] = useState<StudioTier>("standard");',
    '  const [studioTier, setStudioTier] = useState<StudioTier>("standard");\n'
    '  /** Auto = default compact; Composer = expanded controls. */\n'
    '  const [workspaceMode, setWorkspaceMode] = useState<"auto" | "composer">("auto");',
)
t = t.replace(
    '    <div className={cn("min-h-[100dvh] overflow-x-hidden pb-24 sm:pb-10", studioShellClass(studioTier))}>',
    '    <div className={cn("flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden", studioShellClass(studioTier))}>',
)
t = t.replace(
    '        <div className="mx-auto min-w-0 max-w-5xl overflow-x-hidden px-3 py-3 sm:px-4 sm:py-6">',
    '        <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col overflow-hidden px-3 py-2 sm:px-4 sm:py-3">',
)

old_h = (
    '                <h1 className="min-w-0 text-lg font-extrabold tracking-tight leading-tight sm:text-xl">\n'
    '                  <span className="text-foreground">Image</span>{" "}\n'
    '                  <span className="text-[#FF5A1F]">Studio</span>'
)
new_h = (
    '                <h1 className="min-w-0 text-base font-extrabold tracking-tight leading-tight sm:text-lg">\n'
    '                  <span className="mr-1.5 hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:inline">Motio2edit</span>\n'
    '                  <span className="text-foreground">Image</span>{" "}\n'
    '                  <span className="text-[#FF5A1F]">Studio</span>'
)
if old_h not in t:
    print("ERROR: h1 missing", file=sys.stderr); sys.exit(1)
t = t.replace(old_h, new_h)

banner_pat = re.compile(
    r'          <div className="mt-3">\n'
    r'            <CreditWarningBanner credits=\{profile\.credits\} isAdmin=\{isAdmin\} />\n'
    r'            <div className="mt-2">\n'
    r'              <FreeUserSponsorStrip isFree=\{isFree\} />\n'
    r'            </div>\n'
    r'          </div>\n'
    r'\n'
    r'          <p\n'
    r'            aria-label="Workflow stages"\n'
    r'            className="mt-2 text-\[10px\] text-muted-foreground sm:text-\[11px\]"\n'
    r'          >[\s\S]*?</p>',
)
new_banner = (
    '          <div className="mt-1.5 shrink-0 space-y-1.5">\n'
    '            <CreditWarningBanner credits={profile.credits} isAdmin={isAdmin} />\n'
    '            <FreeUserSponsorStrip isFree={isFree} />\n'
    '          </div>\n'
    '\n'
    '          <div\n'
    '            className="mt-2 flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-card/50 p-0.5 backdrop-blur-md"\n'
    '            role="tablist"\n'
    '            aria-label="Workspace mode"\n'
    '          >\n'
    '            <button type="button" role="tab" aria-selected={workspaceMode === "auto"} onClick={() => setWorkspaceMode("auto")}\n'
    '              className={cn("flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm", workspaceMode === "auto" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Auto</button>\n'
    '            <button type="button" role="tab" aria-selected={workspaceMode === "composer"} onClick={() => setWorkspaceMode("composer")}\n'
    '              className={cn("flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm", workspaceMode === "composer" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Composer</button>\n'
    '          </div>'
)
if not banner_pat.search(t):
    print("ERROR: banner missing", file=sys.stderr); sys.exit(1)
t = banner_pat.sub(new_banner, t, count=1)

t = t.replace(
    '          <div className="mt-3 grid min-w-0 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-[1fr_minmax(280px,360px)] lg:gap-5">\n            <div className="order-1 min-w-0 space-y-3 sm:space-y-3.5">',
    '          <div className="mt-2 grid min-h-0 flex-1 gap-2 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(300px,42%)] lg:gap-4">\n            <div className="order-2 flex min-h-0 min-w-0 flex-col gap-2 overflow-y-auto overscroll-contain pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:order-1 lg:pb-2">',
)

up_pat = re.compile(
    r'              <section className=\{cn\("min-w-0 space-y-2 rounded-2xl border border-border/50 bg-card/40 p-3 backdrop-blur-md sm:p-4", studioCardClass\(studioTier\)\)\}>\n'
    r'                <p className="text-\[10px\] font-semibold uppercase tracking-wide text-muted-foreground sm:text-\[11px\]">\n'
    r'                  <span className="text-\[#FF5A1F\]">.</span> Upload\n'
    r'                </p>\n'
    r'                <EditorUpload'
)
if not up_pat.search(t):
    print("ERROR: upload missing", file=sys.stderr); sys.exit(1)
t = up_pat.sub(
    '              {workspaceMode === "composer" && (\n'
    '              <section className={cn("min-w-0 space-y-2 rounded-2xl border border-border/40 bg-card/50 p-2.5 shadow-sm backdrop-blur-xl sm:p-3", studioCardClass(studioTier))}>\n'
    '                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">\n'
    '                  Upload\n'
    '                </p>\n'
    '                <EditorUpload', t, count=1)

write_pat = re.compile(
    r'(                />\n              </section>\n\n)'
    r'(              <section className=\{cn\("min-w-0 space-y-3 rounded-2xl border border-border/50 bg-card/40 p-3 backdrop-blur-md sm:p-4", studioCardClass\(studioTier\)\)\}>\n)'
    r'(                <p className="text-\[10px\] font-semibold uppercase tracking-wide text-muted-foreground sm:text-\[11px\]">\n)'
    r'(                  <span className="text-\[#FF5A1F\]">.</span> Write & Select\n)'
    r'(                </p>\n)'
    r'(                <EditorPromptPanel)'
)
if not write_pat.search(t):
    print("ERROR: write junction missing", file=sys.stderr); sys.exit(1)
auto_block = (
    '                />\n'
    '              </section>\n'
    '              )}\n'
    '\n'
    '              {workspaceMode === "auto" && (\n'
    '              <section className={cn("min-w-0 rounded-2xl border border-border/40 bg-card/50 p-2 shadow-sm backdrop-blur-xl", studioCardClass(studioTier))}>\n'
    '                <EditorUpload\n'
    '                  fileRef={fileRef}\n'
    '                  mediaType="image"\n'
    '                  videoLocked={false}\n'
    '                  loading={loading}\n'
    '                  inputPreview={inputPreview}\n'
    '                  inputKind={inputKind}\n'
    '                  maxImageMb={MAX_IMAGE_MB}\n'
    '                  maxVideoMb={200}\n'
    '                  onFile={onFile}\n'
    '                  gallery={gallery}\n'
    '                  activeImage={activeImage}\n'
    '                  maxGalleryImages={Math.min(MAX_GALLERY_IMAGES, effectiveMaxImages)}\n'
    '                  onSwitchImage={(idx) => {\n'
    '                    switchImage(idx);\n'
    '                    const item = gallery[idx];\n'
    '                    if (item?.preview) setLightboxSrc(item.preview);\n'
    '                  }}\n'
    '                  onRemoveImage={removeImage}\n'
    '                  lockAdd={isFree}\n'
    '                  onLockedAdd={() =>\n'
    '                    toast.error(MULTI_IMAGE_UPGRADE_MESSAGE, {\n'
    '                      action: { label: "Upgrade", onClick: () => { window.location.href = "/pricing"; } },\n'
    '                    })\n'
    '                  }\n'
    '                />\n'
    '              </section>\n'
    '              )}\n'
    '\n'
    '              <section className={cn("min-w-0 space-y-2 rounded-2xl border border-border/40 bg-card/50 p-2.5 shadow-sm backdrop-blur-xl sm:p-3", studioCardClass(studioTier))}>\n'
    '                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">\n'
    '                  Write & Select\n'
    '                </p>\n'
    '                <EditorPromptPanel'
)
t = write_pat.sub(auto_block, t, count=1)

t = t.replace(
    '                  studioTier={studioTier}\n                />\n              </section>\n\n              <section\n                className={cn(\n                  "sticky bottom-3 z-30',
    '                  studioTier={studioTier}\n                  compact={workspaceMode === "auto"}\n                />\n              </section>\n\n              <section\n                className={cn(\n                  "fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30',
)
t = t.replace(
    'min-w-0 rounded-2xl border border-[#FF5A1F]/25 bg-card/80 p-3 shadow-[0_8px_32px_-8px_rgba(255,90,31,0.25)] backdrop-blur-xl sm:static sm:bottom-auto sm:shadow-md",',
    'min-w-0 rounded-2xl border border-[#FF5A1F]/30 bg-card/90 p-2.5 shadow-[0_12px_40px_-10px_rgba(255,90,31,0.35)] backdrop-blur-xl lg:static lg:inset-auto lg:bottom-auto lg:shadow-md",',
)
t = t.replace(
    '            <div className="order-2 min-w-0 space-y-3 lg:sticky lg:top-4 lg:self-start">',
    '            <div className="order-1 flex min-h-0 min-w-0 flex-col gap-2 overflow-y-auto overscroll-contain lg:order-2">',
)

out_pat = re.compile(
    r'              <section className=\{cn\("min-w-0 space-y-2 rounded-2xl border border-border/50 bg-card/40 p-3 backdrop-blur-md sm:p-4", studioCardClass\(studioTier\)\)\}>\n'
    r'                <p className="text-\[10px\] font-semibold uppercase tracking-wide text-muted-foreground sm:text-\[11px\]">\n'
    r'                  <span className="text-\[#FF5A1F\]">.</span> Output\n'
    r'                </p>'
)
t2, n = out_pat.subn(
    '              <section className={cn("flex min-h-0 flex-1 flex-col space-y-2 rounded-2xl border border-border/40 bg-card/50 p-2.5 shadow-sm backdrop-blur-xl sm:p-3", studioCardClass(studioTier))}>\n'
    '                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">\n'
    '                  Output\n'
    '                </p>', t, count=1)
if n != 1:
    print("ERROR: output missing", n, file=sys.stderr); sys.exit(1)
t = t2

t = t.replace(
    '                  <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-border/40 bg-muted/10 px-4 py-8 text-center">\n'
    '                    <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />\n'
    '                    <p className="text-sm text-muted-foreground">Result appears after Generate</p>\n'
    '                  </div>',
    '                  <div className="flex min-h-[42vw] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 bg-gradient-to-b from-muted/20 to-transparent px-4 py-10 text-center sm:min-h-[220px] lg:min-h-[280px]">\n'
    '                    <ImageIcon className="mb-2 h-10 w-10 text-[#FF5A1F]/35" strokeWidth={1.5} />\n'
    '                    <p className="text-sm font-medium text-muted-foreground">Your image will appear here</p>\n'
    '                    <p className="mt-1 text-[11px] text-muted-foreground/80">Write a prompt and tap Generate</p>\n'
    '                  </div>',
)
t = t.replace(
    '              <ImageStudioWeeklyCarousel />\n              <EditorDisclaimer />',
    '              <div className="hidden lg:block">\n                <ImageStudioWeeklyCarousel />\n                <EditorDisclaimer />\n              </div>',
)

if t.count("{") != t.count("}"):
    print("ERROR: braces", t.count("{"), t.count("}"), file=sys.stderr); sys.exit(1)
for m in ("workspaceMode", "Motio2edit", "generateMedia", 'compact={workspaceMode === "auto"}'):
    if m not in t:
        print("ERROR: missing", m, file=sys.stderr); sys.exit(1)
p.write_text(t, encoding="utf-8")
print("OK", len(t.encode()), "bytes")
