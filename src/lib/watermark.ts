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

  // PRIMARY watermark — bottom right pill (always applied when this runs).
  const fontSize = Math.max(18, Math.round(w * 0.032));
  ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const textWidth = ctx.measureText(WATERMARK_TEXT).width;
  const pad = 12;
  const margin = 16;

  const rectX = w - textWidth - pad * 2 - margin - 10;
  const rectY = h - fontSize - pad * 2 - margin;
  const rectW = textWidth + pad * 2 + 10;
  const rectH = fontSize + pad * 2;

  // Dark pill background
  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(rectX, rectY, rectW, rectH, 8);
  } else {
    ctx.rect(rectX, rectY, rectW, rectH);
  }
  ctx.fill();

  // Orange accent dot
  ctx.fillStyle = BRAND_ORANGE;
  ctx.beginPath();
  ctx.arc(rectX + 12, rectY + rectH / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // White wordmark
  ctx.fillStyle = "#ffffff";
  ctx.fillText(WATERMARK_TEXT, rectX + 22, rectY + fontSize + 3);

  console.log("[Watermark] Primary pill applied");

  // SECONDARY diagonal grid — FREE users only (strong=true)
  if (strong) {
    const diagFont = Math.max(24, Math.round(w * 0.034));
    ctx.font = `bold ${diagFont}px Arial, Helvetica, sans-serif`;
    const positions = [
      { x: w * 0.18, y: h * 0.22 },
      { x: w * 0.52, y: h * 0.18 },
      { x: w * 0.82, y: h * 0.28 },
      { x: w * 0.12, y: h * 0.55 },
      { x: w * 0.48, y: h * 0.58 },
      { x: w * 0.80, y: h * 0.68 },
      { x: w * 0.30, y: h * 0.85 },
      { x: w * 0.70, y: h * 0.88 },
    ];
    positions.forEach((pos) => {
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.translate(pos.x, pos.y);
      ctx.rotate(-Math.PI / 5);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 4;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(DIAGONAL_TEXT, 0, 0);
      ctx.fillText(DIAGONAL_TEXT, 0, 0);
      ctx.restore();
    });
    console.log("[Watermark] Strong diagonal grid applied");
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

/** Loads an image. Returns null on failure. */
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
 * Applies the MOTIO2EDIT corner mark.
 * When options.strong === true the diagonal download grid is also stamped
 * (used for FREE plan). Returns the original URL on any failure so the user
 * always gets an image.
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
      // Prefer fetch → blob so canvas is never CORS-tainted (fal CDN, Supabase, etc.)
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
      // Fallback: try with crossOrigin
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

/**
 * Download-time protection for FREE users: corner pill + dense diagonal grid.
 */
export async function applyDownloadWatermarkGrid(imageUrl: string): Promise<string> {
  console.log("[Watermark] Applying download watermark grid for free user…");
  return watermarkImage(imageUrl, { strong: true });
}
