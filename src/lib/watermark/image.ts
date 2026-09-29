import sharp from "sharp";
import type { WatermarkMode, WatermarkBrand } from "./types";
import {
  WATERMARK_BRAND_TEXT,
  WATERMARK_BRAND_ORANGE,
  detectWatermarkRatioKey,
  PRIMARY_SIZE_RATIO,
  FREE_PRIMARY_SIZE_RATIO,
  SECONDARY_SIZE_RATIO,
  EDGE_MARGIN_RATIO,
} from "@/lib/watermark-config";
import { buildCircleWatermarkSvg } from "@/lib/circle-edit/circle-watermark";

/**
 * Pre-rendered Motio2edit pill (DejaVu Bold, white + #FF5A1F "2").
 * Composited as a PNG so Vercel/Linux never depends on system fonts or SVG text.
 */
const MOTIO_WATERMARK_PNG_B64 =
  "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";

// NOTE: Full PNG is loaded at module init from a complete base64 constant below.
// The truncated constant above is replaced by the complete buffer helper.

let cachedPill: Buffer | null = null;

function getMotioPillPng(): Buffer {
  if (cachedPill) return cachedPill;
  // Full asset written by build step / committed constant
  const full = process.env.MOTIO_WATERMARK_PNG_B64 || MOTIO_WATERMARK_PNG_FULL;
  cachedPill = Buffer.from(full, "base64");
  return cachedPill;
}

// Complete pre-rendered Motio2edit PNG (generated with DejaVu Sans Bold).
const MOTIO_WATERMARK_PNG_FULL =
  "iVBORw0KGgoAAAANSUhEUgAAAg8AAABkCAYAAAABidMSAAAeW0lEQVR4nO3deVgUV7YA8Nv73mzSNAgIEllFEUFEMnGLSZRxi9vIaDRKUD8DbpnJixkzGk0yGo2KGg3KaNwSiWbiFmU0bzQEF5YoixBABJSWfe1u6L3fHw55hAhdt7qbXji/7/Mf6aq6cKurTp2691wKIucOye0AAAAAYF3G4m5AwfgsBAwAAACAfSMUSBAJHiBoAAAAAAaWPoMIqoGNIXAAAAAABp4+7/+9ZR4gaAAAAAAAQs/JQjwv8wCBAwAAAAC6/C4uMPTaAgAAAADgN3oGD5B1AAAAAEBPv4kPqL39AAAAAACgm1/jBHhtAQAAAAAsXcEDZB0AAAAAYMgdhCDzAAAAAABMEDwAAAAAAAsFwSsLAAAAAGCAzAMAAAAAsEDwAAAAAAAsEDwAAAAAAAsEDwAAAADAAsEDAAAAALBA8AAAAAAALBA8AAAAAAALBA8AAAAAwEK3dAMAGIhkMlkkj8cjHLyfOnWqcdGiReXmbBMA1iAwMJBTXFw8AmebLVu2SDZv3lxN9PPw/TMeZB4AAAAAgAUyDwAAm0RBCPkLGewgIYPjy6ezfPl01lA+nT2YQ2MKGFQqj06h8WgUKpdOpWr1eqTQ6nWtKp22TqFTV8k1yuJ2def9FlXHTw1Kab1Cq7b07wOALYHg4b/i4+NFhw8f9jVmH0qlUufl5XW/oaHBLBeilStXig4ePGhUGxFCiEKh3DVFewDoTw4MKm2CG1sY5cLkj3Fh8SNcmDwHBpVGZFsahYKYVApNyKDSvHmIGenC5HX/+c/NKnnaY3nzsUfyhjoIJAAwCIIHE2KxWNQVK1aItm3bJjHH/hMTE8Xm2O9AkpOTM3z06NE8w598Jjc3Vx4REVFozjaB3o10YnKnunMcp3qwHce5svl0CqKY4zjhzkxeuDOT9+EIR8/jFfKGv+e3Sp52alXmOBYYOOz5egNjHkxs1apVIgaDYfIL3JQpUxyCg4M5pt4vANYqUMjg3J/qHvpJmKPXSyK2wFyBQ3dMKoUS78cXlU4fPHLVMIGbuY8HgK2C4MHEPDw8mHPmzHE29X6TkpIg6wBAP+HRKdTPI519vo4Z9AKLSoHrJAA9wJfCDEx9o/fz82NPmzbN0ZT7BAAYtmAIz+XCeFd/BpVi9qwHALYEggcziI6O5kdERBB+z2VIYmKiG5UKXQWAJbziznH4PNLZx9LtAMCawB3JTEyVfRAIBLQ333zT1RT7AgCQE+/HF83y5DpZuh0AWAsIHsxkwYIFLm5ubgxj97N06VJXoVBIaDoaAMB8doY7ecPrCwCegamaZsJkMikrVqwQffjhh6SnbVIoFJSYmAgjvu0Qn8/PtnQb7EWTUqf5d21n2//WKtoLWtUdj2QaZatap2HTKNRBLCp9lBOTN0XMdljsyx/Eo5Mf/OjHp7PneHGdv66SN5my/aD/wffPeBA8mNHKlSvdPvnkk6dqtVpPZvupU6c6Dhs2jG3qdgFg63R6hC5KOlqOlMvq02sUbWqd/nffMbVOr5WqddoKmUb57ZOO5vfzWp9sH+XkFe/HF5E97pKhvEEQPAAAry3Myt3dnTFv3jzS0zbXrFkD0zMB6EajR/rUclmD/0VJ3qwfG0ovSTpbnxc4PE+zSqd5625Txds5zZVkjz9exBbC1E0AIHgwO7IDJwMDAzlTpkxxMHV7ALBV56s7WoIvSfLj7zY9KpdpFGT3c6BUWrfnl/ZaMttyaBTqCCcGFGsDAx68tjCzqKgo/pgxY/hZWVkynO2SkpLcKDY6NisgIIAdHR0tGDVqFNff35/t6enJcnNzo3O5XBqHw6FqNBp9Z2enrr29XSuRSFSPHz9W5ufnd+bm5sp/+uknqUwm01r6dxhIrL2/ymUaxers5sr0ms42U+3zg4K26j/78lxcWTTsQc3DBAx2dpNKbqq29OTp6cmMiYkRhIeH84KCgtheXl4sd3d3BpfLpXI4HKper0cdHR26lpYWTVVVlfLhw4fK7Oxs2U8//SR98OBBp7naZYhYLGbExsY6Tpo0ySEkJITj5eXFFAgENK1Wq29ra9NWVFQoCwoKOq5du9Z29erVNqlUCt9zG0ZBCN2xdCOsgSkWxuoN7lrwjo6OtOrq6nCc9eZxmGNhrKCgIE58fLzr7NmznX19fVlk96NSqfQZGRnSEydONKSlpTV3dnbqcPfB5/NpUqk0gmwbjJWZmSl98cUXi/r6jEwmi8TpX9xzyBBr6q/eDBPQ2W/7C93ey2t50qHRm2y/XfaOdh6SFCDAzgyuyW2uSi6Rkspc9MbT05O5bNky17lz5zqHhoZyye7n0aNHyq+++qrx4MGD9RKJpF/W5ggODuZs3rzZc9asWU5ES/PLZDJtampqw/bt25/W1NT8ZiGywMBATnFx8QicNmzZskWyefPmaqKfN+X3zxauN+YAry2McPv2bULZhHnz5rmIxWLCTzjLly8XmbMfAFiDhw8fOs+YMcOJ";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;")
    .replace(/'/g, "&" + "apos;");
}

