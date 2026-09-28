#!/usr/bin/env python3
"""Final Image Studio audit fixes — surgical only. Never shrink generate.functions.ts."""
from pathlib import Path
import re

changed = []

def read(p, min_len=50):
    path = Path(p)
    t = path.read_text()
    assert len(t) >= min_len, f"{p} too small: {len(t)}"
    return path, t

# ---------------------------------------------------------------------------
# SAFETY GATE
# ---------------------------------------------------------------------------
gen_path, gen = read("src/lib/generate.functions.ts", 20000)
gen_before = len(gen)
assert "executeUltraImage" in gen and "Fail closed" in gen
assert "executeStandardImage" in gen and "executePremiumImage" in gen

# ---------------------------------------------------------------------------
# 1) StudioBackLink — circular glass, icon only (no Home text)
# ---------------------------------------------------------------------------
bl_path, bl = read("src/components/StudioBackLink.tsx", 200)
new_bl = '''import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Back to homepage — focused studio pages exit to Home. Icon-only circular glass control. */
export function StudioBackLink({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Back to Home"
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        "border border-border/60 bg-background/50 text-muted-foreground shadow-sm backdrop-blur-md",
        "transition-colors hover:border-[#FF5A1F]/40 hover:bg-[#FF5A1F]/10 hover:text-[#FF5A1F]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/35",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
    </Link>
  );
}
'''
if "aria-label=\"Back to Home\"" not in bl or "Home\n    </Link>" in bl or ">\n      Home" in bl:
    bl_path.write_text(new_bl)
    changed.append("StudioBackLink glass icon")
else:
    # still rewrite to glass circle if not already
    if "rounded-full" not in bl or "Home" in bl.split("aria-label")[0]:
        bl_path.write_text(new_bl)
        changed.append("StudioBackLink glass icon")
    else:
        print("StudioBackLink already icon-only glass")

# ---------------------------------------------------------------------------
# 2) ImageEditor — header divider + trim gallery on tier change + safe upload
# ---------------------------------------------------------------------------
ie_path, ie = read("src/components/editor/image/ImageEditor.tsx", 20000)

# Header: add subtle bottom border under header row if missing
# Find the outer header wrapper near StudioBackLink
if 'StudioBackLink className="shrink-0"' in ie:
    # Ensure header block has border-b
    # Look for the animate-fade-in header container
    old_hdr = 'className="animate-fade-in"'
    # More specific: the flex row containing StudioBackLink parent
    # Add border under the header section after the title row closes
    pass

# Add useEffect to trim gallery when effectiveMaxImages shrinks (tier/plan change)
trim_effect = '''
  // Keep gallery within the active experience + plan ceiling (prevents Standard 5-cap overflow crash).
  useEffect(() => {
    if (gallery.length <= effectiveMaxImages) return;
    setGallery((prev) => prev.slice(0, effectiveMaxImages));
    setActiveImage((idx) => Math.min(idx, Math.max(0, effectiveMaxImages - 1)));
    toast.message(`Showing up to ${effectiveMaxImages} images for this experience.`);
  }, [effectiveMaxImages]); // eslint-disable-line react-hooks/exhaustive-deps
'''

if "Keep gallery within the active experience" not in ie:
    # Insert after effectiveMaxImages definition block
    marker = "const effectiveMaxImages = isAdmin"
    idx = ie.find(marker)
    if idx < 0:
        raise SystemExit("effectiveMaxImages not found")
    # find end of statement
    end = ie.find(";", idx)
    # may be multi-line ternary — find the closing of the assignment
    # Look for next blank line after experienceMax / effectiveMaxImages block
    block_end = ie.find("\n\n", end)
    if block_end < 0:
        block_end = end + 1
    ie = ie[:block_end] + "\n" + trim_effect + ie[block_end:]
    changed.append("gallery trim on max change")

