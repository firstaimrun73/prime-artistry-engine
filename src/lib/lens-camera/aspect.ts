/**
 * Aspect-ratio engine for Lens Editor.
 * Never stretches. Never forces a mismatched output ratio.
 */

export type AspectKind =
  | "9:16"
  | "16:9"
  | "4:3"
  | "3:4"
  | "1:1"
  | "3:2"
  | "2:3"
  | "21:9"
  | "other";

export type AspectAnalysis = {
  width: number;
  height: number;
  ratio: number;
  kind: AspectKind;
  orientation: "portrait" | "landscape" | "square";
  /** Already very wide — reduce expansion intensity */
  isUltraWide: boolean;
  /** Already very tall */
  isUltraTall: boolean;
};

export function analyzeAspect(width: number, height: number): AspectAnalysis {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const ratio = w / h;
  const orientation: AspectAnalysis["orientation"] =
    Math.abs(ratio - 1) < 0.04 ? "square" : ratio > 1 ? "landscape" : "portrait";

  const candidates: { kind: AspectKind; r: number }[] = [
    { kind: "21:9", r: 21 / 9 },
    { kind: "16:9", r: 16 / 9 },
    { kind: "3:2", r: 3 / 2 },
    { kind: "4:3", r: 4 / 3 },
    { kind: "1:1", r: 1 },
    { kind: "3:4", r: 3 / 4 },
    { kind: "2:3", r: 2 / 3 },
    { kind: "9:16", r: 9 / 16 },
  ];
  let best: AspectKind = "other";
  let bestDiff = Infinity;
  for (const c of candidates) {
    const d = Math.abs(Math.log(ratio / c.r));
    if (d < bestDiff) {
      bestDiff = d;
      best = c.kind;
    }
  }
  if (bestDiff > 0.08) best = "other";

  return {
    width: w,
    height: h,
    ratio,
    kind: best,
    orientation,
    isUltraWide: ratio >= 2.2,
    isUltraTall: ratio <= 1 / 2.2,
  };
}

/**
 * Adaptive Widevista intensity 0–1 based on source geometry.
 * Tight crops tolerate more FOV simulation; already-wide sources get less.
 */
export function widevistaIntensity(analysis: AspectAnalysis): number {
  if (analysis.isUltraWide) return 0.22;
  if (analysis.kind === "21:9") return 0.25;
  if (analysis.kind === "16:9") return 0.55;
  if (analysis.kind === "9:16" || analysis.kind === "2:3" || analysis.kind === "3:4") {
    return 0.62;
  }
  if (analysis.kind === "1:1") return 0.48;
  return 0.5;
}
