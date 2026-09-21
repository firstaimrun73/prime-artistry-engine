/**
 * Explicit lensId → thumbnail mapping.
 * No sequential/random assignment. Missing → code-chip fallback.
 */
import { CAMERA_LENS_ROSTER, type CameraLensDef } from "@/lib/lens-camera/roster";

const R2 = "https://assets.motio2edit.com/samples/lenses";

/** Only verified/approved assets. Do not invent URLs. */
const EXPLICIT_THUMB_BY_ID: Record<string, string> = {
  // Snake View — origami-style approved asset
  lens_snake_view: `${R2}/yI-tMJdFy2R1BZNUkqcDu_B9I9Fw8J.png`,
  lens_infraglow: `${R2}/0Gb5oNcmBst75vPAC8i4J_1ydKb8fI.png`,
};

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

export function getLensSampleCards(
  roster: CameraLensDef[] = CAMERA_LENS_ROSTER,
): LensSampleCard[] {
  return roster.map((lens) => ({
    id: `sample-${lens.id}`,
    name: lens.name,
    about: lens.shortDescription,
    imageUrl: EXPLICIT_THUMB_BY_ID[lens.id] ?? "",
    lensId: lens.id,
    tier: lens.tier,
    creditCost: lens.creditCost,
    code: lens.code,
    color: lens.color,
  }));
}

export function lensEditorHref(lensId: string): string {
  return `/studio/image/lens-editor?lens=${encodeURIComponent(lensId)}`;
}
