import sharp from "sharp";
import type { WatermarkMode, WatermarkBrand } from "./types";
import {
  WATERMARK_BRAND_TEXT,
  detectWatermarkRatioKey,
  PRIMARY_SIZE_RATIO,
  FREE_PRIMARY_SIZE_RATIO,
  EDGE_MARGIN_RATIO,
} from "@/lib/watermark-config";
import { buildCircleWatermarkSvg } from "@/lib/circle-edit/circle-watermark";
import { MOTIO2EDIT_PILL_PNG_B64 } from "./assets/motio2edit-pill.b64";

let cachedPill: Buffer | null = null;
function getMotioPillPng(): Buffer {
  if (cachedPill) return cachedPill;
  cachedPill = Buffer.from(MOTIO2EDIT_PILL_PNG_B64, "base64");
  return cachedPill;
}
function escapeXml(s: string): string {
  return s.replace(/&/g, "&"+"amp;").replace(/</g, "&"+"lt;").replace(/>/g, "&"+"gt;").replace(/"/g, "&"+"quot;").replace(/'/g, "&"+"apos;");
}
export function buildImageOverlaySvg(w: number, h: number, mode: Exclude<WatermarkMode, "none">, _label?: string, brand: WatermarkBrand = "generic", _freeEnlarged = false): string {
  if (brand === "circle") return buildCircleWatermarkSvg(w, h);
  if (mode !== "primary+secondary") return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"></svg>`;
  const minDim = Math.min(w, h);
  const margin = Math.max(10, Math.round(minDim * EDGE_MARGIN_RATIO));
  const marks: string[] = [];
  const cols = 4, rows = 4;
  const cellW = w / (cols + 1), cellH = h / (rows + 1);
  const secFont = Math.max(9, Math.min(28, Math.round(minDim * 0.018)));
  let n = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (n >= 15) break;
      if (row === rows - 1 && col === cols - 1) continue;
      const mx = cellW * (col + 1) + ((row % 2) * cellW * 0.25);
      const my = cellH * (row + 1);
      if (mx < margin || my < margin || mx > w - margin || my > h - margin) continue;
      marks.push(`<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" font-family="sans-serif" font-weight="700" font-size="${secFont}" fill="#ffffff" fill-opacity="0.55" text-anchor="middle">${escapeXml(WATERMARK_BRAND_TEXT)}</text>`);
      n++;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" data-ratio="${detectWatermarkRatioKey(w, h)}">${marks.join("")}</svg>`;
}
export async function renderImageWatermark(input: Buffer, mode: WatermarkMode, label?: string, brand: WatermarkBrand = "generic", freeEnlarged = false): Promise<Buffer> {
  if (mode === "none") return sharp(input, { failOn: "none" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  const image = sharp(input, { failOn: "none" });
  const meta = await image.metadata();
  const w = meta.width ?? 0, h = meta.height ?? 0;
  if (w < 8 || h < 8) throw new Error("Image too small to watermark.");
  if (brand === "circle") {
    return image.composite([{ input: Buffer.from(buildImageOverlaySvg(w, h, mode, label, brand, freeEnlarged)), top: 0, left: 0 }]).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  }
  const sizeRatio = freeEnlarged ? FREE_PRIMARY_SIZE_RATIO : PRIMARY_SIZE_RATIO;
  const targetH = Math.max(18, Math.min(120, Math.round(Math.min(w, h) * sizeRatio * 2.1)));
  const margin = Math.max(10, Math.round(Math.min(w, h) * EDGE_MARGIN_RATIO));
  const pill = getMotioPillPng();
  const pillMeta = await sharp(pill).metadata();
  const pw = pillMeta.width ?? 527, ph = pillMeta.height ?? 100;
  const scale = targetH / ph;
  const outW = Math.max(40, Math.round(pw * scale)), outH = Math.max(18, Math.round(ph * scale));
  const resized = await sharp(pill).resize(outW, outH, { fit: "fill" }).png().toBuffer();
  const left = Math.max(0, w - outW - margin), top = Math.max(0, h - outH - margin);
  const composites: sharp.OverlayOptions[] = [{ input: resized, top, left }];
  if (mode === "primary+secondary") {
    composites.unshift({ input: Buffer.from(buildImageOverlaySvg(w, h, mode, label, brand, freeEnlarged)), top: 0, left: 0 });
  }
  return image.composite(composites).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
}
export async function fetchMediaBuffer(url: string): Promise<Buffer> {
  if (!url.startsWith("https://") && !url.startsWith("http://")) throw new Error("Invalid media URL.");
  const res = await fetch(url, { headers: { Accept: "image/*,video/*,*/*" }, signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`Could not fetch media (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}
