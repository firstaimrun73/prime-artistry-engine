/**
 * Widevista — client preview + final processing helpers.
 *
 * NO STRETCH RULE: never scale X/Y independently. Never squash faces.
 * Preview uses a mild radial FOV simulation that preserves pixel aspect.
 * Final path is structured for server-side intelligent expansion when available;
 * client final applies the same no-stretch optical treatment at full resolution.
 */

import { analyzeAspect, widevistaIntensity, type AspectAnalysis } from "./aspect";

export type WidevistaResult = {
  canvas: HTMLCanvasElement;
  analysis: AspectAnalysis;
  intensity: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for lens processing."));
    img.src = src;
  });
}

/**
 * Mild barrel-style FOV simulation that keeps the output canvas the same
 * pixel dimensions as the source (native ratio preserved).
 * Mapping is rotationally symmetric — no horizontal-only stretch.
 */
function applyWidevistaOptical(
  src: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
  intensity: number,
): HTMLCanvasElement {
  const w =
    "videoWidth" in src && src.videoWidth
      ? src.videoWidth
      : "naturalWidth" in src && src.naturalWidth
        ? src.naturalWidth
        : (src as HTMLCanvasElement).width;
  const h =
    "videoHeight" in src && src.videoHeight
      ? src.videoHeight
      : "naturalHeight" in src && src.naturalHeight
        ? src.naturalHeight
        : (src as HTMLCanvasElement).height;

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) return out;

  ctx.drawImage(src as CanvasImageSource, 0, 0, w, h);

  if (intensity <= 0.01) return out;

  const srcData = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const s = srcData.data;
  const d = dst.data;

  const k = Math.min(0.28, intensity * 0.32);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / maxR;
      const dy = (y - cy) / maxR;
      const r2 = dx * dx + dy * dy;
      const factor = 1 + k * r2;
      const sx = cx + (x - cx) / factor;
      const sy = cy + (y - cy) / factor;

      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(w - 1, x0 + 1);
      const y1 = Math.min(h - 1, y0 + 1);
      const fx = sx - x0;
      const fy = sy - y0;

      const i00 = (Math.max(0, Math.min(h - 1, y0)) * w + Math.max(0, Math.min(w - 1, x0))) * 4;
      const i10 = (Math.max(0, Math.min(h - 1, y0)) * w + x1) * 4;
      const i01 = (y1 * w + Math.max(0, Math.min(w - 1, x0))) * 4;
      const i11 = (y1 * w + x1) * 4;

      const di = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        const v00 = s[i00 + c];
        const v10 = s[i10 + c];
        const v01 = s[i01 + c];
        const v11 = s[i11 + c];
        d[di + c] =
          (1 - fx) * (1 - fy) * v00 + fx * (1 - fy) * v10 + (1 - fx) * fy * v01 + fx * fy * v11;
      }
    }
  }

  ctx.putImageData(dst, 0, 0);

  const g = ctx.createRadialGradient(cx, cy, maxR * 0.55, cx, cy, maxR);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${0.12 + intensity * 0.1})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  return out;
}

export async function widevistaPreviewFromUrl(url: string): Promise<WidevistaResult> {
  const img = await loadImage(url);
  const analysis = analyzeAspect(img.naturalWidth, img.naturalHeight);
  const intensity = widevistaIntensity(analysis);
  const canvas = applyWidevistaOptical(img, intensity * 0.85);
  return { canvas, analysis, intensity };
}

export async function widevistaFinalFromUrl(url: string): Promise<WidevistaResult> {
  const img = await loadImage(url);
  const analysis = analyzeAspect(img.naturalWidth, img.naturalHeight);
  const intensity = widevistaIntensity(analysis);
  const canvas = applyWidevistaOptical(img, intensity);
  return { canvas, analysis, intensity };
}

export function widevistaFromVideoFrame(video: HTMLVideoElement): WidevistaResult {
  const analysis = analyzeAspect(video.videoWidth || 1, video.videoHeight || 1);
  const intensity = widevistaIntensity(analysis);
  const canvas = applyWidevistaOptical(video, intensity);
  return { canvas, analysis, intensity };
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode result."))), type, quality);
  });
}
