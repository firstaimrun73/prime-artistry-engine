/** Per-lens recipe switch — stronger visible optical identity per lens */
import type { LensAspectId } from "./roster";
import { cropToAspect, grade, teleCrop } from "./opt-core";
import { radialMap, fisheye360, sharpen } from "./opt-warp";
import { portraitBloom, dreamSoft, glowMist, vintage, infrared, microReveal } from "./opt-fx1";
import { tiltShift, prismEcho, starflare, radialBokeh, architectAlign } from "./opt-fx2";

export function applyLensById(
  source: HTMLCanvasElement,
  lensId: string,
  aspectId: LensAspectId = "native",
): HTMLCanvasElement {
  const base = cropToAspect(source, aspectId);
  switch (lensId) {
    case "lens_perspective_stretch":
      return grade(radialMap(base, 1.38), "contrast(1.22) saturate(1.18) brightness(1.03)");
    case "lens_fisheye_orbit":
      return grade(fisheye360(base), "contrast(1.28) saturate(1.22) brightness(1.03)");
    case "lens_ultrawide_horizon":
      return grade(radialMap(base, 1.28), "contrast(1.2) saturate(1.22) brightness(1.04)");
    case "lens_portrait_bloom":
      return portraitBloom(base);
    case "lens_natural_frame":
      return grade(sharpen(base, 0.65), "contrast(1.1) saturate(1.08) brightness(1.03)");
    case "lens_cinematic_compress":
      return grade(sharpen(teleCrop(base, 2.35), 1.4), "contrast(1.35) saturate(1.3) brightness(1.04)");
    case "lens_dreamsoft":
      return dreamSoft(base);
    case "lens_widevista":
      return grade(radialMap(base, 1.22), "contrast(1.18) saturate(1.15) brightness(1.03)");
    case "lens_farreach":
      return grade(sharpen(teleCrop(base, 3.2), 1.55), "contrast(1.3) saturate(1.12) brightness(1.02)");
    case "lens_microreveal":
      return microReveal(base);
    case "lens_miniature_shift":
      return tiltShift(base);
    case "lens_glowmist":
      return glowMist(base);
    case "lens_vintage_halation":
      return vintage(base);
    case "lens_infraglow":
      return infrared(base);
    case "lens_longglass_detail":
      return grade(sharpen(teleCrop(base, 1.85), 2.1), "contrast(1.35) saturate(1.15) brightness(1.03)");
    case "lens_prism_echo":
      return prismEcho(base);
    case "lens_swirl_depth":
      return grade(radialBokeh(radialMap(base, 0.72), 0.95), "contrast(1.2) saturate(1.22)");
    case "lens_architect_align":
      return architectAlign(base);
    case "lens_starflare":
      return starflare(base);
    case "lens_selective_focus":
      return radialBokeh(grade(base, "contrast(1.14) saturate(1.08)"), 1.05);
    default:
      return grade(sharpen(base, 1.0), "contrast(1.12)");
  }
}
