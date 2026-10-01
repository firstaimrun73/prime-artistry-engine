#!/usr/bin/env python3
"""Apply storage patches. Image/Video generate may use R2; Music must NOT rehost provider media."""
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

    if "executeStandardImage" not in t or "persistGenerationHistory" not in t:
        raise SystemExit("generate incomplete after patch")
    path.write_text(t)
    print("generate patched bytes", len(t))


def patch_music(path: Path) -> None:
    """Music architecture: provider URL only — never inject R2 ingest."""
    t = path.read_text()
    if len(t) < 10000:
        raise SystemExit(f"music too small: {len(t)}")
    if "SEE_FILE" in t or "PLACEHOLDER" in t:
        raise SystemExit("music still stub")
    if "generateMusic" not in t:
        raise SystemExit("music missing generateMusic")
    if "ingestProviderMediaToUserR2" in t:
        raise SystemExit(
            "music.functions.ts must NOT call ingestProviderMediaToUserR2 "
            "(provider URL architecture)"
        )
    print("music OK (no R2 ingest)", len(t))


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: apply-media-r2-patches.py <generate.ts> <music.ts>")
    gen = Path(sys.argv[1])
    mus = Path(sys.argv[2])
    patch_generate(gen)
    patch_music(mus)


if __name__ == "__main__":
    main()
