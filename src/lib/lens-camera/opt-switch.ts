/** Per-lens recipe switch */
import type { LensAspectId } from "./roster";
import { cropToAspect, grade, teleCrop } from "./opt-core";
import { radialMap, fisheye360, sharpen } from "./opt-warp";
import { portraitBloom, dreamSoft, glowMist, vintage, infrared, microReveal } from "./opt-fx1";
import { tiltShift, prismEcho, starflare, radialBokeh, architectAlign } from "./opt-fx2";

export function applyLensById(source: HTMLCanvasElement, lensId: string, aspectId: LensAspectId = "native"): HTMLCanvasElement {
  const base = cropToAspect(source, aspectId);
  switch (lensId) {
    case "lens_perspective_stretch": return grade(radialMap(base, 1.72), "contrast(1.24) saturate(1.18) brightness(1.03)");
    case "lens_fisheye_orbit": return grade(fisheye360(base), "contrast(1.22) saturate(1.18) brightness(1.02)");
    case "lens_ultrawide_horizon": return grade(radialMap(base, 1.55), "contrast(1.22) saturate(1.3) brightness(1.05)");
    case "lens_portrait_bloom": return portraitBloom(base);
    case "lens_natural_frame": return grade(sharpen(base, 0.45), "contrast(1.07) saturate(1.05) brightness(1.02)");
    case "lens_cinematic_compress": return grade(sharpen(teleCrop(base, 2.1), 1.2), "contrast(1.3) saturate(1.25) brightness(1.05)");
    case "lens_dreamsoft": return dreamSoft(base);
    case "lens_widevista": return grade(radialMap(base, 1.28), "contrast(1.2) saturate(1.18) brightness(1.03)");
    case "lens_farreach": return grade(sharpen(teleCrop(base, 2.9), 1.35), "contrast(1.25) saturate(1.08)");
    case "lens_microreveal": return microReveal(base);
    case "lens_miniature_shift": return tiltShift(base);
    case "lens_glowmist": return glowMist(base);
    case "lens_vintage_halation": return vintage(base);
    case "lens_infraglow": return infrared(base);
    case "lens_longglass_detail": return grade(sharpen(teleCrop(base, 1.6), 1.9), "contrast(1.3) saturate(1.12) brightness(1.02)");
    case "lens_prism_echo": return prismEcho(base);
    case "lens_swirl_depth": return grade(radialMap(base, 0.85), "contrast(1.16) saturate(1.18)");
    case "lens_architect_align": return architectAlign(base);
    case "lens_starflare": return starflare(base);
    case "lens_selective_focus": return radialBokeh(grade(base, "contrast(1.1)"), 0.85);
    default: return grade(sharpen(base, 0.9), "contrast(1.1)");
  }
}