# Harden file accept path: wrap Promise.all in try/catch if not present
if "accepted.map(async (f)" in ie and "Failed to read one or more images" not in ie:
    old_map = '''    const items: GalleryItem[] = await Promise.all(
      accepted.map(async (f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        preview: URL.'''
    # Find fuller block and wrap — use simpler approach: add try/catch around the await Promise.all region
    start = ie.find("const items: GalleryItem[] = await Promise.all")
    if start > 0:
        # Find the end of Promise.all(...);
        depth = 0
        i = start
        found = False
        while i < len(ie):
            if ie[i:i+12] == "Promise.all(":
                depth = 1
                i += 12
                continue
            if depth:
                if ie[i] == "(":
                    depth += 1
                elif ie[i] == ")":
                    depth -= 1
                    if depth == 0:
                        # expect );
                        end = i + 1
                        if ie[end] == ";":
                            end += 1
                        found = True
                        break
            i += 1
        if found:
            block = ie[start:end]
            wrapped = (
                "    let items: GalleryItem[] = [];\n"
                "    try {\n"
                + "    " + block.replace("const items: GalleryItem[] = ", "items = ")
                + "\n    } catch {\n"
                "      toast.error(\"Could not read one or more images. Try fewer or smaller files.\");\n"
                "      return;\n"
                "    }\n"
            )
            ie = ie[:start] + wrapped + ie[end:]
            changed.append("safe gallery read try/catch")

# Header subtle divider: find header outer wrapper
# Search for pattern after header flex row
if "studio-header-divider" not in ie:
    # After the closing of the header title flex, before main controls
    # Look for StudioBackLink section parent closing
    # Common pattern: </div> after tier menu then more content
    # Insert border-b on the header container that holds StudioBackLink
    ie2 = ie.replace(
        'className="flex min-w-0 items-center gap-2 sm:gap-3"',
        'className="flex min-w-0 items-center gap-2 sm:gap-3"',
        1,
    )
    # Find the header section wrapper — often <div className="... mb-..">
    # Add a thin divider element after the header row block
    needle = '<StudioBackLink className="shrink-0" />'
    # Find enclosing header — add border-b to a parent
    # Simpler: after the header block that contains StudioBackLink, inject divider
    # Find "studio-image-icon" section end — after tier dropdown area there's often a closing </div></div>
    # Use: replace first occurrence of a known pattern after header
    # Look for New button / credits row nearby
    hdr_marker = "studio-image-icon"
    hidx = ie.find(hdr_marker)
    if hidx > 0:
        # Find the outer wrapper opening before StudioBackLink
        back = ie.rfind("<div", 0, ie.find("StudioBackLink"))
        # Find className of that div
        cls_end = ie.find(">", back)
        opening = ie[back:cls_end+1]
        if "border-b" not in opening and "studio-header" not in opening:
            # Add classes to the parent flex container of StudioBackLink
            parent_start = ie.rfind("className=", 0, ie.find("StudioBackLink"))
            # Get the className string
            q = ie[parent_start+len("className="):parent_start+len("className=")+1]
            # Actually inject a divider sibling after the whole header card
            # Search for pattern: closing of header + next section
            pass

    # Reliable approach: add border-b to the header outer element that has animate-fade-in near StudioBackLink
    region_start = max(0, ie.find("StudioBackLink") - 400)
    region = ie[region_start:ie.find("StudioBackLink") + 50]
    # Find className in that region that wraps the row
    m = re.search(r'className="([^\"]*flex[^\"]*items-center[^\"]*)"', region)
    if m and "border-b" not in m.group(1):
        old_cls = m.group(0)
        new_cls = old_cls[:-1] + ' border-b border-border/40 pb-3 mb-1"'
        # Only replace first occurrence in the header region
        ie = ie[:region_start] + region.replace(old_cls, new_cls, 1) + ie[ie.find("StudioBackLink") + 50:]
        changed.append("header subtle divider")

ie_path.write_text(ie)

