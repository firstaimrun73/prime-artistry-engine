/**
 * Browser bridge between File/ImageBitmap and RGBAImage for filter/lens engines.
 * Safari-safe ImageData path — never pass a raw buffer to the ImageData constructor.
 */
import type { RGBAImage } from "@/lib/filter-lens/shared/processing-types";

export async function fileToRGBAImage(file: File): Promise<RGBAImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Fallback for formats createImageBitmap rejects
    const url = URL.createObjectURL(file);
    try {
      const img = await loadHtmlImage(url);
      return drawElementToRGBA(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  try {
    return drawElementToRGBA(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = url;
  });
}

function drawElementToRGBA(
  source: ImageBitmap | HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): RGBAImage {
  if (width < 1 || height < 1) throw new Error("Invalid image dimensions");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(source as CanvasImageSource, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  // Always copy — ImageData buffer can be detached later
  return {
    width,
    height,
    data: new Uint8ClampedArray(imageData.data),
  };
}

export async function urlToRGBAImage(url: string): Promise<RGBAImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load image");
  const blob = await res.blob();
  const file = new File([blob], "source.jpg", { type: blob.type || "image/jpeg" });
  return fileToRGBAImage(file);
}

/** Mean absolute difference across RGB channels (0–255). */
export function meanAbsDiff(a: RGBAImage, b: RGBAImage): number {
  if (a.width !== b.width || a.height !== b.height) return 255;
  const n = a.data.length;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i += 4) {
    sum += Math.abs(a.data[i] - b.data[i]);
    sum += Math.abs(a.data[i + 1] - b.data[i + 1]);
    sum += Math.abs(a.data[i + 2] - b.data[i + 2]);
    count += 3;
  }
  return count ? sum / count : 0;
}

export function rgbaImageToBlob(image: RGBAImage, type = "image/png"): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return Promise.reject(new Error("Canvas unavailable"));

  // Safari-safe: createImageData + set, never `new ImageData(sharedArray, …)`
  const imageData = ctx.createImageData(image.width, image.height);
  if (image.data.length !== imageData.data.length) {
    return Promise.reject(
      new Error(`Pixel buffer size mismatch: ${image.data.length} vs ${imageData.data.length}`),
    );
  }
  imageData.data.set(image.data);
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), type, 0.95);
  });
}

export async function rgbaImageToObjectUrl(image: RGBAImage): Promise<string> {
  const blob = await rgbaImageToBlob(image);
  return URL.createObjectURL(blob);
}

/** Bilinear downscale for preview pipelines (source remains full-res for Apply/Download). */
export function downscale(image: RGBAImage, maxDimension: number): RGBAImage {
  const long = Math.max(image.width, image.height);
  if (long <= maxDimension) {
    return { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
  }
  const scale = maxDimension / long;
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));
  const out = new Uint8ClampedArray(w * h * 4);
  const xRatio = (image.width - 1) / Math.max(1, w - 1);
  const yRatio = (image.height - 1) / Math.max(1, h - 1);
  for (let y = 0; y < h; y++) {
    const sy = y * yRatio;
    const y0 = Math.floor(sy);
    const y1 = Math.min(image.height - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < w; x++) {
      const sx = x * xRatio;
      const x0 = Math.floor(sx);
      const x1 = Math.min(image.width - 1, x0 + 1);
      const fx = sx - x0;
      const i00 = (y0 * image.width + x0) * 4;
      const i10 = (y0 * image.width + x1) * 4;
      const i01 = (y1 * image.width + x0) * 4;
      const i11 = (y1 * image.width + x1) * 4;
      const di = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        const v0 = image.data[i00 + c] * (1 - fx) + image.data[i10 + c] * fx;
        const v1 = image.data[i01 + c] * (1 - fx) + image.data[i11 + c] * fx;
        out[di + c] = (v0 * (1 - fy) + v1 * fy + 0.5) | 0;
      }
    }
  }
  return { width: w, height: h, data: out };
}
