// Server-side Motio2edit watermark compositor.
//
// Pipeline: AI returns CLEAN image → this module composites branding → export.
// The AI provider is NEVER asked to draw Motio2edit watermarks.
//
// PRIMARY  = bottom-right "Motio2edit" pill (digit 2 in brand orange)
// SECONDARY = top-left small Motio2edit icon (FREE / non-premium only)
//
// Policy: src/lib/policy.ts (getWatermarkMode / shouldApplySecondaryWatermark).

import sharp from "sharp";
import type { WatermarkMode } from "./policy";
import {
  WATERMARK_BRAND_TEXT,
  WATERMARK_BRAND_ORANGE,
  detectWatermarkRatioKey,
  PRIMARY_SIZE_RATIO,
  SECONDARY_SIZE_RATIO,
  EDGE_MARGIN_RATIO,
} from "./watermark-config";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

/**
 * Build a full-frame transparent SVG overlay for the final output size.
 * Primary: bottom-right. Secondary icon: top-left (when mode includes secondary).
 */
function buildOverlaySvg(
  w: number,
  h: number,
  mode: Exclude<WatermarkMode, "none">,
): string {
  const minDim = Math.min(w, h);
  const fontSize = Math.max(16, Math.round(minDim * PRIMARY_SIZE_RATIO));
  const pad = Math.max(8, Math.round(fontSize * 0.35));
  const margin = Math.max(12, Math.round(minDim * EDGE_MARGIN_RATIO));

  // Approximate bold Arial metrics for "Motio2edit"
  const approxChar = fontSize * 0.58;
  const textWidth = WATERMARK_BRAND_TEXT.length * approxChar;
  const motioW = "Motio".length * approxChar;
  const twoW = "2".length * approxChar;

  const dotR = Math.max(4, Math.round(fontSize * 0.18));
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
    const icon = Math.max(20, Math.round(minDim * SECONDARY_SIZE_RATIO));
    const ix = margin;
    const iy = margin;
    const cx = ix + icon / 2;
    const cy = iy + icon / 2;
    const R = icon * 0.42;
    const s = icon * 0.28;
    secondary =
      `<g opacity="0.78">` +
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${R.toFixed(1)}" fill="${WATERMARK_BRAND_ORANGE}" fill-opacity="0.88"/>` +
      `<path d="M${cx} ${cy - s} L${cx + s / 3} ${cy} L${cx} ${cy + s} L${cx - s / 3} ${cy} Z" fill="#ffffff"/>` +
      `<path d="M${cx - s} ${cy} L${cx} ${cy - s / 3} L${cx + s} ${cy} L${cx} ${cy + s / 3} Z" fill="#ffffff"/>` +
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${Math.max(2, icon * 0.06).toFixed(1)}" fill="${WATERMARK_BRAND_ORANGE}"/>` +
      `</g>`;
  }

  const brand =
    `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="8" ry="8" fill="rgba(0,0,0,0.78)"/>` +
    `<circle cx="${dotCx}" cy="${dotCy}" r="${dotR}" fill="${WATERMARK_BRAND_ORANGE}"/>` +
    `<text x="${textX}" y="${textY}" font-family="Arial,Helvetica,sans-serif" font-weight="700" ` +
    `font-size="${fontSize}" fill="#ffffff">${escapeXml("Motio")}</text>` +
    `<text x="${textX + motioW}" y="${textY}" font-family="Arial,Helvetica,sans-serif" font-weight="700" ` +
    `font-size="${fontSize}" fill="${WATERMARK_BRAND_ORANGE}">${escapeXml("2")}</text>` +
    `<text x="${textX + motioW + twoW}" y="${textY}" font-family="Arial,Helvetica,sans-serif" font-weight="700" ` +
    `font-size="${fontSize}" fill="#ffffff">${escapeXml("edit")}</text>`;

  const ratioKey = detectWatermarkRatioKey(w, h);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" data-ratio="${ratioKey}">` +
    secondary +
    brand +
    `</svg>`
  );
}

/**
 * Apply server-side watermark to an image buffer.
 * Returns JPEG buffer. Does not crop, rotate, or change aspect ratio.
 */
export async function applyServerWatermark(
  input: Buffer,
  mode: WatermarkMode,
): Promise<Buffer> {
  if (mode === "none") {
    return sharp(input).jpeg({ quality: 92 }).toBuffer();
  }

  const image = sharp(input, { failOn: "none" });
  const meta = await image.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w < 8 || h < 8) {
    throw new Error("Image too small to watermark.");
  }

  const svg = buildOverlaySvg(w, h, mode);
  return image
    .composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}

/** Fetch a remote image URL into a Buffer (server-side). */
export async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    throw new Error("Invalid image URL.");
  }
  const res = await fetch(url, {
    headers: { Accept: "image/*,*/*" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`Could not fetch image (${res.status}).`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}
