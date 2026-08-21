import sharp from "sharp";
import type { WatermarkMode } from "./types";
import {
  WATERMARK_BRAND_TEXT,
  WATERMARK_BRAND_ORANGE,
  detectWatermarkRatioKey,
  PRIMARY_SIZE_RATIO,
  SECONDARY_SIZE_RATIO,
  EDGE_MARGIN_RATIO,
} from "@/lib/watermark-config";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;")
    .replace(/'/g, "&" + "apos;");
}

/**
 * Build Motio2edit primary pill (+ optional secondary free icon).
 * When `label` is provided (Experience-aware), it replaces the fixed brand text
 * while keeping the orange-dot Motio visual treatment.
 * Format examples: "Motio2edit Standard — Free", "Motio2edit Ultra AI — Pro"
 */
export function buildImageOverlaySvg(
  w: number,
  h: number,
  mode: Exclude<WatermarkMode, "none">,
  label?: string,
): string {
  const minDim = Math.min(w, h);
  const displayText = (label && label.trim().length > 0 ? label.trim() : WATERMARK_BRAND_TEXT).slice(
    0,
    64,
  );
  // Slightly smaller type for longer Experience lines so the pill fits.
  const lengthFactor = displayText.length > 18 ? Math.min(1, 18 / displayText.length + 0.35) : 1;
  const fontSize = Math.max(
    11,
    Math.min(72, Math.round(minDim * PRIMARY_SIZE_RATIO * lengthFactor)),
  );
  const pad = Math.max(6, Math.round(fontSize * 0.35));
  const margin = Math.max(10, Math.round(minDim * EDGE_MARGIN_RATIO));
  const approxChar = fontSize * 0.55;
  const textWidth = displayText.length * approxChar;
  const dotR = Math.max(3, Math.round(fontSize * 0.18));
  const rectH = fontSize + pad * 2;
  const rectW = textWidth + pad * 2 + dotR * 2 + 14;
  const rectX = Math.max(margin, w - rectW - margin);
  const rectY = Math.max(margin, h - rectH - margin);
  const dotCx = rectX + pad + dotR;
  const dotCy = rectY + rectH / 2;
  const textX = dotCx + dotR + 8;
  const textY = rectY + pad + fontSize * 0.82;

  let secondary = "";
  if (mode === "primary+secondary") {
    const icon = Math.max(18, Math.min(96, Math.round(minDim * SECONDARY_SIZE_RATIO)));
    const ix = margin;
    const iy = margin;
    const cx = ix + icon / 2;
    const cy = iy + icon / 2;
    const R = icon * 0.42;
    const s = icon * 0.28;
    secondary = `<g opacity="0.78"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${R.toFixed(1)}" fill="${WATERMARK_BRAND_ORANGE}" fill-opacity="0.88"/><path d="M${cx} ${cy - s} L${cx + s / 3} ${cy} L${cx} ${cy + s} L${cx - s / 3} ${cy} Z" fill="#ffffff"/><path d="M${cx - s} ${cy} L${cx} ${cy - s / 3} L${cx + s} ${cy} L${cx} ${cy + s / 3} Z" fill="#ffffff"/><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${Math.max(2, icon * 0.06).toFixed(1)}" fill="${WATERMARK_BRAND_ORANGE}"/></g>`;
  }

  // Prefer Motio2 color split when label starts with Motio2edit; otherwise single white line.
  let brandText: string;
  if (displayText.startsWith("Motio2edit") || displayText === WATERMARK_BRAND_TEXT) {
    const rest = displayText.slice("Motio2edit".length); // e.g. " Standard — Free"
    const motioW = "Motio".length * approxChar;
    const twoW = "2".length * approxChar;
    brandText =
      `<text x="${textX}" y="${textY}" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${fontSize}" fill="#ffffff">${escapeXml("Motio")}</text>` +
      `<text x="${textX + motioW}" y="${textY}" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${fontSize}" fill="${WATERMARK_BRAND_ORANGE}">${escapeXml("2")}</text>` +
      `<text x="${textX + motioW + twoW}" y="${textY}" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${fontSize}" fill="#ffffff">${escapeXml("edit" + rest)}</text>`;
  } else {
    brandText = `<text x="${textX}" y="${textY}" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${fontSize}" fill="#ffffff">${escapeXml(displayText)}</text>`;
  }

  const brand = `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="8" ry="8" fill="rgba(0,0,0,0.78)"/><circle cx="${dotCx}" cy="${dotCy}" r="${dotR}" fill="${WATERMARK_BRAND_ORANGE}"/>${brandText}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" data-ratio="${detectWatermarkRatioKey(w, h)}">${secondary}${brand}</svg>`;
}

export async function renderImageWatermark(
  input: Buffer,
  mode: WatermarkMode,
  label?: string,
): Promise<Buffer> {
  if (mode === "none") {
    return sharp(input, { failOn: "none" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  }
  const image = sharp(input, { failOn: "none" });
  const meta = await image.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w < 8 || h < 8) throw new Error("Image too small to watermark.");
  return image
    .composite([{ input: Buffer.from(buildImageOverlaySvg(w, h, mode, label)), top: 0, left: 0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}

export async function fetchMediaBuffer(url: string): Promise<Buffer> {
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    throw new Error("Invalid media URL.");
  }
  const res = await fetch(url, {
    headers: { Accept: "image/*,video/*,*/*" },
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Could not fetch media (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}
