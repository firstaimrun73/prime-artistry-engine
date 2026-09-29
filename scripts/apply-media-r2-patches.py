#!/usr/bin/env python3
"""Apply private users/** R2 storage patches to generate.functions.ts and music.functions.ts."""
from __future__ import annotations

import sys
from pathlib import Path


def patch_generate(path: Path) -> None:
    t = path.read_text()
    if len(t) < 10000:
        raise SystemExit(f"generate too small: {len(t)}")
    if "PLACEHOLDER" in t or "restore incomplete" in t:
        raise SystemExit("generate still stub")

    if "finalizedR2Key" not in t:
        t = t.replace(
            "let outputUrl: string | null = null;",
            "let outputUrl: string | null = null;\n    let finalizedR2Key: string | null = null;",
            1,
        )

    if "fin.storagePath" not in t:
        needle = (
            '        if (fin.finalUrl && fin.finalUrl.startsWith("https://")) {\n'
            "          outputUrl = fin.finalUrl;\n"
            "        }\n"
            "      } catch (wmErr) {"
        )
        repl = (
            '        if (fin.finalUrl && fin.finalUrl.startsWith("https://")) {\n'
            "          outputUrl = fin.finalUrl;\n"
            "        }\n"
            '        if (fin.storagePath && typeof fin.storagePath === "string") {\n'
            '          finalizedR2Key = fin.storagePath.replace(/^\\//, "");\n'
            "        }\n"
            "      } catch (wmErr) {"
        )
        if needle not in t:
            raise SystemExit("generate: finalize block not found")
        t = t.replace(needle, repl, 1)

    if "r2ObjectKey: finalizedR2Key" not in t:
        needle = (
            "      await persistGenerationHistory({\n"
            "        supabaseAdmin,\n"
            "        userId,\n"
            '        type: data.type === "video" ? "video" : "image",\n'
            "        prompt: data.prompt,\n"
            "        input_url: data.imageUrl ?? null,\n"
            "        output_url: outputUrl,\n"
            '        status: "success",\n'
            "        metadata: meta,\n"
            "      });"
        )
        repl = (
            "      await persistGenerationHistory({\n"
            "        supabaseAdmin,\n"
            "        userId,\n"
            '        type: data.type === "video" ? "video" : "image",\n'
            "        prompt: data.prompt,\n"
            "        input_url: data.imageUrl ?? null,\n"
            "        output_url: outputUrl,\n"
            '        status: "success",\n'
            "        metadata: meta,\n"
            "        r2ObjectKey: finalizedR2Key,\n"
            "      });"
        )
        if needle not in t:
            raise SystemExit("generate: persistGenerationHistory block not found")
        t = t.replace(needle, repl, 1)

    if "ingestProviderMediaToUserR2" not in t:
        insert = (
            "\n"
            "    // Ensure private user R2 storage for durable History/Output delivery.\n"
            "    if (outputUrl && !finalizedR2Key) {\n"
            "      try {\n"
            '        const { ingestProviderMediaToUserR2 } = await import("@/lib/user-media.server");\n'
            '        const kind = data.type === "video" ? "video" : "image";\n'
            "        const ingested = await ingestProviderMediaToUserR2({\n"
            "          userId,\n"
            "          sourceUrl: outputUrl,\n"
            "          kind,\n"
            "        });\n"
            "        if (ingested) {\n"
            "          finalizedR2Key = ingested.objectKey;\n"
            "          outputUrl = ingested.deliveryUrl;\n"
            "        }\n"
            "      } catch (ingestErr) {\n"
            '        console.warn("[generate] user R2 ingest skipped:", ingestErr);\n'
            "      }\n"
            "    }\n\n"
        )
        marker = "let newCredits = profile.credits;"
        if marker not in t:
            raise SystemExit("generate: newCredits marker not found")
        t = t.replace(marker, insert + "    " + marker, 1)

    if "executeStandardImage" not in t or "persistGenerationHistory" not in t:
        raise SystemExit("generate incomplete after patch")
    if "r2ObjectKey: finalizedR2Key" not in t:
        raise SystemExit("generate missing r2ObjectKey")
    if "ingestProviderMediaToUserR2" not in t:
        raise SystemExit("generate missing ingest")
    path.write_text(t)
    print("generate patched bytes", len(t))


def patch_music(path: Path) -> None:
    t = path.read_text()
    if len(t) < 10000:
        raise SystemExit(f"music too small: {len(t)}")
    if "SEE_FILE" in t or "PLACEHOLDER" in t:
        raise SystemExit("music still stub")

    if "ingestProviderMediaToUserR2" not in t:
        old = (
            "    const { data: genRow, error: genErr } = await supabase\n"
            '      .from("generations")\n'
            "      .insert({\n"
            "        user_id: userId,\n"
            '        type: "music",\n'
            "        prompt: brief.summaryPrompt.slice(0, 500),\n"
            "        title: trackTitle,\n"
            "        input_url: data.videoUrl || data.imageUrl || null,\n"
            "        output_url: outputUrl,\n"
            '        status: "success",\n'
            "        retained_as_history: retain,\n"
            "        metadata,\n"
            "      })\n"
            '      .select("id")\n'
            "      .maybeSingle();\n"
        )
        new = (
            "    // Private user R2: copy provider audio/video into users/{userId}/\n"
            "    let musicR2Key: string | null = null;\n"
            "    let musicStorageProvider: string | null = null;\n"
            '    if (outputUrl && outputUrl.startsWith("https://")) {\n'
            "      try {\n"
            '        const { ingestProviderMediaToUserR2 } = await import("@/lib/user-media.server");\n'
            '        const kind = outputType === "video" ? "video" : "music";\n'
            "        const ingested = await ingestProviderMediaToUserR2({\n"
            "          userId,\n"
            "          sourceUrl: outputUrl,\n"
            "          kind,\n"
            "        });\n"
            "        if (ingested) {\n"
            "          musicR2Key = ingested.objectKey;\n"
            '          musicStorageProvider = "r2";\n'
            "          outputUrl = ingested.deliveryUrl;\n"
            '          if (outputType === "video") videoUrl = ingested.deliveryUrl;\n'
            "        }\n"
            "      } catch (e) {\n"
            '        console.warn("[music] user R2 ingest skipped:", e);\n'
            "      }\n"
            "    }\n\n"
            "    const { data: genRow, error: genErr } = await supabase\n"
            '      .from("generations")\n'
            "      .insert({\n"
            "        user_id: userId,\n"
            '        type: "music",\n'
            "        prompt: brief.summaryPrompt.slice(0, 500),\n"
            "        title: trackTitle,\n"
            "        input_url: data.videoUrl || data.imageUrl || null,\n"
            "        output_url: outputUrl,\n"
            '        status: "success",\n'
            "        retained_as_history: retain,\n"
            "        storage_provider: musicStorageProvider,\n"
            "        r2_object_key: musicR2Key,\n"
            "        metadata,\n"
            "      })\n"
            '      .select("id")\n'
            "      .maybeSingle();\n"
        )
        if old not in t:
            raise SystemExit("music generations insert block not found")
        t = t.replace(old, new, 1)

    if "generateMusic" not in t:
        raise SystemExit("music missing generateMusic")
    if "ingestProviderMediaToUserR2" not in t:
        raise SystemExit("music missing ingest")
    path.write_text(t)
    print("music patched bytes", len(t))


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: apply-media-r2-patches.py <generate.ts> <music.ts>")
    gen = Path(sys.argv[1])
    mus = Path(sys.argv[2])
    patch_generate(gen)
    patch_music(mus)


if __name__ == "__main__":
    main()
