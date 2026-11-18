import { STUDIO_TAGLINES_A } from "./studio-taglines-a";
import { STUDIO_TAGLINES_B } from "./studio-taglines-b";

export const STUDIO_TAGLINES: readonly string[] = [...STUDIO_TAGLINES_A, ...STUDIO_TAGLINES_B];

const KEY = "motio2edit.studio.lastTaglineIdx";
export function pickStudioTagline(): string {
  const n = STUDIO_TAGLINES.length;
  if (!n) return "What will you create today?";
  let last = -1;
  try { const r = sessionStorage.getItem(KEY); if (r != null) last = Number(r); } catch {}
  let idx = Math.floor(Math.random() * n);
  if (n > 1 && idx === last) idx = (idx + 1) % n;
  try { sessionStorage.setItem(KEY, String(idx)); } catch {}
  return STUDIO_TAGLINES[idx]!;
}
