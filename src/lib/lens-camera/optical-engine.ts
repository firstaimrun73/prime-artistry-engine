/**
 * Motio2edit Lens optical engine — pure client-side camera software.
 * Each lens has a distinct geometric / photometric treatment.
 * Capture + processing here is FREE (no credits). Native aspect ratio preserved.
 */
import type { CameraLensDef } from "@/lib/lens-camera/roster";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for lens processing."));
    img.src = src;
  });
}

function dims(src: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement) {
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
  return { w, h };
}

function canvasFrom(src: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, 0, 0, w, h);
  return c;
}

function radialMap(src: HTMLCanvasElement, k: number, strength = 1): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  const s = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const dst = ctx.createImageData(w, h);
  const d = dst.data;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy) || 1;
  const kk = k * strength;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / maxR;
      const dy = (y - cy) / maxR;
      const r2 = dx * dx + dy * dy;
      const factor = 1 + kk * r2;
      const sx = cx + (x - cx) / factor;
      const sy = cy + (y - cy) / factor;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(w - 1, Math.max(0, x0 + 1));
      const y1 = Math.min(h - 1, Math.max(0, y0 + 1));
      const fx = sx - x0;
      const fy = sy - y0;
      const clamp = (v: number, m: number) => Math.max(0, Math.min(m, v));
      const i00 = (clamp(y0, h - 1) * w + clamp(x0, w - 1)) * 4;
      const i10 = (clamp(y0, h - 1) * w + x1) * 4;
      const i01 = (y1 * w + clamp(x0, w - 1)) * 4;
      const i11 = (y1 * w + x1) * 4;
      const di = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        d[di + c] =
          (1 - fx) * (1 - fy) * s[i00 + c] +
          fx * (1 - fy) * s[i10 + c] +
          (1 - fx) * fy * s[i01 + c] +
          fx * fy * s[i11 + c];
      }
    }
  }
  ctx.putImageData(dst, 0, 0);
  return out;
}

function fisheyeMap(src: HTMLCanvasElement, strength = 0.85): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const s = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const dst = ctx.createImageData(w, h);
  const d = dst.data;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const R = Math.min(cx, cy) * 0.98;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      const di = (y * w + x) * 4;
      if (r > R) {
        d[di] = d[di + 1] = d[di + 2] = 0;
        d[di + 3] = 255;
        continue;
      }
      const rn = r / R;
      const theta = Math.atan2(dy, dx);
      const srcR = Math.pow(rn, 1 / (1 + strength * 0.9)) * Math.min(cx, cy);
      const sx = cx + Math.cos(theta) * srcR;
      const sy = cy + Math.sin(theta) * srcR;
      const x0 = Math.max(0, Math.min(w - 1, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(h - 1, Math.floor(sy)));
      const si = (y0 * w + x0) * 4;
      d[di] = s[si];
      d[di + 1] = s[si + 1];
      d[di + 2] = s[si + 2];
      d[di + 3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
  return out;
}

function teleCrop(src: HTMLCanvasElement, zoom: number): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const z = Math.max(1.05, Math.min(2.4, zoom));
  const cw = w / z;
  const ch = h / z;
  const sx = (w - cw) / 2;
  const sy = (h - ch) / 2;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, sx, sy, cw, ch, 0, 0, w, h);
  return out;
}

function portraitBloom(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const blurred = document.createElement("canvas");
  blurred.width = w;
  blurred.height = h;
  const bctx = blurred.getContext("2d")!;
  bctx.filter = "blur(6px)";
  bctx.drawImage(src, 0, 0);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  const sharp = src.getContext("2d")!.getImageData(0, 0, w, h);
  const soft = bctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy) || 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxR;
      const t = Math.min(1, Math.max(0, (r - 0.35) / 0.55));
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        dst.data[i + c] = sharp.data[i + c] * (1 - t) + soft.data[i + c] * t;
      }
      dst.data[i + 3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
  return out;
}

function softFocus(src: HTMLCanvasElement, amount = 3): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  ctx.globalAlpha = 0.45;
  ctx.filter = `blur(${amount}px)`;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  return out;
}

function diffusionGlow(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.35;
  ctx.filter = "blur(12px)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return out;
}

