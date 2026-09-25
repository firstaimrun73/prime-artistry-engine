import type { CollageCell, CollageCustomize, CollageStyleId, CollageCanvasRatio, PhotoSlot } from "./types";
import { getLayoutRects, canvasSizeForRatio } from "./collage-layout";

export type RenderCollageOptions = {
  styleId: CollageStyleId;
  photos: PhotoSlot[];
  cells: CollageCell[];
  customize?: CollageCustomize;
  ratio?: CollageCanvasRatio;
  maxSide?: number;
};

/** Client-side collage render (common / preview). Returns data URL. */
export async function renderCollageClient(
  opts: RenderCollageOptions,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const { styleId, photos, cells, customize, ratio = "1:1", maxSide = 1080 } = opts;
  const { width, height } = canvasSizeForRatio(ratio, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const bg = customize?.background ?? "#0B0B18";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const rects = getLayoutRects(styleId, cells.length, customize);
  const border = customize?.border ?? 0;
  const radius = customize?.cornerRadius ?? 0;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const rect = rects[i];
    if (!rect) continue;
    const photo = photos.find((p) => p.id === cell.photoId);
    if (!photo) continue;

    const img = await loadImage(photo.previewUrl || photo.sourceUrl);
    const rx = rect.x * width;
    const ry = rect.y * height;
    const rw = rect.w * width;
    const rh = rect.h * height;

    ctx.save();
    if (radius > 0) {
      roundRect(ctx, rx, ry, rw, rh, radius);
      ctx.clip();
    }

    const zoom = cell.zoom || 1;
    const fit = cell.fit || "fill";
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    let dw = rw * zoom;
    let dh = rh * zoom;
    const scale =
      fit === "fit"
        ? Math.min(rw / iw, rh / ih) * zoom
        : Math.max(rw / iw, rh / ih) * zoom;
    dw = iw * scale;
    dh = ih * scale;
    const ox = rx + (rw - dw) / 2 + (cell.offsetX || 0) * rw;
    const oy = ry + (rh - dh) / 2 + (cell.offsetY || 0) * rh;
    ctx.drawImage(img, ox, oy, dw, dh);

    if (border > 0) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = border;
      if (radius > 0) {
        roundRect(ctx, rx, ry, rw, rh, radius);
        ctx.stroke();
      } else {
        ctx.strokeRect(rx, ry, rw, rh);
      }
    }
    ctx.restore();
  }

  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.92),
    width,
    height,
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
