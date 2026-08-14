// Client-side Motio2edit brand watermark compositor.
//
// IMPORTANT:
// - AI models must NEVER draw the watermark. Generation returns a clean image.
// - This module applies a deterministic overlay AFTER generation.
// - Primary = bottom-right "Motio2edit" pill (digit 2 in brand orange)
// - Secondary = top-left Motio2edit icon (FREE plan only)
//
// Policy lives in src/lib/policy.ts (getWatermarkMode / shouldApplySecondaryWatermark).
// Server path (watermark.server.ts) is authoritative for downloads.

import {
  WATERMARK_BRAND_TEXT,
  WATERMARK_BRAND_ORANGE,
  detectWatermarkRatioKey,
  PRIMARY_SIZE_RATIO,
  SECONDARY_SIZE_RATIO,
  EDGE_MARGIN_RATIO,
} from "./watermark-config";

/** Draws the watermark(s) onto a loaded image and returns a JPEG data URL. */
function renderWatermarked(img: HTMLImageElement, strong: boolean): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("[Watermark] No canvas context");
    return null;
  }

  ctx.drawImage(img, 0, 0);

  const w = canvas.width;
  const h = canvas.height;
  if (w < 8 || h < 8) return null;

  const minDim = Math.min(w, h);
  const fontSize = Math.max(16, Math.round(minDim * PRIMARY_SIZE_RATIO));
  const pad = Math.max(8, Math.round(fontSize * 0.35));
  const margin = Math.max(12, Math.round(minDim * EDGE_MARGIN_RATIO));

  ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const motioW = ctx.measureText("Motio").width;
  const twoW = ctx.measureText("2").width;
  const editW = ctx.measureText("edit").width;
  const textWidth = motioW + twoW + editW;
  const dotR = Math.max(4, Math.round(fontSize * 0.18));
  const rectW = textWidth + pad * 2 + dotR * 2 + 14;
  const rectH = fontSize + pad * 2;
  const rectX = Math.max(margin, w - rectW - margin);
  const rectY = Math.max(margin, h - rectH - margin);
  const dotCx = rectX + pad + dotR;
  const dotCy = rectY + rectH / 2;
  const textX = dotCx + dotR + 8;
  const textY = rectY + pad + fontSize * 0.82;

  // PRIMARY — bottom-right Motio2edit pill
  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(rectX, rectY, rectW, rectH, 8);
  } else {
    ctx.rect(rectX, rectY, rectW, rectH);
  }
  ctx.fill();

  ctx.fillStyle = WATERMARK_BRAND_ORANGE;
  ctx.beginPath();
  ctx.arc(dotCx, dotCy, dotR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.fillText("Motio", textX, textY);
  ctx.fillStyle = WATERMARK_BRAND_ORANGE;
  ctx.fillText("2", textX + motioW, textY);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("edit", textX + motioW + twoW, textY);

  // SECONDARY — top-left icon (FREE only when strong=true)
  if (strong) {
    const icon = Math.max(20, Math.round(minDim * SECONDARY_SIZE_RATIO));
    const ix = margin;
    const iy = margin;
    const cx = ix + icon / 2;
    const cy = iy + icon / 2;
    const R = icon * 0.42;
    const s = icon * 0.28;

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = WATERMARK_BRAND_ORANGE;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s / 3, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s / 3, cy);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - s, cy);
    ctx.lineTo(cx, cy - s / 3);
    ctx.lineTo(cx + s, cy);
    ctx.lineTo(cx, cy + s / 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = WATERMARK_BRAND_ORANGE;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2, icon * 0.06), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Dimension-driven ratio (for debugging / parity with server)
  void detectWatermarkRatioKey(w, h);
  void WATERMARK_BRAND_TEXT;

  return canvas.toDataURL("image/jpeg", 0.92);
}

function loadImage(src: string, crossOrigin: boolean): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Applies the Motio2edit primary mark.
 * When options.strong === true also stamps the secondary top-left icon (FREE).
 * Returns the original URL on failure so the user always gets an image.
 */
export async function watermarkImage(
  url: string,
  options?: { strong?: boolean },
): Promise<string> {
  const strong = options?.strong === true;
  try {
    const isData = url.startsWith("data:") || url.startsWith("blob:");

    let img: HTMLImageElement | null = null;

    if (isData) {
      img = await loadImage(url, false);
    } else {
      try {
        const res = await fetch(url, { mode: "cors", credentials: "omit" });
        if (res.ok) {
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          img = await loadImage(objUrl, false);
          if (img) {
            const out = renderWatermarked(img, strong);
            URL.revokeObjectURL(objUrl);
            if (out) return out;
          }
          URL.revokeObjectURL(objUrl);
        }
      } catch (e) {
        console.warn("[Watermark] fetch/blob path failed, falling back to Image()", e);
      }
      img = await loadImage(url, true);
    }

    if (!img) {
      console.error("[Watermark] Failed to load image:", url?.slice(0, 80));
      return url;
    }

    return renderWatermarked(img, strong) ?? url;
  } catch (err) {
    console.error("[Watermark] Error:", err);
    return url;
  }
}

/** Download-time protection for FREE users: primary + secondary icon. */
export async function applyDownloadWatermarkGrid(imageUrl: string): Promise<string> {
  return watermarkImage(imageUrl, { strong: true });
}
