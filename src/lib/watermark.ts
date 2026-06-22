// Client-side watermark for FREE users only.
// Bakes a small, low-opacity "MOTIO2EDIT" mark into the bottom-right corner so
// it does not disturb the image. Paid users skip this entirely.

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

  const fontSize = Math.max(14, Math.round(canvas.width * 0.028));
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  const pad = Math.round(fontSize * 0.6);
  const x = canvas.width - pad;
  const y = canvas.height - pad;

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillText("MOTIO2EDIT", x + 1, y + 1);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText("MOTIO2EDIT", x, y);
  ctx.globalAlpha = 1;

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b ? URL.createObjectURL(b) : src), "image/png");
  });
}
