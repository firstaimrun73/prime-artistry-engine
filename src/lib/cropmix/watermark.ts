import { CROPMIX_INK, CROPMIX_VOLT, CROPMIX_VOLT_END } from "./types";

export const CROPMIX_WATERMARK_LABEL = "\u25CF Motio2edit" as const;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """)
    .replace(/'/g, "'");
}

/** SVG overlay for server sharp composite. Bottom-right, ~3% inset. */
export function buildCropmixWatermarkSvg(w: number, h: number): string {
  const minDim = Math.min(w, h);
  const fontSize = Math.max(11, Math.min(36, Math.round(minDim * 0.022)));
  const padX = Math.max(8, Math.round(fontSize * 0.55));
  const padY = Math.max(5, Math.round(fontSize * 0.38));
  const margin = Math.max(8, Math.round(minDim * 0.03));
  const label = CROPMIX_WATERMARK_LABEL;
  const textW = label.length * fontSize * 0.52;
  const rectH = fontSize + padY * 2;
  const rectW = textW + padX * 2;
  const rectX = Math.max(margin, w - rectW - margin);
  const rectY = Math.max(margin, h - rectH - margin);
  const radius = Math.max(4, Math.round(fontSize * 0.35));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="cropmixVolt" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${CROPMIX_VOLT}"/>
      <stop offset="100%" stop-color="${CROPMIX_VOLT_END}"/>
    </linearGradient>
  </defs>
  <rect x="${rectX.toFixed(1)}" y="${rectY.toFixed(1)}" width="${rectW.toFixed(1)}" height="${rectH.toFixed(1)}" rx="${radius}" ry="${radius}" fill="url(#cropmixVolt)"/>
  <text x="${(rectX + padX).toFixed(1)}" y="${(rectY + padY + fontSize * 0.78).toFixed(1)}" font-family="Inter,Arial,Helvetica,sans-serif" font-weight="700" font-size="${fontSize}" fill="${CROPMIX_INK}">${escapeXml(label)}</text>
</svg>`;
}

/** Client canvas draw of Volt chip. */
export function drawCropmixWatermark(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const minDim = Math.min(w, h);
  const fontSize = Math.max(11, Math.min(36, Math.round(minDim * 0.022)));
  const padX = Math.max(8, Math.round(fontSize * 0.55));
  const padY = Math.max(5, Math.round(fontSize * 0.38));
  const margin = Math.max(8, Math.round(minDim * 0.03));
  const label = CROPMIX_WATERMARK_LABEL;
  ctx.save();
  ctx.font = `700 ${fontSize}px Inter, Arial, Helvetica, sans-serif`;
  const textW = ctx.measureText(label).width;
  const rectH = fontSize + padY * 2;
  const rectW = textW + padX * 2;
  const rectX = Math.max(margin, w - rectW - margin);
  const rectY = Math.max(margin, h - rectH - margin);
  const radius = Math.max(4, Math.round(fontSize * 0.35));
  const grad = ctx.createLinearGradient(rectX, rectY, rectX + rectW, rectY + rectH);
  grad.addColorStop(0, CROPMIX_VOLT);
  grad.addColorStop(1, CROPMIX_VOLT_END);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(rectX, rectY, rectW, rectH, radius);
  ctx.fill();
  ctx.fillStyle = CROPMIX_INK;
  ctx.textBaseline = "middle";
  ctx.fillText(label, rectX + padX, rectY + rectH / 2);
  ctx.restore();
}
