// Client-side MOTIO2EDIT brand watermark compositor.
//
// IMPORTANT:
// - AI models must NEVER draw the watermark. Generation returns a clean image.
// - This module applies a deterministic overlay AFTER generation.
// - Primary = bottom-right pill "MOTIO2EDIT"
// - Secondary = diagonal grid "MOTIO2EDIT.COM" (FREE plan only)
//
// Policy lives in src/lib/policy.ts (getWatermarkMode / shouldApplySecondaryWatermark).

const BRAND_ORANGE = "#f97316";
const WATERMARK_TEXT = "MOTIO2EDIT";
const DIAGONAL_TEXT = "MOTIO2EDIT.COM";

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

  // PRIMARY watermark — bottom right pill (always when this function runs).
  const fontSize = Math.max(18, Math.round(Math.min(w, h) * 0.028));
  ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const textWidth = ctx.measureText(WATERMARK_TEXT).width;
  const pad = 12;
  const margin = Math.max(12, Math.round(Math.min(w, h) * 0.012));

  const rectX = w - textWidth - pad * 2 - margin - 10;
  const rectY = h - fontSize - pad * 2 - margin;
  const rectW = textWidth + pad * 2 + 10;
  const rectH = fontSize + pad * 2;

  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(rectX, rectY, rectW, rectH, 8);
  } else {
    ctx.rect(rectX, rectY, rectW, rectH);
  }
  ctx.fill();

  ctx.fillStyle = BRAND_ORANGE;
  ctx.beginPath();
  ctx.arc(rectX + 12, rectY + rectH / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.fillText(WATERMARK_TEXT, rectX + 22, rectY + fontSize + 3);

  // SECONDARY diagonal grid — FREE only (strong=true).
  // Responsive tile density based on output dimensions (all aspect ratios).
  if (strong) {
    const diagFont = Math.max(20, Math.round(Math.min(w, h) * 0.032));
    ctx.font = `bold ${diagFont}px Arial, Helvetica, sans-serif`;

    // Dynamic grid: ~3 columns × 3 rows, adjusted for aspect ratio
    const cols = w > h * 1.4 ? 4 : w < h * 0.7 ? 2 : 3;
    const rows = h > w * 1.4 ? 4 : h < w * 0.7 ? 2 : 3;
    const positions: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ((c + 0.5) / cols) * w;
        const y = ((r + 0.5) / rows) * h;
        // Slight offset so marks don't form a rigid lattice
        positions.push({
          x: x + ((r % 2) * 0.04 - 0.02) * w,
          y: y + ((c % 2) * 0.03 - 0.015) * h,
        });
      }
    }

    positions.forEach((pos) => {
      ctx.save();
      // Target ~60–65% perceived presence without destroying the image
      ctx.globalAlpha = 0.62;
      ctx.translate(pos.x, pos.y);
      ctx.rotate(-Math.PI / 5);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = Math.max(2, Math.round(diagFont * 0.12));
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(DIAGONAL_TEXT, 0, 0);
      ctx.fillText(DIAGONAL_TEXT, 0, 0);
      ctx.restore();
    });
  }

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
 * Applies the MOTIO2EDIT primary mark.
 * When options.strong === true also stamps the secondary diagonal grid (FREE).
 * Returns the original URL on failure so the user always gets an image.
 */
export async function watermarkImage(
  url: string,
  options?: { strong?: boolean }
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

/** Download-time protection for FREE users: primary + secondary grid. */
export async function applyDownloadWatermarkGrid(imageUrl: string): Promise<string> {
  return watermarkImage(imageUrl, { strong: true });
}
