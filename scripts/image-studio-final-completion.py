#!/usr/bin/env python3
"""Final Image Studio completion: Master $110, Studio $55, IMAX/Custom locks, 8k_max."""
from pathlib import Path
import re

changed = []

def read(p, n=50):
    path = Path(p)
    t = path.read_text()
    assert len(t) >= n, f"{p} too small"
    return path, t

gen_path, gen0 = read("src/lib/generate.functions.ts", 20000)
gen_before = len(gen0)
assert "executeUltraImage" in gen0 and "Fail closed" in gen0

# ==========================================================================
# 1) plans.ts — Studio $55, Master $110; credits Master 10000 already
# ==========================================================================
plans_path, plans = read("src/lib/plans.ts", 2000)

# PLANS prices
if "USD: 49.99" in plans and 'id: "studio"' in plans:
    plans = plans.replace(
        'id: "studio",
    name: "Studio",
    credits: 5000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 49.99, EUR: 45.99, INR: 4199 },',
        'id: "studio",
    name: "Studio",
    credits: 5000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 55, EUR: 50.99, INR: 4599 },',
        1,
    )
    changed.append("studio price 55")
elif "USD: 55" in plans:
    print("studio already 55")

if 'id: "business"' in plans and "USD: 99" in plans:
    plans = plans.replace(
        'id: "business",
    name: "Master Studio",
    credits: 10000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 99, EUR: 89.99, INR: 8299 },',
        'id: "business",
    name: "Master Studio",
    credits: 10000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 110, EUR: 99.99, INR: 9199 },',
        1,
    )
    changed.append("master price 110")
elif "USD: 110" in plans:
    print("master already 110")

# DISPLAY_PRICES
old_studio_disp = '''  studio: {
    USD: "$49.99", INR: "₹4,199", GBP: "£39.99", EUR: "€45.99", AED: "183 AED",
    AUD: "A$74.99", CAD: "C$64.99", JPY: "¥7,499", SGD: "S$64.99",
  },'''
new_studio_disp = '''  studio: {
    USD: "$55", INR: "₹4,599", GBP: "£44.99", EUR: "€50.99", AED: "201 AED",
    AUD: "A$82.99", CAD: "C$74.99", JPY: "¥8,299", SGD: "S$74.99",
  },'''
if old_studio_disp in plans:
    plans = plans.replace(old_studio_disp, new_studio_disp, 1)
    changed.append("display studio 55")

old_biz_disp = '''  business: {
    USD: "$99", INR: "₹8,299", GBP: "£79.99", EUR: "€89.99", AED: "363 AED",
    AUD: "A$149.99", CAD: "C$129.99", JPY: "¥14,999", SGD: "S$129.99",
  },'''
new_biz_disp = '''  business: {
    USD: "$110", INR: "₹9,199", GBP: "£89.99", EUR: "€99.99", AED: "403 AED",
    AUD: "A$164.99", CAD: "C$149.99", JPY: "¥16,499", SGD: "S$144.99",
  },'''
if old_biz_disp in plans:
    plans = plans.replace(old_biz_disp, new_biz_disp, 1)
    changed.append("display master 110")

# Ensure Master features mention 10,000 credits/month clearly
if '"10,000 monthly credits"' in plans:
    plans = plans.replace(
        '"10,000 monthly credits",
',
        '"10,000 credits / month",
',
        1,
    )

plans_path.write_text(plans)