# ---------------------------------------------------------------------------
# 3) planLimits — align with product matrix (usage caps)
# ---------------------------------------------------------------------------
pl_path, pl = read("src/utils/planLimits.ts", 200)
new_pl = '''// Plan-based capability limits for multi-image upload and features.
import type { PlanId } from "@/lib/plans";

export type PlanLimits = {
  /** Max concurrent gallery images (base + references). */
  maxImages: number;
  /** Max prompt characters (frontend + server should agree). */
  maxPromptChars: number;
  videoEnabled: boolean;
  hd: boolean;
  /** Premium (pro internal) experience unlocked */
  premiumUnlocked: boolean;
  /** Ultra AI (premium internal) experience unlocked */
  ultraUnlocked: boolean;
  /** IMAX + 8k_max + Custom aspect (Master-level Ultra) */
  ultraFullUnlocked: boolean;
};

/**
 * Product matrix (access only — does not change AI edit quality or credit prices).
 *
 * Lite:   Standard only · up to 5 images · 2000 chars
 * Plus:   Standard only · up to 10 images · 4000 chars
 * Pro:    Standard + Premium · up to 10 · 6000 chars
 * Studio: + Ultra (restricted) · up to 10 · 6000 chars · IMAX/Custom locked
 * Master: full Ultra · up to 10 · UI unlimited / backend ~7000
 */
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxImages: 1,
    maxPromptChars: 2000,
    videoEnabled: false,
    hd: false,
    premiumUnlocked: false,
    ultraUnlocked: false,
    ultraFullUnlocked: false,
  },
  lite: {
    maxImages: 5,
    maxPromptChars: 2000,
    videoEnabled: true,
    hd: false,
    premiumUnlocked: false,
    ultraUnlocked: false,
    ultraFullUnlocked: false,
  },
  plus: {
    maxImages: 10,
    maxPromptChars: 4000,
    videoEnabled: true,
    hd: false,
    premiumUnlocked: false,
    ultraUnlocked: false,
    ultraFullUnlocked: false,
  },
  pro: {
    maxImages: 10,
    maxPromptChars: 6000,
    videoEnabled: true,
    hd: true,
    premiumUnlocked: true,
    ultraUnlocked: false,
    ultraFullUnlocked: false,
  },
  studio: {
    maxImages: 10,
    maxPromptChars: 6000,
    videoEnabled: true,
    hd: true,
    premiumUnlocked: true,
    ultraUnlocked: true,
    ultraFullUnlocked: false, // IMAX / Custom / 8k_max locked for Studio
  },
  business: {
    maxImages: 10,
    maxPromptChars: 7000,
    videoEnabled: true,
    hd: true,
    premiumUnlocked: true,
    ultraUnlocked: true,
    ultraFullUnlocked: true,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanId] ?? PLAN_LIMITS.free;
}

/** Free (and unknown) plans cannot use multi-image. */
export function isMultiImageLocked(plan: string | undefined | null, isAdmin = false): boolean {
  if (isAdmin) return false;
  return getPlanLimits(plan ?? "free").maxImages <= 1;
}

/** Max concurrent gallery / reference images for this plan. */
export function maxImagesForPlan(plan: string | undefined | null, isAdmin = false): number {
  if (isAdmin) return 10;
  return getPlanLimits(plan ?? "free").maxImages;
}

export function maxPromptCharsForPlan(plan: string | undefined | null, isAdmin = false): number {
  if (isAdmin) return 7000;
  return getPlanLimits(plan ?? "free").maxPromptChars;
}

export const MULTI_IMAGE_UPGRADE_MESSAGE =
  "Multi-image editing is available on paid plans. Upgrade your plan to use multiple images.";
'''
pl_path.write_text(new_pl)
changed.append("planLimits matrix")

