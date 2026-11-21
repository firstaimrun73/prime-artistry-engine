/**
 * Maluto AI — strict 2MP image normalization (client-side).
 * width * height <= 2_000_000. Preserves aspect ratio. No user prompts.
 */
export const MALUTO_MAX_PIXELS = 2_000_000;
export const MALUTO_MAX_MB = 25;

export type NormalizeResult = {
  file: File;
  width: number;
  height: number;
  resized: boolean;
  originalWidth: number;
  originalHeight: number;
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

/** Scale so width*height <= maxPixels, preserving aspect ratio. */
export function fitWithinMegapixels(
  width: number,
  height: number,
  maxPixels = MALUTO_MAX_PIXELS,
): { width: number; height: number } {
  const px = width * height;
  if (px <= maxPixels || width <= 0 || height <= 0) {
    return { width, height };
  }
  const scale = Math.sqrt(maxPixels / px);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Normalize an image File to <= 2MP JPEG (or PNG if transparency needed).
 * Handles EXIF orientation via browser drawImage.
 * Skips work when already within limit.
 */
export async function normalizeImageTo2MP(file: File): Promise<NormalizeResult> {
  const img = await loadImageFromFile(file);
  const originalWidth = img.naturalWidth || img.width;
  const originalHeight = img.naturalHeight || img.height;
  const { width, height } = fitWithinMegapixels(originalWidth, originalHeight);
  const resized = width !== originalWidth || height !== originalHeight;

  if (!resized && file.size <= MALUTO_MAX_MB * 1024 * 1024) {
    return {
      file,
      width: originalWidth,
      height: originalHeight,
      resized: false,
      originalWidth,
      originalHeight,
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  const preferPng =
    file.type === "image/png" ||
    file.type === "image/webp" ||
    /\.png$/i.test(file.name);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encode failed"))),
      preferPng ? "image/png" : "image/jpeg",
      preferPng ? undefined : 0.92,
    );
  });

  const outName = file.name.replace(/\.[^.]+$/, "") + (preferPng ? ".png" : ".jpg");
  const outFile = new File([blob], outName, {
    type: preferPng ? "image/png" : "image/jpeg",
    lastModified: Date.now(),
  });

  return {
    file: outFile,
    width,
    height,
    resized: true,
    originalWidth,
    originalHeight,
  };
}