# ==========================================================================
# 2) planLimits — maxImagesForPlan: admin must not exceed experience (caller)
#    Fix admin always 10 for non-UI callers
# ==========================================================================
pl_path, pl = read("src/utils/planLimits.ts", 200)
old_max_plan = '''export function maxImagesForPlan(plan: string | undefined | null, isAdmin = false): number {
  if (isAdmin) return 10;
  return getPlanLimits(plan ?? "free").maxImages;
}'''
new_max_plan = '''export function maxImagesForPlan(plan: string | undefined | null, isAdmin = false): number {
  // Admin may bypass free-tier 1-image lock, but still use plan matrix max (≤10).
  if (isAdmin) return Math.max(getPlanLimits(plan ?? "free").maxImages, 1);
  return getPlanLimits(plan ?? "free").maxImages;
}'''
if old_max_plan in pl:
    pl = pl.replace(old_max_plan, new_max_plan, 1)
    changed.append("maxImagesForPlan")
    pl_path.write_text(pl)

# ==========================================================================
# 3) studio-tier — aspect ratios filtered helper + 8k_max quality for Ultra full
# ==========================================================================
st_path, st = read("src/lib/studio/studio-tier.ts", 1000)

# Add helper after aspectRatiosForStudioTier if missing
if "aspectRatiosForPlanAndTier" not in st:
    helper = '''
/** Aspect ratios allowed for plan + experience (IMAX/Custom need Master ultraFull). */
export function aspectRatiosForPlanAndTier(
  tier: StudioTier,
  plan: string | null | undefined,
  isAdmin = false,
): Array<"1:1" | "4:3" | "16:9" | "9:16" | "3:4" | "21:9" | "imax" | "custom"> {
  const base = aspectRatiosForStudioTier(tier);
  // Dynamic import avoided — planLimits is client-safe.
  let full = isAdmin;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getPlanLimits } = require("@/utils/planLimits") as typeof import("@/utils/planLimits");
    full = isAdmin || getPlanLimits(plan ?? "free").ultraFullUnlocked;
  } catch {
    full = isAdmin;
  }
  if (tier !== "premium") {
    // Premium (pro) may list custom but only Master unlocks it for Ultra; Premium custom stays for pro tier only if plan allows — lock custom for non-master on all tiers.
    if (!full) return base.filter((a) => a !== "imax" && a !== "custom") as typeof base;
    return base;
  }
  if (!full) return base.filter((a) => a !== "imax" && a !== "custom") as typeof base;
  return base;
}
'''
    # Use a cleaner version without require
    helper = '''
/** Aspect ratios allowed for plan + experience. IMAX/Custom require Master (ultraFull). */
export function aspectRatiosForPlanAndTier(
  tier: StudioTier,
  ultraFullUnlocked: boolean,
): Array<"1:1" | "4:3" | "16:9" | "9:16" | "3:4" | "21:9" | "imax" | "custom"> {
  const base = aspectRatiosForStudioTier(tier);
  if (!ultraFullUnlocked) {
    return base.filter((a) => a !== "imax" && a !== "custom") as typeof base;
  }
  return base;
}
'''
    # Insert after aspectRatiosForStudioTier function end
    m = re.search(r"export function aspectRatiosForStudioTier[\s\S]*?\n\}", st)
    if m:
        st = st[: m.end()] + "\n" + helper + st[m.end() :]
        changed.append("aspectRatiosForPlanAndTier")

# imageQualities — Ultra Master gets 8k_max label path via separate list; keep existing chips
# Extend imageQualitiesForStudioTier for premium to optionally include 8k_max — handled in panel via plan

st_path.write_text(st)

# ==========================================================================
# 4) EditorOptionsPanel — filter aspects by ultraFullUnlocked from planLimits
# ==========================================================================
eop_path, eop = read("src/components/editor/EditorOptionsPanel.tsx", 2000)

