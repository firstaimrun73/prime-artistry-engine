#!/usr/bin/env python3
"""Restore ImageEditor.tsx from known-good commit content (passed via stdin or file) + apply Auto/admin patches."""
from pathlib import Path
import sys

def patch(text: str) -> str:
    if "understandIntent" not in text:
        text = text.replace(
            'import { getSmartSuggestions, type AspectRatio } from "@/lib/prompt-suggestions";\nimport { type ImageQuality } from "@/lib/quality-options";',
            'import { getSmartSuggestions, type AspectRatio } from "@/lib/prompt-suggestions";\n'
            'import {\n'
            '  understandIntent,\n'
            '  expandPromptDeterministic,\n'
            '  buildFinalEditPrompt,\n'
            '  type EditorIntent,\n'
            '} from "@/lib/image-edit/prompt-engine";\n'
            'import { type ImageQuality } from "@/lib/quality-options";',
            1,
        )
    text = text.replace(
        'const isFreePlanForWm = (profile?.plan ?? "free") === "free";',
        'const isFreePlanForWm = (profile?.plan ?? "free") === "free" && !isAdmin;',
        1,
    )
    text = text.replace(
        'const planMaxImages = getPlanLimits(profile?.plan ?? "free").maxImages;\n  const effectiveMaxImages = Math.min(planMaxImages, experienceMax);',
        'const planMaxImages = isAdmin\n'
        '    ? experienceMax\n'
        '    : getPlanLimits(profile?.plan ?? "free").maxImages;\n'
        '  const effectiveMaxImages = Math.min(planMaxImages, experienceMax);',
        1,
    )
    old_run = (
        '  const runGenerate = async () => {\n'
        '    if (!isAdmin && !canAccessImageExperience(profile?.plan, studioTier, isAdmin)) {\n'
        '      toast.error("Upgrade to use this experience.");\n'
        '      window.location.href = "/pricing";\n'
        '      return;\n'
        '    }\n'
        '    if (!prompt.trim()) return toast.error("Enter a prompt first.");\n'
        '    await runImageJob({ jobPrompt: prompt.trim() });\n'
        '  };'
    )
    new_run = (
        '  const runGenerate = async () => {\n'
        '    if (!isAdmin && !canAccessImageExperience(profile?.plan, studioTier, isAdmin)) {\n'
        '      toast.error("Upgrade to use this experience.");\n'
        '      window.location.href = "/pricing";\n'
        '      return;\n'
        '    }\n'
        '    if (!prompt.trim()) return toast.error("Enter a prompt first.");\n'
        '\n'
        '    let jobPrompt = prompt.trim();\n'
        '\n'
        '    // AUTO mode: classify intent + expand into a proper image-edit instruction\n'
        '    // so the same generateMedia path receives a high-quality, intent-locked prompt.\n'
        '    // Composer mode keeps the user\'s raw prompt (plus existing aspect/quality controls).\n'
        '    if (workspaceMode === "auto") {\n'
        '      const hasSource = !!(inputDataUrl || inputFile || inputPreview);\n'
        '      const refCount = refImages.length;\n'
        '      const hasRefs = refCount > 0 || gallery.length > 1;\n'
        '      if (hasSource) {\n'
        '        try {\n'
        '          const intent: EditorIntent = understandIntent(jobPrompt, hasRefs);\n'
        '          const expanded = expandPromptDeterministic(jobPrompt, intent, Math.max(1, refCount));\n'
        '          jobPrompt = buildFinalEditPrompt({\n'
        '            rawPrompt: prompt.trim(),\n'
        '            enhancedOrExpanded: expanded,\n'
        '            intent,\n'
        '            referenceCount: Math.max(1, refCount),\n'
        '          });\n'
        '        } catch (e) {\n'
        '          console.warn("[ImageEditor] Auto prompt expansion failed, using raw prompt", e);\n'
        '        }\n'
        '      }\n'
        '    }\n'
        '\n'
        '    await runImageJob({ jobPrompt });\n'
        '  };'
    )
    if old_run in text:
        text = text.replace(old_run, new_run, 1)
    elif "await runImageJob({ jobPrompt: prompt.trim() });" in text:
        text = text.replace(
            "await runImageJob({ jobPrompt: prompt.trim() });",
            'let jobPrompt = prompt.trim();\n'
            '    if (workspaceMode === "auto") {\n'
            '      const hasSource = !!(inputDataUrl || inputFile || inputPreview);\n'
            '      const refCount = refImages.length;\n'
            '      const hasRefs = refCount > 0 || gallery.length > 1;\n'
            '      if (hasSource) {\n'
            '        try {\n'
            '          const intent: EditorIntent = understandIntent(jobPrompt, hasRefs);\n'
            '          const expanded = expandPromptDeterministic(jobPrompt, intent, Math.max(1, refCount));\n'
            '          jobPrompt = buildFinalEditPrompt({\n'
            '            rawPrompt: prompt.trim(),\n'
            '            enhancedOrExpanded: expanded,\n'
            '            intent,\n'
            '            referenceCount: Math.max(1, refCount),\n'
            '          });\n'
            '        } catch (e) {\n'
            '          console.warn("[ImageEditor] Auto prompt expansion failed, using raw prompt", e);\n'
            '        }\n'
            '      }\n'
            '    }\n'
            '    await runImageJob({ jobPrompt });',
            1,
        )
    else:
        raise SystemExit("runGenerate not found")
    return text

def main():
    src = Path("/tmp/ie_good.tsx")
    if not src.exists():
        raise SystemExit("missing /tmp/ie_good.tsx — run git show first")
    text = src.read_text(encoding="utf-8")
    text = patch(text)
    out = Path("src/components/editor/image/ImageEditor.tsx")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(f"written {out} size={out.stat().st_size}")
    assert "export function ImageEditor" in text
    assert "ImageEditor stub" not in text
    assert text.count("{") == text.count("}")
    print("checks ok")
    print("tail:", repr(text[-100:]))

if __name__ == "__main__":
    main()
