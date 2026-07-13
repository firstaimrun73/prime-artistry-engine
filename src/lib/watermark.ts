// Client-side MOTIO2EDIT brand watermark.
//
// Bakes a small, premium, semi-transparent branded mark into the bottom-right
// corner of an image. It mirrors the homepage logo: a sparkle glyph followed by
// "MOTIO2EDIT" with the "2" rendered in the MOTIO2EDIT brand orange. The mark is
// intentionally small (scales with image width), placed in a low-importance
// corner so it never covers faces or key subjects, and drawn at high resolution
// so it survives download/encoding without degrading image quality.

// Brand orange — matches the primary token used across the app (oklch(0.7 0.19 45)).
const BRAND_ORANGE = "#F97316";

// Draw a four-point sparkle (the homepage logo mark) centred at (cx, cy).
function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.beginPath();
  // Two crossed 4-point stars create the sparkle silhouette.
  const inner = r * 0.32;
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i;
    const nx = Math.cos(a), ny = Math.sin(a);
    const px = Math.cos(a + Math.PI / 4), py = Math.sin(a + Math.PI / 4);
    if (i === 0) ctx.moveTo(nx * r, ny * r);
    else ctx.lineTo(nx * r, ny * r);
    ctx.lineTo(px * inner, py * inner);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export async function watermarkImage(src: string): Promise<string> {
  // Fetch as a blob first to avoid canvas cross-origin tainting on fal URLs.
  const res = await fetch(src);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;

  ctx.drawImage(bitmap, 0, 0);

  // Scale every element off the image width so the mark stays proportional.
  const W = canvas.width;
  const fontSize = Math.max(13, Math.round(W * 0.026));
  const padX = Math.round(fontSize * 0.7);
  const padY = Math.round(fontSize * 0.42);
  const gap = Math.round(fontSize * 0.45); // sparkle ↔ text gap
  const sparkleR = fontSize * 0.42;

  ctx.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  // Measure the full "MOTIO2EDIT" string to size the pill.
  const parts = [
    { t: "MOTIO", c: "rgba(255,255,255,0.96)" },
    { t: "2", c: BRAND_ORANGE },
    { t: "EDIT", c: "rgba(255,255,255,0.96)" },
  ];
  const textW = parts.reduce((w, p) => w + ctx.measureText(p.t).width, 0);
  const contentW = sparkleR * 2 + gap + textW;
  const pillW = contentW + padX * 2;
  const pillH = fontSize + padY * 2;
  const margin = Math.round(fontSize * 0.7);
  const pillX = W - pillW - margin;
  const pillY = canvas.height - pillH - margin;
  const radius = pillH / 2;

  // Semi-transparent rounded "glass" pill — premium, non-intrusive.
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(pillX + radius, pillY);
  ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillH, radius);
  ctx.arcTo(pillX + pillW, pillY + pillH, pillX, pillY + pillH, radius);
  ctx.arcTo(pillX, pillY + pillH, pillX, pillY, radius);
  ctx.arcTo(pillX, pillY, pillX + pillW, pillY, radius);
  ctx.closePath();
  ctx.fillStyle = "rgba(15,15,18,0.55)";
  ctx.fill();
  ctx.lineWidth = Math.max(1, fontSize * 0.05);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.stroke();
  ctx.restore();

  // Sparkle mark.
  const midY = pillY + pillH / 2;
  let cursor = pillX + padX;
  ctx.save();
  ctx.globalAlpha = 0.95;
  drawSparkle(ctx, cursor + sparkleR, midY, sparkleR, BRAND_ORANGE);
  cursor += sparkleR * 2 + gap;

  // Wordmark with the brand "2".
  for (const p of parts) {
    ctx.fillStyle = p.c;
    ctx.fillText(p.t, cursor, midY + fontSize * 0.04);
    cursor += ctx.measureText(p.t).width;
  }
  ctx.restore();

  return new Promise((resolve) => {
    // PNG keeps the mark crisp and lossless; falls back to the original on failure.
    canvas.toBlob((b) => resolve(b ? URL.createObjectURL(b) : src), "image/png");
  });
}

const WATERMARK_TEXT = "MOTIO2EDIT.COM";

/**
 * Download-time protection for FREE users only. Applies a staggered grid of
 * diagonal "MOTIO2EDIT.COM" marks across the whole image on top of the
 * already-branded output, so saved files can't be used without attribution.
 * Returns an object URL; falls back to the source on any failure.
 */
export async function applyDownloadWatermarkGrid(imageUrl: string): Promise<string> {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return imageUrl;
    ctx.drawImage(bitmap, 0, 0);

    const W = canvas.width;
    const H = canvas.height;

    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const tiles = [
      { xr: 0.15, yr: 0.15, size: 0.045 },
      { xr: 0.5, yr: 0.1, size: 0.06 },
      { xr: 0.85, yr: 0.2, size: 0.04 },
      { xr: 0.25, yr: 0.5, size: 0.055 },
      { xr: 0.7, yr: 0.5, size: 0.05 },
      { xr: 0.15, yr: 0.85, size: 0.045 },
      { xr: 0.75, yr: 0.85, size: 0.06 },
    ];

    for (const t of tiles) {
      const fontSize = Math.max(14, Math.floor(W * t.size));
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.save();
      ctx.translate(W * t.xr, H * t.yr);
      ctx.rotate(-Math.PI / 4);
      ctx.strokeText(WATERMARK_TEXT, 0, 0);
      ctx.fillText(WATERMARK_TEXT, 0, 0);
      ctx.restore();
    }

    ctx.restore();

    return await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b ? URL.createObjectURL(b) : imageUrl), "image/png");
    });
  } catch {
    return imageUrl;
  }
}