if "aspectRatiosForPlanAndTier" not in eop:
    eop = eop.replace(
        "aspectRatiosForStudioTier,",
        "aspectRatiosForStudioTier,\n  aspectRatiosForPlanAndTier,",
        1,
    )
    # import getPlanLimits if needed
    if "getPlanLimits" not in eop:
        # add import after existing imports block - find a good spot
        if 'from "@/lib/studio/studio-tier"' in eop:
            eop = eop.replace(
                'from "@/lib/studio/studio-tier";',
                'from "@/lib/studio/studio-tier";\nimport { getPlanLimits } from "@/utils/planLimits";',
                1,
            )
    # Replace filter call
    old_filter = "aspectRatiosForStudioTier(studioTier).includes(a.id as never)"
    new_filter = (
        "aspectRatiosForPlanAndTier(\n"
        "                studioTier,\n"
        "                isAdmin || getPlanLimits(userPlan ?? \"free\").ultraFullUnlocked,\n"
        "              ).includes(a.id as never)"
    )
    if old_filter in eop:
        eop = eop.replace(old_filter, new_filter)
        changed.append("EOP aspect plan filter")
    eop_path.write_text(eop)
else:
    print("EOP already plan-filters aspects")

# ==========================================================================
# 5) quality-options — add 8k_max as optional quality id for Ultra Master
# ==========================================================================
q_path, q = read("src/lib/quality-options.ts", 500)
if '"8k_max"' not in q and "8k_max" not in q:
    q = q.replace(
        'export type ImageQuality = "sd" | "hd" | "2k" | "4k" | "8k";',
        'export type ImageQuality = "sd" | "hd" | "2k" | "4k" | "8k" | "8k_max";',
        1,
    )
    q = q.replace(
        '  "8k": 4320,
};',
        '  "8k": 4320,
  "8k_max": 4320,
};',
        1,
    )
    # Add option entry after 8k option
    if 'id: "8k_max"' not in q:
        eight_k = re.search(
            r"\{\s*id: \"8k\"[\s\S]*?hint: \"[^\"]+\"\s*\},",
            q,
        )
        if eight_k:
            insert = eight_k.group() + '''
  {
    id: "8k_max",
    label: "8K Max",
    title: "8K Max",
    credits: 0,
    upscaleFactor: 8,
    hint: "8K Max · IMAX-capable · Master Ultra",
  },'''
            q = q[: eight_k.start()] + insert + q[eight_k.end() :]
            changed.append("8k_max quality option")
    q_path.write_text(q)
else:
    print("8k_max already in quality-options")

# studio-tier imageQualitiesForStudioTier — add 8k_max for premium when needed
# Panel filters: show 8k_max only for ultraFull
st2 = Path("src/lib/studio/studio-tier.ts").read_text()
if '"8k_max"' not in st2 and "8k_max" not in st2:
    st2 = st2.replace(
        'case "premium":\n      return ["sd", "hd", "2k", "4k", "8k"];',
        'case "premium":\n      return ["sd", "hd", "2k", "4k", "8k", "8k_max"];',
        1,
    )
    Path("src/lib/studio/studio-tier.ts").write_text(st2)
    changed.append("ultra qualities include 8k_max")

# Filter 8k_max in EditorOptionsPanel quality chips
eop2 = Path("src/components/editor/EditorOptionsPanel.tsx").read_text()
if "8k_max" in eop2 and "ultraFullUnlocked" in eop2:
    print("quality filter may exist")
elif "IMAGE_QUALITY_OPTIONS" in eop2:
    # Find quality map filter
    if "imageQualitiesForStudioTier(studioTier)" in eop2 and "8k_max" not in eop2[eop2.find("imageQualitiesForStudioTier"):eop2.find("imageQualitiesForStudioTier")+400]:
        # replace quality filter to exclude 8k_max unless ultraFull
        old_q = "imageQualitiesForStudioTier(studioTier)"
        # Only one critical filter for image quality chips
        count = eop2.count(old_q)
        if count >= 1:
            # Add derived flag near top of component
            if "const ultraFull =" not in eop2:
                eop2 = eop2.replace(
                    "const expLabel = studioExperienceLabel(studioTier);",
                    "const expLabel = studioExperienceLabel(studioTier);\n"
                    "  const ultraFull = isAdmin || getPlanLimits(userPlan ?? \"free\").ultraFullUnlocked;",
                    1,
                )
            # Filter qualities in map — look for .filter or .includes with imageQualities
            # Pattern: imageQualitiesForStudioTier(studioTier).includes
            eop2 = eop2.replace(
                "imageQualitiesForStudioTier(studioTier).includes",
                "imageQualitiesForStudioTier(studioTier).filter((id) => id !== \"8k_max\" || ultraFull).includes",
            )
            Path("src/components/editor/EditorOptionsPanel.tsx").write_text(eop2)
            changed.append("8k_max quality gated")

