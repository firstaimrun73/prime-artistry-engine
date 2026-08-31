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
