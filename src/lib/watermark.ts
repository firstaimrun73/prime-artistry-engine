// Client-side MOTIO2EDIT brand watermark.
//
// watermarkImage() bakes a small, premium corner mark ("✦ MOTIO2EDIT") into the
// bottom-right of an image. applyDownloadWatermarkGrid() additionally stamps a
// diagonal grid of "MOTIO2EDIT.COM" marks — used for FREE users at download.

const BRAND_ORANGE = "#f97316";
const WATERMARK_TEXT = "MOTIO2EDIT.COM";

/** Loads an image element, working around cross-origin canvas tainting. */
async function loadImage(url: string): Promise<HTMLImageElement> {
  const direct = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  if (direct) return direct;

  // Fallback: fetch as a blob (handles hosts without CORS headers on <img>).
  console.warn("[watermark] direct image load failed — retrying via fetch/blob");
  const res = await fetch(url);
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = objUrl;
  });
}

/** Draws the bottom-right brand pill onto a canvas context. */
function drawCornerPill(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const fontSize = Math.max(14, canvas.width * 0.025);
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const text = "✦ MOTIO2EDIT";
  const metrics = ctx.measureText(text);
  const pad = 10;
  const x = canvas.width - metrics.width - pad * 2 - 16;
  const y = canvas.height - fontSize - pad * 2 - 16;

  // Dark pill background.
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.beginPath();
  const bx = x - pad;
  const by = y - fontSize;
  const bw = metrics.width + pad * 2;
  const bh = fontSize + pad * 2;
  const r = 6;
  ctx.moveTo(bx + r, by);
  ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
  ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
  ctx.arcTo(bx, by + bh, bx, by, r);
  ctx.arcTo(bx, by, bx + bw, by, r);
  ctx.closePath();
  ctx.fill();

  // Orange accent dot.
  ctx.fillStyle = BRAND_ORANGE;
  ctx.beginPath();
  ctx.arc(x - pad + 8, y - fontSize / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // White wordmark.
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fillText(text, x, y);
}

/** Stamps 6 diagonal "MOTIO2EDIT.COM" marks across the whole canvas. */
function applyDownloadWatermarks(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const positions = [
    { x: 0.2, y: 0.2 },
    { x: 0.5, y: 0.2 },
    { x: 0.8, y: 0.2 },
    { x: 0.2, y: 0.7 },
    { x: 0.5, y: 0.7 },
    { x: 0.8, y: 0.7 },
  ];
  const fontSize = Math.max(22, Math.round(canvas.width * 0.035));
  positions.forEach((pos) => {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = "white";
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 3;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(canvas.width * pos.x, canvas.height * pos.y);
    ctx.rotate(-Math.PI / 5);
    ctx.strokeText(WATERMARK_TEXT, 0, 0);
    ctx.fillText(WATERMARK_TEXT, 0, 0);
    ctx.restore();
  });
}

/**
 * Applies the MOTIO2EDIT corner mark. When `opts.strong` is true, the diagonal
 * download grid is stamped as well. Returns the original URL on any failure.
 */
export async function watermarkImage(url: string, opts: { strong?: boolean } = {}): Promise<string> {
  console.log("1. watermarkImage called:", url.slice(0, 100));
  try {
    const img = await loadImage(url);
    console.log("4. Image loaded", img.width, "x", img.height);

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    console.log("3. Canvas created", canvas.width, canvas.height);
    if (!ctx) return url;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (opts.strong) applyDownloadWatermarks(canvas, ctx);
    drawCornerPill(canvas, ctx);
    console.log("5. Watermark drawn");

    const outputUrl = canvas.toDataURL("image/jpeg", 0.92);
    console.log("6. Output URL:", outputUrl.slice(0, 60), `(${outputUrl.length} bytes)`);
    return outputUrl;
  } catch (err) {
    console.error("[watermark] failed, serving original:", err);
    return url;
  }
}

/**
 * Download-time protection for FREE users: corner pill + 6 diagonal marks.
 */
export async function applyDownloadWatermarkGrid(imageUrl: string): Promise<string> {
  console.log("[watermark] Applying download watermark grid for free user…");
  return watermarkImage(imageUrl, { strong: true });
}
