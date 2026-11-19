import { STUDIO_TAGLINES_A } from "./studio-taglines-a";
import { STUDIO_TAGLINES_B } from "./studio-taglines-b";

/** Curated unique creative inspiration lines for empty Image Studio workspace. */
export const STUDIO_TAGLINES: readonly string[] = [...STUDIO_TAGLINES_A, ...STUDIO_TAGLINES_B];

export const STUDIO_TAGLINE_COUNT = STUDIO_TAGLINES.length;

const KEY = "motio2edit.studio.lastTaglineIdx";

/** Pick a tagline different from the last one shown in this session. */
export function pickStudioTagline(exclude?: string): string {
  const n = STUDIO_TAGLINES.length;
  if (!n) return "What will you create today?";
  let last = -1;
  try {
    const r = sessionStorage.getItem(KEY);
    if (r != null) last = Number(r);
  } catch {
    /* ignore */
  }
  let idx = Math.floor(Math.random() * n);
  if (n > 1) {
    let guard = 0;
    while (
      (idx === last || (exclude && STUDIO_TAGLINES[idx] === exclude)) &&
      guard < 12
    ) {
      idx = (idx + 1 + Math.floor(Math.random() * (n - 1))) % n;
      guard++;
    }
  }
  try {
    sessionStorage.setItem(KEY, String(idx));
  } catch {
    /* ignore */
  }
  return STUDIO_TAGLINES[idx]!;
}
