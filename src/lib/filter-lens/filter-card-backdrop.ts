import type { CSSProperties } from "react";

/** Minimal shape needed for unique card art (avoids circular imports). */
export type FilterCardVisual = {
  id: string;
  name: string;
  category: string;
  profile?: Record<string, number | undefined> | null;
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Unique CSS “photo” backdrop per filter — derived from id/name/category/profile.
 * Not a shared sample image; each of the 100 filters looks different.
 */
export function filterCardBackdrop(item: FilterCardVisual): CSSProperties {
  const h1 = hashStr(item.id) % 360;
  const h2 = (h1 + 48 + (hashStr(item.name) % 80)) % 360;
  const sat = 45 + (hashStr(item.category) % 35);
  const light = 38 + (hashStr(item.id + item.name) % 22);
  const angle = 120 + (hashStr(item.id) % 90);
  const p = item.profile ?? {};
  const temp = typeof p.temperature === "number" ? p.temperature : 0;
  const vib = typeof p.vibrance === "number" ? p.vibrance : 0;
  const contrast = typeof p.contrast === "number" ? p.contrast : 0;
  const warmShift = Math.max(-18, Math.min(18, temp));
  const satBoost = Math.max(0, Math.min(25, vib / 4));
  return {
    backgroundImage: `
      linear-gradient(${angle}deg,
        hsl(${(h1 + warmShift + 360) % 360} ${sat + satBoost}% ${light}%),
        hsl(${(h2 + warmShift + 360) % 360} ${Math.min(90, sat + 12 + satBoost)}% ${Math.min(72, light + 18 + contrast / 8)}%)),
      radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.22), transparent 55%),
      radial-gradient(ellipse at 80% 90%, rgba(0,0,0,0.25), transparent 50%)
    `,
    filter: `contrast(${1 + Math.min(0.25, Math.abs(contrast) / 120)}) saturate(${1 + satBoost / 80})`,
  };
}