function colorGrade(
  src: HTMLCanvasElement,
  opts: { sat?: number; contrast?: number; brightness?: number; hue?: number; sepia?: number },
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d")!;
  const parts: string[] = [];
  if (opts.brightness != null) parts.push(`brightness(${opts.brightness})`);
  if (opts.contrast != null) parts.push(`contrast(${opts.contrast})`);
  if (opts.sat != null) parts.push(`saturate(${opts.sat})`);
  if (opts.hue != null) parts.push(`hue-rotate(${opts.hue}deg)`);
  if (opts.sepia != null) parts.push(`sepia(${opts.sepia})`);
  ctx.filter = parts.join(" ") || "none";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  return out;
}

function infraredLook(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const ir = Math.min(255, g * 1.35 + r * 0.2);
    d[i] = Math.min(255, ir * 0.9 + 20);
    d[i + 1] = Math.min(255, ir * 0.75);
    d[i + 2] = Math.min(255, b * 0.35 + r * 0.15);
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

function starflare(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = softFocus(src, 1.5);
  const ctx = out.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.2;
  ctx.filter = "blur(8px) brightness(1.3)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return out;
}

function prismEcho(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.18;
  ctx.drawImage(src, 3, 0);
  ctx.globalAlpha = 0.12;
  ctx.drawImage(src, -3, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return out;
}

function tiltShift(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const blurred = document.createElement("canvas");
  blurred.width = w;
  blurred.height = h;
  const bctx = blurred.getContext("2d")!;
  bctx.filter = "blur(5px)";
  bctx.drawImage(src, 0, 0);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  const sharp = src.getContext("2d")!.getImageData(0, 0, w, h);
  const soft = bctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const band = h * 0.18;
  const mid = h / 2;
  for (let y = 0; y < h; y++) {
    const dist = Math.abs(y - mid);
    const t = Math.min(1, Math.max(0, (dist - band) / (h * 0.28)));
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        dst.data[i + c] = sharp.data[i + c] * (1 - t) + soft.data[i + c] * t;
      }
      dst.data[i + 3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
  return colorGrade(out, { sat: 1.15, contrast: 1.08 });
}

function selectiveFocus(src: HTMLCanvasElement): HTMLCanvasElement {
  return tiltShift(src);
}

function architectAlign(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = radialMap(src, -0.12, 1);
  c = colorGrade(c, { contrast: 1.05, sat: 0.95 });
  return c;
}

function vintageHalation(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = softFocus(src, 2.5);
  c = colorGrade(c, { sepia: 0.35, contrast: 0.95, sat: 0.85 });
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.25;
  ctx.filter = "blur(16px)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function longGlassDetail(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = teleCrop(src, 1.55);
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.25;
  ctx.filter = "contrast(1.4)";
  ctx.drawImage(c, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function microReveal(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = teleCrop(src, 2.1);
  return colorGrade(c, { contrast: 1.12, sat: 1.08, brightness: 1.02 });
}

function swirlDepth(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = portraitBloom(src);
  c = radialMap(c, 0.08, 0.6);
  return softFocus(c, 2);
}

export function applyLensOptical(
  source: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
  lens: CameraLensDef,
): HTMLCanvasElement {
  const { w, h } = dims(source);
  let base = canvasFrom(source as CanvasImageSource, w, h);
  switch (lens.concept) {
    case "wide-angle":
      return radialMap(base, 0.22, 1);
    case "ultra-wide":
      return radialMap(base, 0.38, 1);
    case "fisheye":
      return fisheyeMap(base, 0.9);
    case "standard":
      return colorGrade(base, { contrast: 1.04, sat: 1.02 });
    case "portrait-prime":
      return portraitBloom(base);
    case "telephoto":
      return teleCrop(base, 1.45);
    case "super-telephoto":
      return teleCrop(base, 1.9);
    case "macro":
      return microReveal(base);
    case "tilt-shift":
      return tiltShift(base);
    case "perspective-correction":
      return architectAlign(base);
    case "soft-focus":
      return softFocus(base, 4);
    case "diffusion":
      return diffusionGlow(base);
    case "diffraction":
      return starflare(base);
    case "prism":
      return prismEcho(base);
    case "swirly-bokeh":
      return swirlDepth(base);
    case "vintage":
      return vintageHalation(base);
    case "infrared":
      return infraredLook(base);
    case "long-glass":
      return longGlassDetail(base);
    case "strong-wide-perspective":
      return radialMap(base, 0.48, 1);
    case "selective-focus":
      return selectiveFocus(base);
    default:
      return base;
  }
}

export async function applyLensOpticalFromUrl(
  url: string,
  lens: CameraLensDef,
): Promise<HTMLCanvasElement> {
  const img = await loadImage(url);
  return applyLensOptical(img, lens);
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), type, quality);
  });
}
