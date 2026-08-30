/**
 * Browser bridge between File/ImageBitmap and RGBAImage for filter/lens engines.
 */
import type { RGBAImage } from "@/lib/filter-lens/shared/processing-types";

export async function fileToRGBAImage(file: File): Promise<RGBAImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return {
      width: imageData.width,
      height: imageData.height,
      data: new Uint8ClampedArray(imageData.data),
    };
  } finally {
    bitmap.close();
  }
}

export async function urlToRGBAImage(url: string): Promise<RGBAImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load image");
  const blob = await res.blob();
  const file = new File([blob], "source.jpg", { type: blob.type || "image/jpeg" });
  return fileToRGBAImage(file);
}

export function rgbaImageToBlob(image: RGBAImage, type = "image/png"): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas unavailable"));
  const imageData = new ImageData(image.data, image.width, image.height);
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), type, 0.95);
  });
}

export async function rgbaImageToObjectUrl(image: RGBAImage): Promise<string> {
  const blob = await rgbaImageToBlob(image);
  return URL.createObjectURL(blob);
}
