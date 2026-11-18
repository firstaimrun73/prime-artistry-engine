#!/usr/bin/env python3
"""Restore SignedInHomeBody from 70c4f3b and add Try Something New carousel."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "src/components/home/SignedInHomeBody.tsx"

raw = subprocess.check_output(
    ["git", "show", "70c4f3b:src/components/home/SignedInHomeBody.tsx"],
    cwd=ROOT,
)
text = raw.decode()

if "ImageStudioWeeklyCarousel" not in text:
    text = text.replace(
        'import { MalutoHomeHint } from "@/components/home/MalutoHomeHint";',
        'import { MalutoHomeHint } from "@/components/home/MalutoHomeHint";\nimport { ImageStudioWeeklyCarousel } from "@/components/editor/image/ImageStudioWeeklyCarousel";',
    )
    anchor = "      <AutoEditHomeCard />\n\n      <div className=\"mt-8 md:mt-10\">"
    insert = (
        "      <AutoEditHomeCard />\n\n"
        "      {/* Try Something New — moved from Image Studio to homepage */}\n"
        "      <section className=\"mt-6\" aria-label=\"Try something new\">\n"
        "        <ImageStudioWeeklyCarousel />\n"
        "      </section>\n\n"
        "      <div className=\"mt-8 md:mt-10\">"
    )
    if anchor not in text:
        raise SystemExit("homepage anchor not found")
    text = text.replace(anchor, insert)

TARGET.write_text(text)
assert "ImageStudioWeeklyCarousel" in text
assert len(text) > 5000
print("OK", len(text))