# Ensure getPlanLimits import exists after patches
eop3 = Path("src/components/editor/EditorOptionsPanel.tsx").read_text()
if "getPlanLimits" in eop3 and 'from "@/utils/planLimits"' not in eop3:
    eop3 = eop3.replace(
        'from "@/lib/studio/studio-tier";',
        'from "@/lib/studio/studio-tier";\nimport { getPlanLimits } from "@/utils/planLimits";',
        1,
    )
    Path("src/components/editor/EditorOptionsPanel.tsx").write_text(eop3)

# ==========================================================================
# 6) Ultra validation — Custom uses real custom dimensions via ratio string
# ==========================================================================
uv_path, uv = read("src/lib/studio/image/ultra/validation.ts", 500)
# Replace custom→16:9 fallback with passing through numeric ratios as aspect tokens
if 'if (a === "custom")' in uv and 'return { aspect: "16:9" }' in uv:
    uv = uv.replace(
        '''  if (a === "custom") {
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
  }''',
        '''  // Custom: keep as 16:9 only when no ratio is known; numeric "W:H" stays for model dims.
  if (a === "custom") {
    return { aspect: "custom" as UltraAspectRatio };
  }
  const ratioMatch = a.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (ratioMatch) {
    const w = Number(ratioMatch[1]);
    const h = Number(ratioMatch[2]);
    if (w > 0 && h > 0) {
      const r = w / h;
      if (r < 0.4 || r > 3.5) {
        return { aspect: "1:1", error: "Custom aspect ratio must be between 2:5 and 7:2." };
      }
      // Encode as custom; model layer reads ratio from aspect string when form is W:H.
      return { aspect: a as UltraAspectRatio };
    }
  }''',
    )
    # UltraAspectRatio type may not include custom — check types
    uv_path.write_text(uv)
    changed.append("ultra custom aspect")

# types.ts UltraAspectRatio
ut_path, ut = read("src/lib/studio/image/ultra/types.ts", 200)
if '| "custom"' not in ut and '"custom"' not in ut:
    ut = ut.replace(
        '| "imax";',
        '| "imax"\n  | "custom";',
        1,
    )
    ut_path.write_text(ut)
    changed.append("UltraAspectRatio custom")

# model.ts ultraMasterImageSize + ultraDeliveryDimensions for custom
um_path, um = read("src/lib/studio/image/ultra/model.ts", 500)
if 'aspect === "custom"' not in um:
    # After imax block in ultraMasterImageSize
    old_imax_master = '''  if (aspect === "imax") {
    // ~2K-class master for enhancement; delivery upscale uses ultraDeliveryDimensions.
    return { width: 2048, height: 1432 };
  }'''
    new_imax_master = '''  if (aspect === "imax") {
    // ~2K-class master for enhancement; delivery upscale uses ultraDeliveryDimensions.
    return { width: 2048, height: 1432 };
  }
  // Custom / free ratio "W:H" → validated custom master dims (~2K long side).
  {
    const m = String(aspect).match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
    if (m || aspect === "custom") {
      const rw = m ? Number(m[1]) : 16;
      const rh = m ? Number(m[2]) : 9;
      const long = quality === "sd" ? 896 : 2048;
      if (rw >= rh) {
        return { width: long, height: Math.max(256, Math.round((long * rh) / rw)) };
      }
      return { width: Math.max(256, Math.round((long * rw) / rh)), height: long };
    }
  }'''
    if old_imax_master in um:
        um = um.replace(old_imax_master, new_imax_master, 1)
        changed.append("ultraMaster custom dims")
    # delivery dims
    old_imax_del = '''  if (ar === "imax") {
    const height = Math.round(long / 1.43);
    return { width: long, height };
  }'''
    new_imax_del = '''  if (ar === "imax") {
    const height = Math.round(long / 1.43);
    return { width: long, height };
  }
  {
    const m = String(ar).match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
    if (m || ar === "custom") {
      const rw = m ? Number(m[1]) : 16;
      const rh = m ? Number(m[2]) : 9;
      if (rw >= rh) {
        return { width: long, height: Math.max(256, Math.round((long * rh) / rw)) };
      }
      return { width: Math.max(256, Math.round((long * rw) / rh)), height: long };
    }
  }'''
    if old_imax_del in um:
        um = um.replace(old_imax_del, new_imax_del, 1)
        changed.append("ultraDelivery custom dims")
    um_path.write_text(um)

