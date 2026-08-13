// Server-side MOTIO2EDIT watermark compositor.
//
// Mirrors the client compositor (src/lib/watermark.ts):
//   PRIMARY  = bottom-right "MOTIO2EDIT" pill
//   SECONDARY = responsive diagonal "MOTIO2EDIT.COM" grid (~60–65% alpha)
//
// Used ONLY on the server. Free downloads must go through this path so the
// clean fal.ai URL is never the final downloadable asset.

import sharp from "sharp";
import type { WatermarkMode } from "./policy";

const BRAND_ORANGE = "#f97316";
const PRIMARY_TEXT = "MOTIO2EDIT";
const SECONDARY_TEXT = "MOTIO2EDIT.COM";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

/** Build an SVG overlay sized to the image. */
function buildOverlaySvg(
  w: number,
  h: number,
  mode: Exclude<WatermarkMode, "none">,
): string {
  const fontSize = Math.max(18, Math.round(Math.min(w, h) * 0.028));
  const pad = 12;
  const margin = Math.max(12, Math.round(Math.min(w, h) * 0.012));
  // Approximate text width (monospace-ish estimate for Arial bold)
  const approxChar = fontSize * 0.62;
  const textWidth = PRIMARY_TEXT.length * approxChar;
  const rectW = textWidth + pad * 2 + 10;
  const rectH = fontSize + pad * 2;
  const rectX = Math.max(0, w - textWidth - pad * 2 - margin - 10);
  const rectY = Math.max(0, h - fontSize - pad * 2 - margin);
  const dotCx = rectX + 12;
  const dotCy = rectY + rectH / 2;
  const textX = rectX + 22;
  const textY = rectY + fontSize + 3;

  let secondary = "";
  if (mode === "primary+secondary") {
    const diagFont = Math.max(20, Math.round(Math.min(w, h) * 0.032));
    const cols = w > h * 1.4 ? 4 : w < h * 0.7 ? 2 : 3;
    const rows = h > w * 1.4 ? 4 : h < w * 0.7 ? 2 : 3;
    const marks: string[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ((c + 0.5) / cols) * w + ((r % 2) * 0.04 - 0.02) * w;
        const y = ((r + 0.5) / rows) * h + ((c % 2) * 0.03 - 0.015) * h;
        const strokeW = Math.max(2, Math.round(diagFont * 0.12));
        marks.push(
          `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(-36)" opacity="0.62">` +
            `<text x="0" y="0" text-anchor="middle" dominant-baseline="middle" ` +
            `font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${diagFont}" ` +
            `fill="#ffffff" stroke="rgba(0,0,0,0.5)" stroke-width="${strokeW}">${escapeXml(SECONDARY_TEXT)}</text>` +
            `</g>`,
        );
      }
    }
    secondary = marks.join("");
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    secondary +
    `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="8" ry="8" fill="rgba(0,0,0,0.78)"/>` +
    `<circle cx="${dotCx}" cy="${dotCy}" r="5" fill="${BRAND_ORANGE}"/>` +
    `<text x="${textX}" y="${textY}" font-family="Arial,Helvetica,sans-serif" font-weight="700" ` +
    `font-size="${fontSize}" fill="#ffffff">${escapeXml(PRIMARY_TEXT)}</text>` +
    `</svg>`
  );
}

/**
 * Apply server-side watermark to an image buffer.
 * Returns JPEG buffer. Does not change aspect ratio or crop.
 */
export async function applyServerWatermark(
  input: Buffer,
  mode: WatermarkMode,
): Promise<Buffer> {
  if (mode === "none") {
    // Re-encode lightly so callers always get a consistent buffer type
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
