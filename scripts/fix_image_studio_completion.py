#!/usr/bin/env python3
"""Image Studio completion: watermark UI, admin entitlements, Custom aspect."""
from pathlib import Path
import re
import sys

def main() -> None:
    # 1) EditorOptionsPanel — watermark for image + video; ultraFull from plan only
    eop = Path("src/components/editor/EditorOptionsPanel.tsx")
    t = eop.read_text()
    t = t.replace(
        "const ultraFull = isAdmin || getPlanLimits(userPlan ?? \"free\").ultraFullUnlocked;",
        "const ultraFull = getPlanLimits(userPlan ?? \"free\").ultraFullUnlocked;",
        1,
    )
    # Free watermark lock must follow plan, not admin-excluding isFree alone
    t = t.replace(
        "{mediaType === \"video\" && (\n      <div className=\"flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5\">\n        <span className=\"text-xs font-medium text-muted-foreground\">Watermark</span>",
        "{(mediaType === \"video\" || mediaType === \"image\") && (\n      <div className=\"flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5\">\n        <span className=\"text-xs font-medium text-muted-foreground\">Watermark</span>",
        1,
    )
    # Prefer plan-based free for watermark locked row
    if "const planIsFree" not in t:
        t = t.replace(
            "const ultraFull = getPlanLimits(userPlan ?? \"free\").ultraFullUnlocked;",
            "const ultraFull = getPlanLimits(userPlan ?? \"free\").ultraFullUnlocked;\n  const planIsFree = (userPlan ?? \"free\").toLowerCase() === \"free\";",
            1,
        )
    t = t.replace(
        "{isFree ? (\n          <span className=\"flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground\">\n            <Lock className=\"h-3.5 w-3.5\" /> Locked · On\n          </span>",
        "{(planIsFree || isFree) ? (\n          <span className=\"flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground\">\n            <Lock className=\"h-3.5 w-3.5\" /> Locked · On — Motio2edit\n          </span>",
        1,
    )
    eop.write_text(t)
    print("EditorOptionsPanel OK")

    # 2) image-experience-access — admin does NOT grant product access
    acc = Path("src/lib/studio/image/image-experience-access.ts")
    a = acc.read_text()
    a = a.replace(
        """export function canAccessImageExperience(
  plan: string | null | undefined,
  tier: StudioTier,
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  const planId = normalizePlanId(plan);
  return IMAGE_EXPERIENCE_ALLOWED_PLANS[tier].includes(planId);
}""",
        """export function canAccessImageExperience(
  plan: string | null | undefined,
  tier: StudioTier,
  isAdmin = false,
): boolean {
  // Admin is operational only — product entitlement follows subscription plan.
  void isAdmin;
  const planId = normalizePlanId(plan);
  return IMAGE_EXPERIENCE_ALLOWED_PLANS[tier].includes(planId);
}""",
        1,
    )
    a = a.replace(
        " *   Admin             → all three (handled by caller with isAdmin override)\n",
        " *   Admin does NOT override product entitlement\n",
        1,
    )
    acc.write_text(a)
    print("image-experience-access OK")

    # 3) planLimits — isMultiImageLocked / maxImages: do not admin-bypass product caps for Ultra full
    pl = Path("src/utils/planLimits.ts")
    p = pl.read_text()
    # isPromptEffectivelyUnlimited should not use ultraFullUnlocked alone wrongly — leave
    pl.write_text(p)

    # 4) ultra validation — NEVER map custom → 16:9; preserve explicit ratios
    val = Path("src/lib/studio/image/ultra/validation.ts")
    v = val.read_text()
    old_custom = '''  // Custom: client may send "custom" — treat as 16:9 master; prompt should carry ratio intent.
  // True free-form W:H custom dims are applied when aspect is a numeric ratio like "2.35:1".
  if (a === "custom") {
    return { aspect: "16:9" };
  }
  const ratioMatch = a.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (ratioMatch) {
    const w = Number(ratioMatch[1]);
    const h = Number(ratioMatch[2]);
    if (w > 0 && h > 0) {
      const r = w / h;
      // Map free ratio to nearest supported Ultra aspect for master generation.
      if (r > 2.1) return { aspect: "21:9" };
      if (r > 1.5) return { aspect: "16:9" };
      if (r > 1.2) return { aspect: "4:3" };
      if (r > 0.9) return { aspect: "1:1" };
      if (r > 0.7) return { aspect: "3:4" };
      return { aspect: "9:16" };
    }
  }
  return { aspect: "1:1" };
}'''
    new_custom = '''  // Custom must NEVER silently become 16:9 (or any other preset).
  // Bare "custom" without dimensions is rejected — client should send explicit W:H.
  if (a === "custom") {
    return {
      aspect: "1:1",
      error:
        "Custom aspect requires an explicit ratio (for example 2.35:1 or 3:2). It cannot default to 16:9.",
    };
  }
  // Explicit numeric ratios (including 3:2 / 2:3 and free-form) are preserved for provider image_size.
  const ratioMatch = a.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (ratioMatch) {
    const w = Number(ratioMatch[1]);
    const h = Number(ratioMatch[2]);
    if (w > 0 && h > 0 && Number.isFinite(w) && Number.isFinite(h)) {
      const known = [
        "1:1",
        "4:3",
        "16:9",
        "9:16",
        "3:4",
        "21:9",
        "3:2",
        "2:3",
      ] as const;
      const normalized = `${w}:${h}`;
      // Prefer canonical labels when exact match (integer forms).
      for (const k of known) {
        const [kw, kh] = k.split(":").map(Number);
        if (Math.abs(w / h - kw / kh) < 1e-6) {
          return { aspect: k as UltraAspectRatio };
        }
      }
      // Preserve free-form ratio as "W:H" — model maps to real pixel dimensions.
      return { aspect: normalized as UltraAspectRatio };
    }
  }
  return {
    aspect: "1:1",
    error: "Unsupported aspect ratio. Choose a preset or an explicit W:H custom ratio.",
  };
}'''
    if old_custom in v:
        v = v.replace(old_custom, new_custom, 1)
        print("validation custom fixed")
    elif 'error:\n        "Custom aspect requires' in v or "Custom aspect requires an explicit" in v:
        print("validation already fixed")
    else:
        # softer fallback
        if 'if (a === "custom")' in v and 'return { aspect: "16:9" }' in v:
            v = v.replace(
                'if (a === "custom") {\n    return { aspect: "16:9" };\n  }',
                'if (a === "custom") {\n    return { aspect: "1:1", error: "Custom aspect requires an explicit ratio (for example 2.35:1). It cannot default to 16:9." };\n  }',
                1,
            )
            # Remove nearest mapping block
            v = re.sub(
                r"// Map free ratio to nearest supported Ultra aspect for master generation\.\n"
                r"\s*if \(r > 2\.1\) return \{ aspect: \"21:9\" \};\n"
                r"\s*if \(r > 1\.5\) return \{ aspect: \"16:9\" \};\n"
                r"\s*if \(r > 1\.2\) return \{ aspect: \"4:3\" \};\n"
                r"\s*if \(r > 0\.9\) return \{ aspect: \"1:1\" \};\n"
                r"\s*if \(r > 0\.7\) return \{ aspect: \"3:4\" \};\n"
                r"\s*return \{ aspect: \"9:16\" \};",
                "return { aspect: `${w}:${h}` as UltraAspectRatio };",
                v,
                count=1,
            )
            print("validation soft fixed")
        else:
            print("WARN validation pattern not found")
    # Allow 3:2 / 2:3 in the known list branch at top
    if 'a === "3:2"' not in v:
        v = v.replace(
            '''  if (
    a === "1:1" ||
    a === "4:3" ||
    a === "16:9" ||
    a === "9:16" ||
    a === "3:4" ||
    a === "21:9"
  ) {
    return { aspect: a as UltraAspectRatio };
  }''',
            '''  if (
    a === "1:1" ||
    a === "4:3" ||
    a === "16:9" ||
    a === "9:16" ||
    a === "3:4" ||
    a === "21:9" ||
    a === "3:2" ||
    a === "2:3"
  ) {
    return { aspect: a as UltraAspectRatio };
  }''',
            1,
        )
    val.write_text(v)
    print("validation OK")

    # 5) ultra types — add 3:2 / 2:3
    ut = Path("src/lib/studio/image/ultra/types.ts")
    u = ut.read_text()
    if '"3:2"' not in u:
        u = u.replace(
            '''export type UltraAspectRatio =
  | "1:1"
  | "4:3"
  | "16:9"
  | "9:16"
  | "3:4"
  | "21:9"
  | "imax";''',
            '''export type UltraAspectRatio =
  | "1:1"
  | "4:3"
  | "16:9"
  | "9:16"
  | "3:4"
  | "21:9"
  | "3:2"
  | "2:3"
  | "imax"
  | (string & {});''',
            1,
        )
        ut.write_text(u)
        print("types OK")
    else:
        print("types already has 3:2")

    # 6) model.ts — real pixel sizes for 3:2 / 2:3 / free-form ratios
    model = Path("src/lib/studio/image/ultra/model.ts")
    m = model.read_text()
    if "3:2" not in m or "free-form" not in m:
        # Inject helper before ultraMasterImageSize
        if "function dimensionsForRatio" not in m:
            helper = '''
/** Build width×height for a W:H ratio at a long-edge budget (Flux custom image_size). */
function dimensionsForRatio(aspect: string, longEdge: number): { width: number; height: number } | null {
  const match = aspect.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const rw = Number(match[1]);
  const rh = Number(match[2]);
  if (!(rw > 0) || !(rh > 0)) return null;
  if (rw >= rh) {
    return { width: longEdge, height: Math.max(64, Math.round((longEdge * rh) / rw)) };
  }
  return { width: Math.max(64, Math.round((longEdge * rw) / rh)), height: longEdge };
}

'''
            m = m.replace(
                "export function ultraMasterImageSize(",
                helper + "export function ultraMasterImageSize(",
                1,
            )
        # After imax block, try free-form / 3:2 / 2:3 before switch defaults
        needle = "  // IMAX = exact 1.43:1 custom dimensions (never 16:9 or 21:9).\n  if (aspect === \"imax\") {\n    // ~2K-class master for enhancement; delivery upscale uses ultraDeliveryDimensions.\n    return { width: 2048, height: 1432 };\n  }"
        insert = needle + "\n  // Preserved custom / 3:2 / 2:3 ratios → real pixel dimensions (never map to 16:9).\n  {\n    const long = quality === \"sd\" ? 896 : 2048;\n    const dims = dimensionsForRatio(aspect, long);\n    if (dims && aspect !== \"1:1\" && ![\"16:9\",\"9:16\",\"4:3\",\"3:4\",\"21:9\"].includes(aspect)) {\n      // Known presets still use named sizes below; free-form and 3:2/2:3 use exact dims.\n      if (aspect === \"3:2\" || aspect === \"2:3\" || !/^\\d+:\\d+$/.test(\"x\")) {\n        if (aspect === \"3:2\" || aspect === \"2:3\" || /^\\d+(?:\\.\\d+)?:\\d+(?:\\.\\d+)?$/.test(aspect)) {\n          if (aspect === \"3:2\" || aspect === \"2:3\" || ![\"1:1\",\"4:3\",\"3:4\",\"16:9\",\"9:16\",\"21:9\"].includes(aspect)) {\n            return dims;\n          }\n        }\n      }\n    }\n  }"
        # Simpler inject
        simple = '''  // IMAX = exact 1.43:1 custom dimensions (never 16:9 or 21:9).
  if (aspect === "imax") {
    // ~2K-class master for enhancement; delivery upscale uses ultraDeliveryDimensions.
    return { width: 2048, height: 1432 };
  }
  // 3:2 / 2:3 and free-form W:H — real dimensions for Flux custom image_size (never coerce to 16:9).
  if (aspect === "3:2" || aspect === "2:3" || /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(aspect)) {
    if (!["1:1", "4:3", "3:4", "16:9", "9:16", "21:9"].includes(aspect)) {
      const long = quality === "sd" ? 896 : 2048;
      const dims = dimensionsForRatio(aspect, long);
      if (dims) return dims;
    }
  }'''
        if "3:2 / 2:3 and free-form" not in m:
            m = m.replace(
                '''  // IMAX = exact 1.43:1 custom dimensions (never 16:9 or 21:9).
  if (aspect === "imax") {
    // ~2K-class master for enhancement; delivery upscale uses ultraDeliveryDimensions.
    return { width: 2048, height: 1432 };
  }''',
                simple,
                1,
            )
        # ultraDeliveryDimensions: add 3:2 / 2:3 and free-form
        if '"3:2"' not in m.split("ultraDeliveryDimensions")[-1]:
            m = m.replace(
                '''  const map: Record<string, [number, number]> = {
    "1:1": [long, long],
    "4:3": [long, Math.round((long * 3) / 4)],
    "3:4": [Math.round((long * 3) / 4), long],
    "16:9": [long, Math.round((long * 9) / 16)],
    "9:16": [Math.round((long * 9) / 16), long],
    "21:9": [long, Math.round((long * 9) / 21)],
  };
  const [w, h] = map[ar] ?? map["1:1"];
  return { width: w, height: h };
}''',
                '''  const map: Record<string, [number, number]> = {
    "1:1": [long, long],
    "4:3": [long, Math.round((long * 3) / 4)],
    "3:4": [Math.round((long * 3) / 4), long],
    "16:9": [long, Math.round((long * 9) / 16)],
    "9:16": [Math.round((long * 9) / 16), long],
    "21:9": [long, Math.round((long * 9) / 21)],
    "3:2": [long, Math.round((long * 2) / 3)],
    "2:3": [Math.round((long * 2) / 3), long],
  };
  if (map[ar]) {
    const [w, h] = map[ar];
    return { width: w, height: h };
  }
  const custom = dimensionsForRatio(ar, long);
  if (custom) return custom;
  return { width: long, height: long };
}''',
                1,
            )
        model.write_text(m)
        print("model OK")
    else:
        print("model already patched")

    # 7) studio-tier — 3:2 / 2:3 on Ultra (premium); Custom already gated by ultraFull
    st = Path("src/lib/studio/studio-tier.ts")
    s = st.read_text()
    # Ultra list
    if '"3:2"' not in s:
        s = s.replace(
            'return ["1:1", "4:3", "16:9", "9:16", "3:4", "21:9", "imax", "custom"];',
            'return ["1:1", "4:3", "3:2", "16:9", "9:16", "2:3", "3:4", "21:9", "imax", "custom"];',
            1,
        )
        # Premium (pro) can also use 3:2 / 2:3 if provider path supports custom size — Premium may not; keep Ultra only
        st.write_text(s)
        print("studio-tier OK")
    else:
        print("studio-tier already has 3:2")

    # 8) ImageEditor — plan-based product limits; pass isFreePlanForWm to options; no admin Master
    ie = Path("src/components/editor/image/ImageEditor.tsx")
    it = ie.read_text()
    # effectiveMaxImages: remove admin inflation
    it = it.replace(
        """  const effectiveMaxImages = Math.min(
    isAdmin ? Math.max(planMaxImages, experienceMax) : planMaxImages,
    experienceMax,
  );""",
        """  const effectiveMaxImages = Math.min(planMaxImages, experienceMax);""",
        1,
    )
    # visible experiences without admin override
    it = it.replace(
        "visibleImageExperiences(profile.plan, isAdmin)",
        "visibleImageExperiences(profile.plan, false)",
    )
    # EditorOptionsPanel isFree → plan-based for watermark lock
    it = it.replace(
        "isFree={isFree}\n                  studioTier={studioTier}",
        "isFree={isFreePlanForWm}\n                  studioTier={studioTier}",
        1,
    )
    # Ensure isFreePlanForWm exists
    if "isFreePlanForWm" not in it:
        it = it.replace(
            'const isFree = profile?.plan === "free" && !isAdmin;',
            'const isFree = profile?.plan === "free" && !isAdmin;\n  const isFreePlanForWm = (profile?.plan ?? "free") === "free";',
            1,
        )
    ie.write_text(it)
    print("ImageEditor OK")

    # Sanity
    assert 'return { aspect: "16:9" }' not in Path("src/lib/studio/image/ultra/validation.ts").read_text() or (
        "Custom aspect requires" in Path("src/lib/studio/image/ultra/validation.ts").read_text()
    )
    val_txt = Path("src/lib/studio/image/ultra/validation.ts").read_text()
    if re.search(r'if \(a === "custom"\)[\s\S]{0,80}aspect: "16:9"', val_txt):
        sys.exit("custom still maps to 16:9")
    acc_txt = Path("src/lib/studio/image/image-experience-access.ts").read_text()
    if "if (isAdmin) return true" in acc_txt:
        sys.exit("admin still grants experience access")
    eop_txt = Path("src/components/editor/EditorOptionsPanel.tsx").read_text()
    if 'mediaType === "video" || mediaType === "image"' not in eop_txt and 'mediaType === "image"' not in eop_txt:
        # must show watermark for image
        if 'mediaType === "video" &&' in eop_txt and eop_txt.count('Watermark') <= 1:
            sys.exit("watermark still video-only")
    print("ALL SANITY OK")

if __name__ == "__main__":
    main()
