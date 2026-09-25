import type { AspectPresetId, CropGeometry } from "./types";

/** Browser canvas soft limit — larger bitmaps often draw blank on mobile Safari/Chrome. */
export const CROPMIX_MAX_SOURCE_SIDE = 4096;

export const DEFAULT_CROP: CropGeometry = {
  x: 0, y: 0, w: 1, h: 1, straighten: 0, rotate90: 0,
  flipH: false, flipV: false, aspectId: "free", customW: 1, customH: 1,
};

export const ASPECT_PRESETS: { id: AspectPresetId; label: string; ratio: number | null }[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "original", label: "Original", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
  { id: "2:3", label: "2:3", ratio: 2 / 3 },
  { id: "custom", label: "Custom", ratio: null },
];

export function presetDiagramRatio(id: AspectPresetId, customW = 1, customH = 1): number | null {
  if (id === "free" || id === "original") return null;
  if (id === "custom") return customW > 0 && customH > 0 ? customW / customH : 1;
  const p = ASPECT_PRESETS.find((x) => x.id === id);
  return p?.ratio ?? null;
}

export function readExifOrientation(buf: ArrayBuffer): number {
  const view = new DataView(buf);
  if (view.byteLength < 2 || view.getUint16(0, false) !== 0xffd8) return 1;
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xffe1) {
      const size = view.getUint16(offset, false);
      if (offset + size > view.byteLength) break;
      if (view.getUint32(offset + 2, false) === 0x45786966 && view.getUint16(offset + 6, false) === 0) {
        const tiff = offset + 8;
        const little = view.getUint16(tiff, false) === 0x4949;
        const ifd0 = tiff + view.getUint32(tiff + 4, little);
        if (ifd0 + 2 > view.byteLength) break;
        const entries = view.getUint16(ifd0, little);
        for (let i = 0; i < entries; i++) {
          const e = ifd0 + 2 + i * 12;
          if (e + 12 > view.byteLength) break;
          if (view.getUint16(e, little) === 0x0112) return view.getUint16(e + 8, little) || 1;
        }
      }
      offset += size;
    } else if ((marker & 0xff00) !== 0xff00) break;
    else if (marker === 0xffda || marker === 0xffd9) break;
    else {
      const size = view.getUint16(offset, false);
      offset += size;
    }
  }
  return 1;
}

/**
 * Decode with EXIF orientation applied, downscaling if needed so the bitmap
 * stays within browser canvas limits (blank draw is common above ~4096).
 */
export function drawOriented(
  img: HTMLImageElement | ImageBitmap,
  orientation: number,
  canvas: HTMLCanvasElement,
  maxSide = CROPMIX_MAX_SOURCE_SIDE,
): { width: number; height: number } {
  const sw = "naturalWidth" in img ? img.naturalWidth : img.width;
  const sh = "naturalHeight" in img ? img.naturalHeight : img.height;
  if (!sw || !sh) return { width: 1, height: 1 };

  const swap = orientation >= 5 && orientation <= 8;
  let dw = swap ? sh : sw;
  let dh = swap ? sw : sh;

  const scaleDown = Math.min(1, maxSide / Math.max(dw, dh));
  dw = Math.max(1, Math.round(dw * scaleDown));
  dh = Math.max(1, Math.round(dh * scaleDown));

  const srcDrawW = Math.max(1, Math.round(sw * scaleDown));
  const srcDrawH = Math.max(1, Math.round(sh * scaleDown));

  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { width: dw, height: dh };
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.save();
  switch (orientation) {
    case 2:
      ctx.translate(dw, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(dw, dh);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, dh);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -srcDrawH);
      break;
    case 7:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(dw, -srcDrawH);
      ctx.scale(-1, 1);
      break;
    case 8:
      ctx.rotate(-0.5 * Math.PI);
      ctx.translate(-srcDrawW, 0);
      break;
  }
  ctx.drawImage(img as CanvasImageSource, 0, 0, srcDrawW, srcDrawH);
  ctx.restore();
  return { width: dw, height: dh };
}

