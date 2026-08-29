/**
 * Authoritative Circle 2edit credit calculator.
 * Client may display estimates; server always recalculates from this module.
 * Never trust client-supplied credit totals.
 */

export const CIRCLE_REMOVE_CREDITS = 25 as const;

/** Provider ~$0.075/MP for inpaint — banded base protects margin without tiny steps. */
export const CIRCLE_ADD_BASE_BY_MP: readonly { maxMp: number; credits: number }[] = [
  { maxMp: 2, credits: 25 },
  { maxMp: 4, credits: 30 },
  { maxMp: 6, credits: 40 },
  { maxMp: 8.5, credits: 50 },
] as const;

/** Hard cap on processing resolution (MP) sent to provider. */
export const CIRCLE_ADD_MAX_PROCESSING_MP = 8.5;

/** Max edge length for processing (preserves aspect). */
export const CIRCLE_ADD_MAX_EDGE = 4096;

export type CircleAddCreditInput = {
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  processingWidth?: number | null;
  processingHeight?: number | null;
  assetCreditCost?: number | null;
};

export type CircleAddCreditQuote = {
  baseCredits: number;
  assetCredits: number;
  totalCredits: number;
  sourceWidth: number;
  sourceHeight: number;
  sourceMP: number;
  processingWidth: number;
  processingHeight: number;
  processingMP: number;
  breakdown: string;
};

export function megapixels(w: number, h: number): number {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return 0;
  return (w * h) / 1_000_000;
}

/**
 * Normalize large sources down for provider cost control.
 * Preserves aspect ratio. Does not reject 8K — scales processing size.
 */
export function normalizeCircleAddProcessingSize(
  sourceWidth: number,
  sourceHeight: number,
): { width: number; height: number; mp: number } {
  let w = Math.max(1, Math.round(sourceWidth || 1024));
  let h = Math.max(1, Math.round(sourceHeight || 1024));
  const maxEdge = CIRCLE_ADD_MAX_EDGE;
  const maxMp = CIRCLE_ADD_MAX_PROCESSING_MP;

  if (w > maxEdge || h > maxEdge) {
    const scale = maxEdge / Math.max(w, h);
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
  }

  let mp = megapixels(w, h);
  if (mp > maxMp) {
    const scale = Math.sqrt(maxMp / mp);
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
    mp = megapixels(w, h);
  }

  return { width: w, height: h, mp };
}

export function baseCreditsForProcessingMP(mp: number): number {
  const m = Number.isFinite(mp) && mp > 0 ? mp : 1;
  for (const band of CIRCLE_ADD_BASE_BY_MP) {
    if (m <= band.maxMp) return band.credits;
  }
  return CIRCLE_ADD_BASE_BY_MP[CIRCLE_ADD_BASE_BY_MP.length - 1]!.credits;
}

export function estimateCircleAddCredits(input: CircleAddCreditInput): CircleAddCreditQuote {
  const sw = Math.max(0, Math.round(input.sourceWidth || 0));
  const sh = Math.max(0, Math.round(input.sourceHeight || 0));
  const sourceMP = megapixels(sw || 1024, sh || 1024);

  let pw = input.processingWidth ? Math.round(input.processingWidth) : 0;
  let ph = input.processingHeight ? Math.round(input.processingHeight) : 0;

  if (pw <= 0 || ph <= 0) {
    const n = normalizeCircleAddProcessingSize(sw || 1024, sh || 1024);
    pw = n.width;
    ph = n.height;
  } else {
    const n = normalizeCircleAddProcessingSize(pw, ph);
    pw = n.width;
    ph = n.height;
  }

  const processingMP = megapixels(pw, ph);
  const baseCredits = baseCreditsForProcessingMP(processingMP);
  const assetCredits = Math.max(0, Math.min(100, Math.round(input.assetCreditCost ?? 0)));
  const totalCredits = baseCredits + assetCredits;

  return {
    baseCredits,
    assetCredits,
    totalCredits,
    sourceWidth: sw || 1024,
    sourceHeight: sh || 1024,
    sourceMP: Math.round(sourceMP * 100) / 100,
    processingWidth: pw,
    processingHeight: ph,
    processingMP: Math.round(processingMP * 100) / 100,
    breakdown: `Base ${baseCredits} + asset ${assetCredits} = ${totalCredits}`,
  };
}