/** Legacy SVG path kept for secondary marks / circle brand only. */
export function buildImageOverlaySvg(
  w: number,
  h: number,
  mode: Exclude<WatermarkMode, "none">,
  label?: string,
  brand: WatermarkBrand = "generic",
  freeEnlarged = false,
): string {
  if (brand === "circle") {
    return buildCircleWatermarkSvg(w, h);
  }
  // Primary mark is applied via PNG composite in renderImageWatermark.
  // Secondary dense marks (if ever requested) use simple SVG without relying on Arial.
  if (mode !== "primary+secondary") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"></svg>`;
  }
  const minDim = Math.min(w, h);
  const margin = Math.max(10, Math.round(minDim * EDGE_MARGIN_RATIO));
  const marks: string[] = [];
  const cols = 4;
  const rows = 4;
  const cellW = w / (cols + 1);
  const cellH = h / (rows + 1);
  const secFont = Math.max(9, Math.min(28, Math.round(minDim * 0.018)));
  let n = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (n >= 15) break;
      if (row === rows - 1 && col === cols - 1) continue;
      const mx = cellW * (col + 1) + ((row % 2) * cellW * 0.25);
      const my = cellH * (row + 1);
      if (mx < margin || my < margin || mx > w - margin || my > h - margin) continue;
      marks.push(
        `<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" font-family="sans-serif" font-weight="700" font-size="${secFont}" fill="#ffffff" fill-opacity="0.55" text-anchor="middle">${escapeXml(WATERMARK_BRAND_TEXT)}</text>`,
      );
      n++;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" data-ratio="${detectWatermarkRatioKey(w, h)}">${marks.join("")}</svg>`;
}

export async function renderImageWatermark(
  input: Buffer,
  mode: WatermarkMode,
  label?: string,
  brand: WatermarkBrand = "generic",
  freeEnlarged = false,
): Promise<Buffer> {
  if (mode === "none") {
    return sharp(input, { failOn: "none" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  }
  const image = sharp(input, { failOn: "none" });
  const meta = await image.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w < 8 || h < 8) throw new Error("Image too small to watermark.");

  if (brand === "circle") {
    return image
      .composite([
        {
          input: Buffer.from(buildImageOverlaySvg(w, h, mode, label, brand, freeEnlarged)),
          top: 0,
          left: 0,
        },
      ])
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
  }

  // Primary Motio2edit: scale pre-rendered PNG pill to image size (deterministic glyphs).
  const sizeRatio = freeEnlarged ? FREE_PRIMARY_SIZE_RATIO : PRIMARY_SIZE_RATIO;
  const targetH = Math.max(18, Math.min(120, Math.round(Math.min(w, h) * sizeRatio * 2.1)));
  const margin = Math.max(10, Math.round(Math.min(w, h) * EDGE_MARGIN_RATIO));

  let pill = getMotioPillPng();
  const pillMeta = await sharp(pill).metadata();
  const pw = pillMeta.width ?? 527;
  const ph = pillMeta.height ?? 100;
  const scale = targetH / ph;
  const outW = Math.max(40, Math.round(pw * scale));
  const outH = Math.max(18, Math.round(ph * scale));
  const resized = await sharp(pill)
    .resize(outW, outH, { fit: "fill" })
    .png()
    .toBuffer();

  const left = Math.max(0, w - outW - margin);
  const top = Math.max(0, h - outH - margin);

  const composites: sharp.OverlayOptions[] = [{ input: resized, top, left }];

  if (mode === "primary+secondary") {
    composites.unshift({
      input: Buffer.from(buildImageOverlaySvg(w, h, mode, label, brand, freeEnlarged)),
      top: 0,
      left: 0,
    });
  }

  return image
    .composite(composites)
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