# ---------------------------------------------------------------------------
# 4) generate.functions.ts — SURGICAL: enforce image-count by studioTier
#    Insert only a small validation block; never replace the file.
# ---------------------------------------------------------------------------
# After free multi-ref rejection, add tier total-image caps.
# Standard: max 5 total (base + refs) — matches handler
# Premium multi: max 10 total
# Ultra multi: max 10 total

cap_block = '''
      // Experience image-count ceilings (server authoritative — do not trust client).
      {
        const tier = (data.studioTier ?? "standard") as string;
        const primary = typeof data.imageUrl === "string" && data.imageUrl.startsWith("https://") ? 1 : 0;
        const refs = (data.referenceImageUrls ?? []).filter(
          (u) => typeof u === "string" && u.startsWith("https://"),
        );
        const total = primary + refs.length;
        if (tier === "standard" && total > 5) {
          throw new Error("Standard supports up to 5 images total (base + references).");
        }
        if ((tier === "pro" || tier === "premium") && total > 10) {
          throw new Error("This experience supports up to 10 images total (base + references).");
        }
      }
'''

if "Experience image-count ceilings" not in gen:
    anchor = 'Multiple reference images require a paid plan. Upgrade to unlock multi-image generation."'
    aidx = gen.find(anchor)
    if aidx < 0:
        print("WARN: free multi anchor not found — skip server image-count insert")
    else:
        # Insert after the free multi-ref closing braces
        # Find the end of the free block after anchor
        close = gen.find("}", gen.find("}", aidx) + 1)
        # After free plan block there is typically another closing for type===image
        # Insert right after the free multi if block's closing
        # Safer: insert immediately after the throw's closing of the free refs check
        insert_at = gen.find("\n", aidx)
        # Walk to after the free plan if-block
        # Pattern: after `      }\n    }` following the free multi check
        rest = gen[aidx:]
        # Find `\n    }\n` that closes the free plan check inside image type
        m = re.search(r'Upgrade to unlock multi-image generation\."\s*,?\s*\);\s*\}\s*\}', rest)
        if m:
            insert_pos = aidx + m.end()
            gen = gen[:insert_pos] + "\n" + cap_block + gen[insert_pos:]
            # size safety
            assert len(gen) > gen_before, "generate.functions shrank"
            assert len(gen) < gen_before + 2500, "generate.functions grew too much"
            gen_path.write_text(gen)
            changed.append("server image-count ceilings")
        else:
            print("WARN: could not locate insert point for image-count ceilings")
else:
    print("server image-count ceilings already present")

# ---------------------------------------------------------------------------
# 5) Carousel — ensure no extra white space
# ---------------------------------------------------------------------------
car_path, car = read("src/components/editor/image/ImageStudioWeeklyCarousel.tsx", 500)
car2 = car
if "pb-0" not in car2 and "pb-1" in car2:
    car2 = car2.replace("pb-1", "pb-0")
if 'className="overflow-hidden"' in car2:
    car2 = car2.replace(
        'className="overflow-hidden"',
        'className="overflow-hidden leading-none"',
        1,
    )
if car2 != car:
    car_path.write_text(car2)
    changed.append("carousel spacing")

# ---------------------------------------------------------------------------
# FINAL SAFETY
# ---------------------------------------------------------------------------
gen2 = Path("src/lib/generate.functions.ts").read_text()
assert len(gen2) >= gen_before
assert "executeUltraImage" in gen2 and "Fail closed" in gen2
assert "executeStandardImage" in gen2
assert "PLACEHOLDER" not in gen2 or len(gen2) > 10000

ie2 = Path("src/components/editor/image/ImageEditor.tsx").read_text()
assert len(ie2) > 20000
assert "ImageStudioWeeklyCarousel" in ie2

bl2 = Path("src/components/StudioBackLink.tsx").read_text()
assert "Home" not in bl2 or "Back to Home" in bl2  # only aria-label allowed
assert "rounded-full" in bl2

print("CHANGED:", changed)
print("generate.functions bytes", len(gen2), "(was", gen_before, ")")
print("OK")
