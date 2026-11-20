#!/usr/bin/env python3
"""Surgical fix for generate.functions.ts — Premium/Ultra signatures, refs, Auto orchestration."""
from pathlib import Path
import sys

TARGET = Path("src/lib/generate.functions.ts")

def main():
    text = TARGET.read_text(encoding="utf-8")
    original = text

    # --- 1. Add workspaceMode to schema ---
    if "workspaceMode:" not in text:
        text = text.replace(
            "  standardMode: z.string().optional().nullable(),\n  tags: z.array(z.string()).optional().nullable(),\n});",
            "  standardMode: z.string().optional().nullable(),\n"
            "  tags: z.array(z.string()).optional().nullable(),\n"
            "  workspaceMode: z.enum([\"auto\", \"composer\"]).optional().nullable(),\n"
            "  contextTags: z.array(z.string()).optional().nullable(),\n"
            "  keepWatermark: z.boolean().optional().nullable(),\n"
            "});",
            1,
        )

    # --- 2. Import prompt-engine for Auto server path ---
    if "understandIntent" not in text:
        anchor = 'import { composeTaggedPrompt } from "@/lib/studio/image/tag-semantic-registry";'
        if anchor not in text:
            raise SystemExit("composeTaggedPrompt import not found")
        text = text.replace(
            anchor,
            anchor
            + "\n"
            + "import {\n"
            + "  understandIntent,\n"
            + "  expandPromptDeterministic,\n"
            + "  buildFinalEditPrompt,\n"
            + "  type EditorIntent,\n"
            + '} from "@/lib/image-edit/prompt-engine";\n'
            + "import { quotePremiumCredits, normalizePremiumQuality } from "@/lib/studio/image/premium";\n"
            + "import { quoteUltraCredits, normalizeUltraQuality } from "@/lib/studio/image/ultra";",
            1,
        )

    # --- 3. Fix multiUrls to include referenceImageUrls ---
    old_multi = "const multiUrls = (data.imageUrls || []).filter(Boolean) as string[];"
    new_multi = (
        "const multiUrls = (\n"
        "          (data.referenceImageUrls || data.imageUrls || []) as string[]\n"
        "        ).filter(Boolean);"
    )
    if old_multi in text:
        text = text.replace(old_multi, new_multi, 1)

    # --- 4. Fix pro/premium COST to use proper quotes ---
    old_pro_cost = (
        '} else if (data.studioTier === "pro") {\n'
        '          cost = (computeImageExperienceCredits as any)("pro", multiUrls.length > 1) ?? CREDIT_COST.image;\n'
        '          if (typeof cost === "object") cost = (cost as any).credits ?? CREDIT_COST.image;\n'
        '        } else if (data.studioTier === "premium") {\n'
        '          cost = (computeImageExperienceCredits as any)("premium", multiUrls.length > 1) ?? CREDIT_COST.image;\n'
        '          if (typeof cost === "object") cost = (cost as any).credits ?? CREDIT_COST.image;\n'
        "        } else {"
    )
    new_pro_cost = (
        '} else if (data.studioTier === "pro") {\n'
        "          {\n"
        "            const hasSrc = Boolean(data.imageUrl);\n"
        "            const refN = multiUrls.filter((u) => u !== data.imageUrl).length;\n"
        "            if (hasSrc && refN >= 1) {\n"
        "              const plan = planPremiumMultiGptImage2({\n"
        "                prompt: data.prompt,\n"
        "                imageUrl: data.imageUrl,\n"
        "                referenceImageUrls: multiUrls.filter((u) => u !== data.imageUrl),\n"
        "                imageQuality: data.imageQuality,\n"
        "                aspectRatio: (data as any).aspectRatio,\n"
        "              });\n"
        "              cost = plan.ok ? plan.credits : quotePremiumCredits({\n"
        "                mode: hasSrc ? \"image_to_image\" : \"text_to_image\",\n"
        "                quality: normalizePremiumQuality(data.imageQuality),\n"
        "              }).credits;\n"
        "            } else {\n"
        "              cost = quotePremiumCredits({\n"
        "                mode: hasSrc ? \"image_to_image\" : \"text_to_image\",\n"
        "                quality: normalizePremiumQuality(data.imageQuality),\n"
        "              }).credits;\n"
        "            }\n"
        "          }\n"
        '        } else if (data.studioTier === "premium") {\n'
        "          {\n"
        "            const hasSrc = Boolean(data.imageUrl);\n"
        "            const refN = multiUrls.filter((u) => u !== data.imageUrl).length;\n"
        "            const totalRefs = (hasSrc ? 1 : 0) + refN;\n"
        "            cost = quoteUltraCredits({\n"
        "              mode: totalRefs >= 2 ? \"multi_image\" : hasSrc ? \"image_to_image\" : \"text_to_image\",\n"
        "              quality: normalizeUltraQuality(data.imageQuality),\n"
        "              referenceCount: Math.max(1, totalRefs),\n"
        "            }).credits;\n"
        "          }\n"
        "        } else {"
    )
    if old_pro_cost in text:
        text = text.replace(old_pro_cost, new_pro_cost, 1)
    else:
        print("WARNING: pro/premium cost block not exact — may already be patched")

    # --- 5. Fix execute Premium/Ultra blocks ---
    old_exec = (
        '} else if (data.studioTier === "pro") {\n'
        "          const result = await executePremiumImage({\n"
        "            falKey,\n"
        "            prompt: data.prompt,\n"
        "            imageUrls: data.imageUrl ? [data.imageUrl] : multiUrls,\n"
        "          } as any);\n"
        "          outputUrl = (result as any).outputUrl;\n"
        "          providerSourceUrl = outputUrl;\n"
        '        } else if (data.studioTier === "premium") {\n'
        "          const result = await executeUltraImage({\n"
        "            falKey,\n"
        "            prompt: data.prompt,\n"
        "            imageUrl: data.imageUrl ?? undefined,\n"
        "            imageUrls: multiUrls.length ? multiUrls : undefined,\n"
        "          } as any);\n"
        "          outputUrl = (result as any).outputUrl;\n"
        "          providerSourceUrl = outputUrl;\n"
        "        }"
    )
    new_exec = (
        '} else if (data.studioTier === "pro") {\n'
        "          const refs = multiUrls.filter((u) => u && u !== data.imageUrl);\n"
        "          const runStep = (step: { model: string; body?: Record<string, unknown>; input?: unknown; label?: string }) =>\n"
        "            runFal(\n"
        "              {\n"
        "                label: (step as any).label || \"premium\",\n"
        "                model: step.model,\n"
        "                endpoint: `https://fal.run/${step.model}`,\n"
        "                outputKind: \"image\" as const,\n"
        "                body: (step as any).body ?? (step as any).input ?? {},\n"
        "              } as any,\n"
        "              falKey,\n"
        "            );\n"
        "          if (data.imageUrl && refs.length >= 1) {\n"
        "            const plan = planPremiumMultiGptImage2({\n"
        "              prompt: data.prompt,\n"
        "              imageUrl: data.imageUrl,\n"
        "              referenceImageUrls: refs,\n"
        "              imageQuality: data.imageQuality,\n"
        "              aspectRatio: (data as any).aspectRatio,\n"
        "            });\n"
        "            if (!plan.ok) throw new Error(plan.error === \"not_multi\" ? \"Premium multi requires 2+ images.\" : plan.error);\n"
        "            outputUrl = await runStep(plan.step as any);\n"
        "            if (typeof plan.credits === \"number\") standardCharge = plan.credits;\n"
        "          } else {\n"
        "            const result = await executePremiumImage(\n"
        "              {\n"
        "                prompt: data.prompt,\n"
        "                imageUrl: data.imageUrl ?? undefined,\n"
        "                referenceImageUrls: refs.length ? refs : undefined,\n"
        "                imageQuality: data.imageQuality,\n"
        "                aspectRatio: (data as any).aspectRatio,\n"
        "                strength: typeof (data as any).strength === \"number\" ? (data as any).strength : undefined,\n"
        "              },\n"
        "              { falKey, runStep: runStep as any },\n"
        "            );\n"
        "            outputUrl = result.outputUrl;\n"
        "            if (typeof result.credits === \"number\") standardCharge = result.credits;\n"
        "          }\n"
        "          providerSourceUrl = outputUrl;\n"
        '        } else if (data.studioTier === "premium") {\n'
        "          const refs = multiUrls.filter((u) => u && u !== data.imageUrl);\n"
        "          const runStep = (step: { model: string; body?: Record<string, unknown>; input?: unknown; label?: string }) =>\n"
        "            runFal(\n"
        "              {\n"
        "                label: (step as any).label || \"ultra\",\n"
        "                model: step.model,\n"
        "                endpoint: `https://fal.run/${step.model}`,\n"
        "                outputKind: \"image\" as const,\n"
        "                body: (step as any).body ?? (step as any).input ?? {},\n"
        "              } as any,\n"
        "              falKey,\n"
        "            );\n"
        "          const result = await executeUltraImage(\n"
        "            {\n"
        "              prompt: data.prompt,\n"
        "              imageUrl: data.imageUrl ?? undefined,\n"
        "              referenceImageUrls: refs.length ? refs : undefined,\n"
        "              imageQuality: data.imageQuality,\n"
        "              aspectRatio: (data as any).aspectRatio,\n"
        "              imax: (data as any).aspectRatio === \"imax\" || data.imageQuality === \"8k_max\",\n"
        "            },\n"
        "            { falKey, runStep: runStep as any },\n"
        "          );\n"
        "          outputUrl = result.outputUrl;\n"
        "          if (typeof result.credits === \"number\") standardCharge = result.credits;\n"
        "          providerSourceUrl = outputUrl;\n"
        "        }"
    )
    if old_exec in text:
        text = text.replace(old_exec, new_exec, 1)
    else:
        print("WARNING: execute block not exact")
        if "executePremiumImage({\n            falKey," in text:
            raise SystemExit("old broken executePremium still present")

    # --- 6. Auto server-side orchestration ---
    auto_marker = "/* AUTO_SERVER_ORCHESTRATION */"
    if auto_marker not in text:
        needle = '        if (isCircleRemove || isCircleAdd) {'
        if needle not in text:
            needle = '        const hasMask = !!circleNorm.maskUrl;'
        insert = (
            "        // Auto mode: server-side intent + mode-aware prompt construction.\n"
            "        // Composer leaves the user prompt untouched.\n"
            f"        {auto_marker}\n"
            '        if ((data as any).workspaceMode === "auto" && data.prompt && !/PRIMARY TASK|OUTFIT TRANSFER|This is a real photograph/i.test(data.prompt)) {\n'
            "          try {\n"
            "            const refCount = multiUrls.filter((u) => u && u !== data.imageUrl).length;\n"
            "            const hasRefs = refCount > 0;\n"
            "            const intent: EditorIntent = understandIntent(data.prompt, hasRefs);\n"
            "            const expanded = expandPromptDeterministic(data.prompt, intent, Math.max(1, refCount));\n"
            "            const finalPrompt = buildFinalEditPrompt({\n"
            "              rawPrompt: data.prompt,\n"
            "              enhancedOrExpanded: expanded,\n"
            "              intent,\n"
            "              referenceCount: Math.max(1, refCount),\n"
            "            });\n"
            "            (data as any).prompt = finalPrompt;\n"
            "            imageStudioMeta = {\n"
            "              ...(imageStudioMeta || {}),\n"
            '              workspaceMode: "auto",\n'
            "              editorIntent: intent,\n"
            "            };\n"
            "            console.info(\"[generate] Auto orchestration\", { intent, refCount, promptLen: finalPrompt.length });\n"
            "          } catch (autoErr) {\n"
            '            console.warn("[generate] Auto orchestration failed, using raw prompt", autoErr);\n'
            "          }\n"
            "        }\n\n"
        )
        if needle in text:
            text = text.replace(needle, insert + needle, 1)
        else:
            print("WARNING: could not insert Auto orchestration")

    if text == original:
        print("No changes applied")
        sys.exit(1)

    if "executePremiumImage({\n            falKey," in text:
        raise SystemExit("broken Premium call still present")
    if 'executeUltraImage({\n            falKey,' in text:
        raise SystemExit("broken Ultra call still present")

    TARGET.write_text(text, encoding="utf-8")
    print(f"Patched {TARGET} size={TARGET.stat().st_size}")
    print("has workspaceMode schema:", "workspaceMode:" in text)
    print("has Auto marker:", auto_marker in text)
    print("has correct Premium call:", "executePremiumImage(" in text and "{ falKey, runStep" in text)

if __name__ == "__main__":
    main()