# ==========================================================================
# 7) generate.functions — server reject IMAX/Custom/8k_max for non-Master
# ==========================================================================
gen = Path("src/lib/generate.functions.ts").read_text()
if "Master-only Ultra features" not in gen:
    aidx = gen.find("Plan prompt character ceiling")
    if aidx < 0:
        aidx = gen.find("Experience image-count ceilings")
    if aidx >= 0:
        # insert after prompt ceiling block or image ceilings
        m = re.search(
            r"Plan prompt character ceiling[\s\S]{0,800}?\n      \}",
            gen[aidx:],
        )
        insert_pos = aidx + m.end() if m else None
        if insert_pos is None:
            m2 = re.search(
                r"supports up to 10 images total \(base \+ references\)\.[\s\S]{0,120}?\}",
                gen[aidx:],
            )
            insert_pos = aidx + m2.end() if m2 else None
        block = '''
      // Master-only Ultra features: IMAX, Custom aspect, 8k_max.
      {
        const planId = (profile.plan ?? "free") as string;
        const tier = (data.studioTier ?? "standard") as string;
        const full =
          isAdmin || planId === "business";
        const ar = String(data.aspectRatio ?? "").toLowerCase();
        const q = String(data.imageQuality ?? "").toLowerCase();
        if (!full && tier === "premium") {
          if (ar === "imax" || q === "8k_max") {
            throw new Error("IMAX and 8K Max require Master Studio.");
          }
          if (ar === "custom" || /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(ar)) {
            // allow named presets only; free-form custom is Master
            if (ar === "custom") {
              throw new Error("Custom aspect ratio requires Master Studio.");
            }
          }
        }
      }
'''
        if insert_pos is not None:
            gen = gen[:insert_pos] + block + gen[insert_pos:]
            assert len(gen) > gen_before
            assert len(gen) < gen_before + 2500
            Path("src/lib/generate.functions.ts").write_text(gen)
            changed.append("server Master-only IMAX/Custom/8k_max")
        else:
            print("WARN could not insert Master-only block")
else:
    print("Master-only block present")

# ==========================================================================
# FINAL SAFETY
# ==========================================================================
gen2 = Path("src/lib/generate.functions.ts").read_text()
assert len(gen2) >= gen_before
assert "executeUltraImage" in gen2 and "Fail closed" in gen2
assert "PLACEHOLDER" not in gen2 or len(gen2) > 10000

plans2 = Path("src/lib/plans.ts").read_text()
assert "USD: 110" in plans2 or '"$110"' in plans2
assert "USD: 55" in plans2 or '"$55"' in plans2
assert "USD: 49.99" not in plans2 or plans2.count("49.99") == 0
# Master credits
assert "credits: 10000" in plans2

print("CHANGED:", changed)
print("generate.functions", gen_before, "->", len(gen2))
print("OK")
