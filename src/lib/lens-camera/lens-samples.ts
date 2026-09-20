/**
 * Central lens sample catalog — Cloudflare R2 public assets.
 * One unique sample image per roster lens (no shared thumbnails).
 * Mapped by lens ID (not display order) so reordering the carousel cannot mismatch thumbs.
 */
import { CAMERA_LENS_ROSTER, type CameraLensDef } from "@/lib/lens-camera/roster";

const R2_BASE = "https://assets.motio2edit.com/samples/lenses";

/** Ordered R2 files — historically aligned 1:1 with CAMERA_LENS_ROSTER index. */
export const LENS_SAMPLE_FILES = [
  "2Ti7KYKk9HVPvHs5e3i6r_N6dU1tWa.png",
  "6Ki-lTcNz87zct8UjBSh0_3Ut20WQ2.png",
  "A78EaAhUm4bBDSgGqgvBs_ERpBvHNf.png",
  "BUfV6xvuoEoAZxMoZmX0j_fZ2wIm6o.png",
  "FwyhxvcR6FayAiU2QF0Zs_vgYXDNfP.png",
  "nU7HKSpL0hSHpxo4QjMcA_Hk9nuBrR.png",
  "q06meB5ykAHgpv7NksRAe_C9yYepjT.png",
  "uDzaal2Ux-CPMEFChbLs2_FDNUQHm5.png",
  "w-oNvZHkDXRe1S2SGTXyM_BFXl9NPP.png",
  "waZq2LMQxNYjRX5GFVXFF_VbnBVIVp.png",
  "zwBoXi9l15Sp-nvaGWmYs_uq8sWsnc.png",
  "aRTFREPwoQk8yR4cS3xnu_57Ic4l5Q.png",
  "file_0000000036648211a11147abdb3a1dde.png",
  "file_0000000082388211bece0cec48b596af.png",
  "file_00000000ddec8211992532eeaf70cb66.png",
  "IMG_20260909_154319.jpg",
  "IMG_20260909_155520.jpg",
  "IMG_20260909_155611.jpg",
  "IMG_20260909_192251.jpg",
] as const;

/** Explicit lens-id → R2 filename. Built from original roster order so carousel reordering cannot break thumbs. */
export const LENS_SAMPLE_BY_ID: Record<string, string> = Object.fromEntries(
  CAMERA_LENS_ROSTER.map((lens, i) => [
    lens.id,
    LENS_SAMPLE_FILES[Math.min(i, LENS_SAMPLE_FILES.length - 1)],
  ]),
);

export type LensSampleCard = {
  id: string;
  name: string;
  about: string;
  imageUrl: string;
  lensId: string;
  tier: "ai" | "normal";
  creditCost: number;
  code: string;
  color: string;
};

function sampleUrl(file: string): string {
  return `${R2_BASE}/${file}`;
}

/**
 * Pair each roster lens with its R2 sample by lens ID (not array index of the
 * display-ordered roster). Extra lenses beyond file count fall back to last file.
 */
export function getLensSampleCards(
  roster: CameraLensDef[] = CAMERA_LENS_ROSTER,
): LensSampleCard[] {
  return roster.map((lens) => {
    const file = LENS_SAMPLE_BY_ID[lens.id] ?? LENS_SAMPLE_FILES[LENS_SAMPLE_FILES.length - 1];
    return {
      id: `sample-${lens.id}`,
      name: lens.name,
      about: lens.shortDescription,
      imageUrl: file ? sampleUrl(file) : "",
      lensId: lens.id,
      tier: lens.tier,
      creditCost: lens.creditCost,
      code: lens.code,
      color: lens.color,
    };
  });
}

export function lensEditorHref(lensId: string): string {
  return `/studio/image/lens-editor?lens=${encodeURIComponent(lensId)}`;
}
