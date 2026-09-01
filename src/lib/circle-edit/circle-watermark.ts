/**
 * Circle 2edit brand watermark — distinct from generic Motio2edit.
 * User-facing text: "Motio 2 Edit" with purple ring mark.
 * Server is authoritative; client pref only for paid opt-in/out.
 */

export const CIRCLE_WATERMARK_TEXT = "Motio 2 Edit" as const;
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

/** Build compact SVG overlay for Circle brand (server sharp composite). */
export function buildCircleWatermarkSvg(w: number, h: number): string {
  const minDim = Math.min(w, h);
  const fontSize = Math.max(11, Math.min(48, Math.round(minDim * 0.026)));
  const pad = Math.max(6, Math.round(fontSize * 0.32));
  const margin = Math.max(10, Math.round(minDim * 0.014));
  const ringR = Math.max(5, Math.round(fontSize * 0.42));
  const approxChar = fontSize * 0.52;
  const label = CIRCLE_WATERMARK_TEXT;
  const textWidth = label.length * approxChar;
  const rectH = fontSize + pad * 2;
  const rectW = textWidth + pad * 2 + ringR * 2 + 16;
  const rectX = Math.max(margin, w - rectW - margin);
  const rectY = Math.max(margin, h - rectH - margin);
  const ringCx = rectX + pad + ringR;
  const ringCy = rectY + rectH / 2;
  const textX = ringCx + ringR + 8;
  const textY = rectY + pad + fontSize * 0.82;
  const stroke = Math.max(1.5, ringR * 0.22);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="8" ry="8" fill="rgba(0,0,0,0.72)"/>` +
    `<circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="${CIRCLE_WATERMARK_PURPLE}" stroke-width="${stroke}"/>` +
    `<circle cx="${ringCx}" cy="${ringCy}" r="${Math.max(1.5, ringR * 0.22)}" fill="${CIRCLE_WATERMARK_PURPLE}"/>` +
    `<text x="${textX}" y="${textY}" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${fontSize}" fill="#ffffff">${label}</text>` +
    `</svg>`
  );
}
