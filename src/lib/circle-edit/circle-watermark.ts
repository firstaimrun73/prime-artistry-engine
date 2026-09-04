/**
 * Circle 2edit brand watermark — server-authoritative composite.
 * Exact lines:
 *   Edited by Motio2edit.com
 *   Powered by Motion2AI
 * Client pref only for paid opt-in/out; free is forced server-side.
 */

export const CIRCLE_WATERMARK_LINE1 = "Edited by Motio2edit.com" as const;
export const CIRCLE_WATERMARK_LINE2 = "Powered by Motion2AI" as const;
/** @deprecated use CIRCLE_WATERMARK_LINE1 */
export const CIRCLE_WATERMARK_TEXT = CIRCLE_WATERMARK_LINE1;
export const CIRCLE_WATERMARK_PURPLE = "#7B6FE0" as const;

const PREF_KEY = "motio2edit-circle-watermark-pref";

/** Paid users can disable; free is forced server-side via policy. */
export function readCircleKeepWatermarkPref(): boolean {
  try {
    const v = localStorage.getItem(PREF_KEY);
    if (v === "off") return false;
    if (v === "on") return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function writeCircleKeepWatermarkPref(on: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

/**
 * Compact two-line SVG overlay for Circle brand (server sharp composite).
 * Bottom-right, dark backing, purple ring mark — readable on light/dark images.
 */
export function buildCircleWatermarkSvg(w: number, h: number): string {
  const minDim = Math.min(w, h);
  const fontSize = Math.max(10, Math.min(28, Math.round(minDim * 0.022)));
  const lineGap = Math.max(2, Math.round(fontSize * 0.28));
  const padX = Math.max(8, Math.round(fontSize * 0.55));
  const padY = Math.max(6, Math.round(fontSize * 0.4));
  const margin = Math.max(10, Math.round(minDim * 0.014));
  const ringR = Math.max(5, Math.round(fontSize * 0.48));
  const approxChar = fontSize * 0.52;
  const line1 = CIRCLE_WATERMARK_LINE1;
  const line2 = CIRCLE_WATERMARK_LINE2;
  const textWidth = Math.max(line1.length, line2.length) * approxChar;
  const textBlockH = fontSize * 2 + lineGap;
  const rectH = textBlockH + padY * 2;
  const rectW = textWidth + padX * 2 + ringR * 2 + 14;
  const rectX = Math.max(margin, w - rectW - margin);
  const rectY = Math.max(margin, h - rectH - margin);
  const ringCx = rectX + padX + ringR;
  const ringCy = rectY + rectH / 2;
  const textX = ringCx + ringR + 8;
  const textY1 = rectY + padY + fontSize * 0.85;
  const textY2 = textY1 + fontSize + lineGap;
  const stroke = Math.max(1.5, ringR * 0.22);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="8" ry="8" fill="rgba(0,0,0,0.72)"/>` +
    `<circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="${CIRCLE_WATERMARK_PURPLE}" stroke-width="${stroke}"/>` +
    `<circle cx="${ringCx}" cy="${ringCy}" r="${Math.max(1.5, ringR * 0.22)}" fill="${CIRCLE_WATERMARK_PURPLE}"/>` +
    `<text x="${textX}" y="${textY1}" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${fontSize}" fill="#ffffff">${line1}</text>` +
    `<text x="${textX}" y="${textY2}" font-family="Arial,Helvetica,sans-serif" font-weight="600" font-size="${Math.max(9, fontSize - 1)}" fill="#C8C4E8">${line2}</text>` +
    `</svg>`
  );
}
