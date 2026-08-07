// Client-side MOTIO2EDIT brand watermark.
//
// watermarkImage() bakes a corner mark ("MOTIO2EDIT") into the bottom-right of
// an image. With { strong: true } it also stamps a diagonal grid of
// "MOTIO2EDIT.COM" marks — used for FREE users at download time.

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
  console.log("[Watermark] Canvas size:", w, "x", h);

  // PRIMARY watermark — bottom right pill.
  const fontSize = Math.max(16, Math.round(w * 0.028));
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const textWidth = ctx.measureText(WATERMARK_TEXT).width;
  const pad = 10;
  const margin = 14;

  const rectX = w - textWidth - pad * 2 - margin - 8;
  const rectY = h - fontSize - pad * 2 - margin;
  const rectW = textWidth + pad * 2 + 8;
  const rectH = fontSize + pad * 2;

  ctx.fillStyle = "rgba(0,0,0,0.70)";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(rectX, rectY, rectW, rectH, 6);
  } else {
    ctx.rect(rectX, rectY, rectW, rectH);
  }
  ctx.fill();

  // Orange accent dot.
  ctx.fillStyle = BRAND_ORANGE;
  ctx.beginPath();
  ctx.arc(rectX + 10, rectY + rectH / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // White wordmark.
  ctx.fillStyle = "#ffffff";
  ctx.fillText(WATERMARK_TEXT, rectX + 18, rectY + fontSize + 2);

  console.log("[Watermark] Applied!");

  // DIAGONAL grid (download protection for free users).
  if (strong) {
    const diagFont = Math.max(22, Math.round(w * 0.03));
    ctx.font = `bold ${diagFont}px Arial`;
    const positions = [
      { x: w * 0.2, y: h * 0.25 },
      { x: w * 0.55, y: h * 0.2 },
      { x: w * 0.8, y: h * 0.3 },
      { x: w * 0.15, y: h * 0.65 },
      { x: w * 0.5, y: h * 0.7 },
      { x: w * 0.78, y: h * 0.72 },
    ];
    positions.forEach((pos) => {
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.translate(pos.x, pos.y);
      ctx.rotate(-Math.PI / 5);
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 3;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(DIAGONAL_TEXT, 0, 0);
      ctx.fillText(DIAGONAL_TEXT, 0, 0);
      ctx.restore();
    });
  }

  return canvas.toDataURL("image/jpeg", 0.93);
}

/** Loads an image, retrying without a cache-buster and finally via fetch/blob. */
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
 * Applies the MOTIO2EDIT corner mark. When `options.strong` is true the
 * diagonal download grid is stamped as well. Returns the original URL on
 * any failure so the user always gets an image.
 */
export async function watermarkImage(
  url: string,
  options?: { strong?: boolean }
): Promise<string> {
  const strong = options?.strong === true;
  try {
    // data: URLs need no cache-buster and no CORS handling.
    const isData = url.startsWith("data:") || url.startsWith("blob:");
    const separator = url.includes("?") ? "&" : "?";
    const busted = isData ? url : `${url}${separator}_wm=${Date.now()}`;

    let img = await loadImage(busted, !isData);
    if (!img && !isData) {
      console.warn("[Watermark] Retrying without cache buster");
      img = await loadImage(url, true);
    }
    if (!img && !isData) {
      console.warn("[Watermark] Retrying via fetch/blob");
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        img = await loadImage(objUrl, false);
        if (img) {
          const out = renderWatermarked(img, strong);
          URL.revokeObjectURL(objUrl);
          return out ?? url;
        }
        URL.revokeObjectURL(objUrl);
      } catch (e) {
        console.error("[Watermark] fetch/blob fallback failed:", e);
      }
    }
    if (!img) {
      console.error("[Watermark] Failed to load image:", url);
      return url;
    }

    const output = renderWatermarked(img, strong);
    return output ?? url;
  } catch (err) {
    console.error("[Watermark] Error:", err);
    return url;
  }
}

/**
 * Download-time protection for FREE users: corner pill + 6 diagonal marks.
 */
export async function applyDownloadWatermarkGrid(imageUrl: string): Promise<string> {
  console.log("[Watermark] Applying download watermark grid for free user…");
  return watermarkImage(imageUrl, { strong: true });
}
