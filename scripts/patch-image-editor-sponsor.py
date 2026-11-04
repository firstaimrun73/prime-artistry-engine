#!/usr/bin/env python3
"""Restore-time patch: wire FreeUserSponsorStrip (client-only). No backend changes."""
import sys
from pathlib import Path

def main() -> None:
    src_path = Path(sys.argv[1])
    dst_path = Path(sys.argv[2])
    src = src_path.read_text(encoding="utf-8")

    old_imp = (
        'import { CreditWarningBanner, LOW_CREDIT_TOAST_KEY } from "@/components/CreditWarningBanner";\n'
        'import { toast } from "sonner";'
    )
    new_imp = (
        'import { CreditWarningBanner, LOW_CREDIT_TOAST_KEY } from "@/components/CreditWarningBanner";\n'
        'import { FreeUserSponsorStrip } from "@/components/sponsor/FreeUserSponsorStrip";\n'
        'import { isSponsorUnlockActive } from "@/lib/sponsor-unlock";\n'
        'import { toast } from "sonner";'
    )
    if old_imp not in src:
        raise SystemExit("import anchor missing")
    src = src.replace(old_imp, new_imp, 1)

    old_wm = (
        "  useEffect(() => {\n"
        "    setKeepWatermark(readKeepWatermarkPref());\n"
        "  }, []);"
    )
    new_wm = (
        "  useEffect(() => {\n"
        "    // Free users: watermark forced ON unless sponsor unlock is active this session.\n"
        "    // Server watermark policy is unchanged — this only drives client UI preference.\n"
        "    if ((profile?.plan ?? \"free\") === \"free\" && !isAdminEmail(profile?.email)) {\n"
        "      setKeepWatermark(!isSponsorUnlockActive());\n"
        "    } else {\n"
        "      setKeepWatermark(readKeepWatermarkPref());\n"
        "    }\n"
        "  }, [profile?.plan, profile?.email]);"
    )
    if old_wm not in src:
        raise SystemExit("wm effect anchor missing")
    src = src.replace(old_wm, new_wm, 1)

    old_banner = "            <CreditWarningBanner credits={profile.credits} isAdmin={isAdmin} />"
    new_banner = (
        "            <CreditWarningBanner credits={profile.credits} isAdmin={isAdmin} />\n"
        "            <div className=\"mt-2\">\n"
        "              <FreeUserSponsorStrip isFree={isFree} />\n"
        "            </div>"
    )
    if old_banner not in src:
        raise SystemExit("banner anchor missing")
    src = src.replace(old_banner, new_banner, 1)

    src = src.replace(
        (
            "/**\n"
            " * Image Editor workspace — independent of Video Editor.\n"
            " * UPLOAD → WRITE & SELECT → GENERATE → OUTPUT (compact glass UI)\n"
            " */"
        ),
        (
            "/**\n"
            " * Image Editor workspace — independent of Video Editor.\n"
            " * UPLOAD → WRITE & SELECT → GENERATE → OUTPUT (compact glass UI)\n"
            " * RESTORED 2026-11-04 from 53c55f95 + FreeUserSponsorStrip (client-only Multitag unlock)\n"
            " */"
        ),
        1,
    )

    assert "FreeUserSponsorStrip" in src
    assert "isSponsorUnlockActive" in src
    assert "generateMedia" in src
    assert "Loading full Image Studio" not in src
    dst_path.write_text(src, encoding="utf-8")
    print("OK patched", len(src), "bytes ->", dst_path)

if __name__ == "__main__":
    main()