export function clampCrop(g: CropGeometry): CropGeometry {
  const x = Math.max(0, Math.min(1, g.x));
  const y = Math.max(0, Math.min(1, g.y));
  const w = Math.max(0.02, Math.min(1 - x, g.w));
  const h = Math.max(0.02, Math.min(1 - y, g.h));
  return { ...g, x, y, w, h };
}

function fitRatioBox(ratio: number, srcW: number, srcH: number): { x: number; y: number; w: number; h: number } {
  const imgRatio = srcW / Math.max(1, srcH);
  let w = 1;
  let h = 1;
  if (imgRatio > ratio) {
    h = 1;
    w = ratio / imgRatio;
  } else {
    w = 1;
    h = imgRatio / ratio;
  }
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

export function applyAspect(g: CropGeometry, srcW: number, srcH: number): CropGeometry {
  if (g.aspectId === "original") return clampCrop({ ...g, x: 0, y: 0, w: 1, h: 1 });
  if (g.aspectId === "free") return clampCrop(g);

  let ratio: number | null = null;
  if (g.aspectId === "custom") {
    if (g.customW > 0 && g.customH > 0) ratio = g.customW / g.customH;
  } else {
    const preset = ASPECT_PRESETS.find((p) => p.id === g.aspectId);
    ratio = preset?.ratio ?? null;
  }
  if (ratio == null || !Number.isFinite(ratio) || ratio <= 0) return clampCrop(g);

  const box = fitRatioBox(ratio, srcW, srcH);
  return clampCrop({ ...g, ...box });
}

export type HistoryStack<T> = { past: T[]; present: T; future: T[] };

export function historyInit<T>(present: T): HistoryStack<T> {
  return { past: [], present, future: [] };
}

export function historyPush<T>(stack: HistoryStack<T>, next: T, max = 40): HistoryStack<T> {
  const past = [...stack.past, stack.present].slice(-max);
  return { past, present: next, future: [] };
}

export function historyUndo<T>(stack: HistoryStack<T>): HistoryStack<T> {
  if (!stack.past.length) return stack;
  return {
    past: stack.past.slice(0, -1),
    present: stack.past[stack.past.length - 1],
    future: [stack.present, ...stack.future],
  };
}

export function historyRedo<T>(stack: HistoryStack<T>): HistoryStack<T> {
  if (!stack.future.length) return stack;
  return {
    past: [...stack.past, stack.present],
    present: stack.future[0],
    future: stack.future.slice(1),
  };
}

export function renderCropToCanvas(
  source: HTMLCanvasElement,
  g: CropGeometry,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const sw = source.width;
  const sh = source.height;
  const sx = Math.round(g.x * sw);
  const sy = Math.round(g.y * sh);
  const cw = Math.max(1, Math.round(g.w * sw));
  const ch = Math.max(1, Math.round(g.h * sh));
  const r = ((g.rotate90 % 4) + 4) % 4;
  const outW = r === 1 || r === 3 ? ch : cw;
  const outH = r === 1 || r === 3 ? cw : ch;

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.save();

  if (r === 1) {
    ctx.translate(outW, 0);
    ctx.rotate(0.5 * Math.PI);
  } else if (r === 2) {
    ctx.translate(outW, outH);
    ctx.rotate(Math.PI);
  } else if (r === 3) {
    ctx.translate(0, outH);
    ctx.rotate(-0.5 * Math.PI);
  }

  if (g.flipH || g.flipV) {
    ctx.translate(g.flipH ? cw : 0, g.flipV ? ch : 0);
    ctx.scale(g.flipH ? -1 : 1, g.flipV ? -1 : 1);
  }

  ctx.drawImage(source, sx, sy, cw, ch, 0, 0, cw, ch);
  ctx.restore();
  return { canvas: out, width: outW, height: outH };
}
