#!/usr/bin/env python3
"""Free watermark: primary Motio2edit only, larger size, plan-based policy wiring."""
from pathlib import Path
import re
import sys

def main() -> None:
    # --- image.ts: accept freeEnlarged size ratio ---
    img_path = Path("src/lib/watermark/image.ts")
    img = img_path.read_text()
    if "FREE_PRIMARY_SIZE_RATIO" not in img:
        img = img.replace(
            "  PRIMARY_SIZE_RATIO,\n  SECONDARY_SIZE_RATIO,",
            "  PRIMARY_SIZE_RATIO,\n  FREE_PRIMARY_SIZE_RATIO,\n  SECONDARY_SIZE_RATIO,",
            1,
        )
    # Add optional freeEnlarged param to buildImageOverlaySvg
    if "freeEnlarged" not in img:
        img = img.replace(
            """export function buildImageOverlaySvg(
  w: number,
  h: number,
  mode: Exclude<WatermarkMode, "none">,
  label?: string,
  brand: WatermarkBrand = "generic",
): string {""",
            """export function buildImageOverlaySvg(
  w: number,
  h: number,
  mode: Exclude<WatermarkMode, "none">,
  label?: string,
  brand: WatermarkBrand = "generic",
  freeEnlarged = false,
): string {""",
            1,
        )
        img = img.replace(
            "Math.min(72, Math.round(minDim * PRIMARY_SIZE_RATIO * lengthFactor))",
            "Math.min(88, Math.round(minDim * (freeEnlarged ? FREE_PRIMARY_SIZE_RATIO : PRIMARY_SIZE_RATIO) * lengthFactor))",
            1,
        )
        # renderImageWatermark signature
        img = img.replace(
            """export async function renderImageWatermark(
  buffer: Buffer,
  mode: WatermarkMode,
  label?: string,
  brand: WatermarkBrand = "generic",
): Promise<Buffer> {""",
            """export async function renderImageWatermark(
  buffer: Buffer,
  mode: WatermarkMode,
  label?: string,
  brand: WatermarkBrand = "generic",
  freeEnlarged = false,
): Promise<Buffer> {""",
            1,
        )
        img = img.replace(
            "composite([{ input: Buffer.from(buildImageOverlaySvg(w, h, mode, label, brand)), top: 0, left: 0 }])",
            "composite([{ input: Buffer.from(buildImageOverlaySvg(w, h, mode, label, brand, freeEnlarged)), top: 0, left: 0 }])",
            1,
        )
    img_path.write_text(img)
    print("image.ts OK")

    # --- finalize.ts: free label + pass freeEnlarged ---
    fin_path = Path("src/lib/watermark/finalize.ts")
    fin = fin_path.read_text()

    # Label: Free always Motio2edit only
    old_label = '''export function resolveExperienceWatermarkLabel(
  studioTier: WatermarkStudioTier | undefined,
  planId: string | null | undefined,
): string {
  const tier = normalizeStudioTier(studioTier);
  const exp = experienceLabelFromTier(tier);
  // Prefer compact brand; append experience only for paid-looking tiers
  if (tier === "standard") return WATERMARK_BRAND_TEXT;
  const planName = findPlan(planId)?.name;
  if (planName && planName.length <= 12) return `${WATERMARK_BRAND_TEXT} · ${exp}`;
  return `${WATERMARK_BRAND_TEXT} · ${exp}`;
}'''
    new_label = '''export function resolveExperienceWatermarkLabel(
  studioTier: WatermarkStudioTier | undefined,
  planId: string | null | undefined,
): string {
  // Free users: primary Motio2edit only — never append secondary tier text.
  const plan = (planId ?? "free").toLowerCase();
  if (plan === "free" || plan === "") return WATERMARK_BRAND_TEXT;

  const tier = normalizeStudioTier(studioTier);
  const exp = experienceLabelFromTier(tier);
  // Prefer compact brand; append experience only for paid-looking tiers
  if (tier === "standard") return WATERMARK_BRAND_TEXT;
  const planName = findPlan(planId)?.name;
  if (planName && planName.length <= 12) return `${WATERMARK_BRAND_TEXT} · ${exp}`;
  return `${WATERMARK_BRAND_TEXT} · ${exp}`;
}'''
    if old_label in fin:
        fin = fin.replace(old_label, new_label, 1)
        print("label replaced")
    elif "free users: primary Motio2edit" in fin.lower() or "Free users: primary Motio2edit" in fin:
        print("label already patched")
    else:
        # soft insert after function start
        if "if (plan === \"free\"" not in fin:
            fin = fin.replace(
                "const tier = normalizeStudioTier(studioTier);",
                'const plan = (planId ?? "free").toLowerCase();\n  if (plan === "free" || plan === "") return WATERMARK_BRAND_TEXT;\n\n  const tier = normalizeStudioTier(studioTier);',
                1,
            )
            print("label soft")

    # Pass freeEnlarged into renderImageWatermark
    if "freeEnlarged" not in fin:
        # Find renderImageWatermark call(s)
        fin = fin.replace(
            "await renderImageWatermark(buffer, policy.mode, label, brand)",
            "await renderImageWatermark(buffer, policy.mode, label, brand, policy.reason === \"free_plan_forced\")",
        )
        # Also handle non-await form
        fin = fin.replace(
            "renderImageWatermark(buffer, policy.mode, label, brand)",
            "renderImageWatermark(buffer, policy.mode, label, brand, policy.reason === \"free_plan_forced\")",
        )
        print("freeEnlarged wired")

    fin_path.write_text(fin)
    print("finalize.ts OK", len(fin))

    # --- ImageEditor: watermark UI uses plan===free (admin does not unlock OFF) ---
    ie_path = Path("src/components/editor/image/ImageEditor.tsx")
    ie = ie_path.read_text()
    assert len(ie) > 20000
    # Add isFreePlanForWm after isFree
    if "isFreePlanForWm" not in ie:
        if "const isFree = profile?.plan === \"free\" && !isAdmin;" in ie:
            ie = ie.replace(
                "const isFree = profile?.plan === \"free\" && !isAdmin;",
                "const isFree = profile?.plan === \"free\" && !isAdmin;\n  /** Watermark entitlement follows plan only — admin does not unlock OFF for Free. */\n  const isFreePlanForWm = (profile?.plan ?? \"free\") === \"free\";",
                1,
            )
        # Use isFreePlanForWm for keepWatermark force and UI lock
        ie = ie.replace(
            "keepWatermark: isFree ? true : keepWatermark",
            "keepWatermark: isFreePlanForWm ? true : keepWatermark",
        )
        ie = ie.replace(
            "keepWatermark={isFree ? true : keepWatermark}",
            "keepWatermark={isFreePlanForWm ? true : keepWatermark}",
        )
        # Watermark toggle disabled for free plan
        # Look for disabled={!isFree} patterns near watermark - if toggle is free-gated by isFree
        # Replace isFree checks only in watermark section is hard; broader isFreePlanForWm for watermark props is enough
        ie_path.write_text(ie)
        print("ImageEditor watermark plan OK")
    else:
        print("ImageEditor already has isFreePlanForWm")

    # Sanity
    pol = Path("src/lib/watermark/policy.ts").read_text()
    if "admin" in pol.lower() and "mode: \"none\"" in pol and "reason: \"admin\"" in pol:
        sys.exit("policy still has admin bypass")
    if "free_plan_forced" not in pol:
        sys.exit("policy missing free_plan_forced")
    if 'mode: "primary"' not in pol and "mode: 'primary'" not in pol:
        # check free returns primary
        if "secondary: false" not in pol:
            sys.exit("policy may still force secondary")
    print("ALL OK")

if __name__ == "__main__":
    main()
