/**
 * Motio2edit camera optical engine — 100% client-side, zero server/AI/credits.
 * Capture frame first, then apply lens-specific image processing.
 */
import type { CameraLensDef } from "@/lib/lens-camera/roster";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}

/** Capture a live video frame to canvas BEFORE stopping the stream. */
export function captureVideoFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const w = video.videoWidth || video.clientWidth || 1280;
  const h = video.videoHeight || video.clientHeight || 720;
  if (!w || !h) throw new Error("Camera frame is not ready. Wait a moment and try again.");
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas not supported on this device.");
  ctx.drawImage(video, 0, 0, w, h);
  return c;
}

function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  return c;
}

function getImageData(c: HTMLCanvasElement): ImageData {
  return c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height);
}

function putImageData(c: HTMLCanvasElement, data: ImageData): HTMLCanvasElement {
  c.getContext("2d")!.putImageData(data, 0, 0);
  return c;
}

function nightLift(src: HTMLCanvasElement, strength = 0.55): HTMLCanvasElement {
  const out = cloneCanvas(src);
  const img = getImageData(out);
  const d = img.data;
  const s = Math.max(0.15, Math.min(0.85, strength));
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255;
    let g = d[i + 1] / 255;
    let b = d[i + 2] / 255;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const lift = s * (1 - y) * (1 - y);
    r = Math.min(1, r + lift * 0.95 + s * 0.04);
    g = Math.min(1, g + lift * 0.9 + s * 0.04);
    b = Math.min(1, b + lift * 0.85 + s * 0.03);
    r = (r - 0.5) * (1 + s * 0.15) + 0.5;
    g = (g - 0.5) * (1 + s * 0.15) + 0.5;
    b = (b - 0.5) * (1 + s * 0.15) + 0.5;
    d[i] = Math.max(0, Math.min(255, r * 255));
    d[i + 1] = Math.max(0, Math.min(255, g * 255));
    d[i + 2] = Math.max(0, Math.min(255, b * 255));
  }
  return putImageData(out, img);
}

function denoise(src: HTMLCanvasElement, radius = 1): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const img = getImageData(src);
  const s = img.data;
  const out = cloneCanvas(src);
  const dst = getImageData(out);
  const d = dst.data;
  const r = Math.max(1, Math.min(2, radius | 0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rr = 0, gg = 0, bb = 0, n = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = Math.min(h - 1, Math.max(0, y + dy));
        for (let dx = -r; dx <= r; dx++) {
          const xx = Math.min(w - 1, Math.max(0, x + dx));
          const i = (yy * w + xx) * 4;
          rr += s[i];
          gg += s[i + 1];
          bb += s[i + 2];
          n++;
        }
      }
      const oi = (y * w + x) * 4;
      d[oi] = (s[oi] * 0.45 + (rr / n) * 0.55) | 0;
      d[oi + 1] = (s[oi + 1] * 0.45 + (gg / n) * 0.55) | 0;
      d[oi + 2] = (s[oi + 2] * 0.45 + (bb / n) * 0.55) | 0;
      d[oi + 3] = 255;
    }
  }
  return putImageData(out, dst);
}

function sharpen(src: HTMLCanvasElement, amount = 0.45): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const img = getImageData(src);
  const s = img.data;
  const out = cloneCanvas(src);
  const dst = getImageData(out);
  const d = dst.data;
  const a = Math.max(0, Math.min(1.2, amount));
  const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let v = 0;
        let ki = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            v += s[((y + dy) * w + (x + dx)) * 4 + c] * k[ki++];
          }
        }
        const oi = (y * w + x) * 4 + c;
        const orig = s[oi];
        d[oi] = Math.max(0, Math.min(255, orig * (1 - a) + v * a));
      }
      d[(y * w + x) * 4 + 3] = 255;
    }
  }
  return putImageData(out, dst);
}

function radialMap(src: HTMLCanvasElement, k: number): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  const s = getImageData(src).data;
  const dst = ctx.createImageData(w, h);
  const d = dst.data;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy) || 1;
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
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const s = getImageData(src).data;
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
  const z = Math.max(1.05, Math.min(2.6, zoom));
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

function colorGrade(
  src: HTMLCanvasElement,
  opts: { sat?: number; contrast?: number; brightness?: number; sepia?: number; hue?: number },
): HTMLCanvasElement {
  const out = cloneCanvas(src);
  const ctx = out.getContext("2d")!;
  const parts: string[] = [];
  if (opts.brightness != null) parts.push(`brightness(${opts.brightness})`);
  if (opts.contrast != null) parts.push(`contrast(${opts.contrast})`);
  if (opts.sat != null) parts.push(`saturate(${opts.sat})`);
  if (opts.hue != null) parts.push(`hue-rotate(${opts.hue}deg)`);
  if (opts.sepia != null) parts.push(`sepia(${opts.sepia})`);
  if (!parts.length) return out;
  ctx.filter = parts.join(" ");
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  return out;
}

function softFocus(src: HTMLCanvasElement, amount = 3): HTMLCanvasElement {
  const out = cloneCanvas(src);
  const ctx = out.getContext("2d")!;
  ctx.globalAlpha = 0.4;
  ctx.filter = `blur(${amount}px)`;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  return out;
}

function diffusionGlow(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = cloneCanvas(src);
  const ctx = out.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.32;
  ctx.filter = "blur(10px)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return out;
}

function portraitBloom(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const blurred = cloneCanvas(src);
  const bctx = blurred.getContext("2d")!;
  bctx.filter = "blur(5px)";
  bctx.drawImage(src, 0, 0);
  bctx.filter = "none";
  const sharp = getImageData(src);
  const soft = getImageData(blurred);
  const out = cloneCanvas(src);
  const dst = getImageData(out);
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy) || 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxR;
      const t = Math.min(1, Math.max(0, (r - 0.32) / 0.55));
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        dst.data[i + c] = sharp.data[i + c] * (1 - t) + soft.data[i + c] * t;
      }
      dst.data[i + 3] = 255;
    }
  }
  return putImageData(out, dst);
}

function tiltShift(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const blurred = cloneCanvas(src);
  const bctx = blurred.getContext("2d")!;
  bctx.filter = "blur(5px)";
  bctx.drawImage(src, 0, 0);
  const sharp = getImageData(src);
  const soft = getImageData(blurred);
  const out = cloneCanvas(src);
  const dst = getImageData(out);
  const band = h * 0.16;
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
  return colorGrade(putImageData(out, dst), { sat: 1.12, contrast: 1.06 });
}

function infraredLook(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = cloneCanvas(src);
  const img = getImageData(out);
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
  return putImageData(out, img);
}

function prismEcho(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = cloneCanvas(src);
  const ctx = out.getContext("2d")!;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.16;
  ctx.drawImage(src, 3, 0);
  ctx.globalAlpha = 0.12;
  ctx.drawImage(src, -3, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return out;
}

function vintageHalation(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = softFocus(src, 2.2);
  c = colorGrade(c, { sepia: 0.32, contrast: 0.96, sat: 0.88 });
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.22;
  ctx.filter = "blur(14px)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function cinematicLook(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = colorGrade(src, { contrast: 1.12, sat: 0.92, brightness: 0.98 });
  const img = getImageData(c);
  const d = img.data;
  const w = c.width;
  const h = c.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const yv = (d[i] * 0.2 + d[i + 1] * 0.7 + d[i + 2] * 0.1) / 255;
      if (yv < 0.45) d[i + 2] = Math.min(255, d[i + 2] + 8);
      else d[i] = Math.min(255, d[i] + 6);
      const nx = (x / w - 0.5) * 2;
      const ny = (y / h - 0.5) * 2;
      const v = Math.min(1, Math.sqrt(nx * nx + ny * ny));
      const dark = 1 - v * v * 0.22;
      d[i] = (d[i] * dark) | 0;
      d[i + 1] = (d[i + 1] * dark) | 0;
      d[i + 2] = (d[i + 2] * dark) | 0;
    }
  }
  return putImageData(c, img);
}

function clarityStack(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = denoise(src, 1);
  c = sharpen(c, 0.55);
  return colorGrade(c, { contrast: 1.08, sat: 1.05, brightness: 1.02 });
}

function hqDetail(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = denoise(src, 1);
  c = sharpen(c, 0.7);
  return colorGrade(c, { contrast: 1.1, sat: 1.06, brightness: 1.01 });
}

export function applyLensOptical(
  source: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
  lens: CameraLensDef,
): HTMLCanvasElement {
  let base: HTMLCanvasElement;
  if (source instanceof HTMLVideoElement) {
    base = captureVideoFrame(source);
  } else if (source instanceof HTMLCanvasElement) {
    base = cloneCanvas(source);
  } else {
    const c = document.createElement("canvas");
    c.width = source.naturalWidth || source.width;
    c.height = source.naturalHeight || source.height;
    c.getContext("2d")!.drawImage(source, 0, 0);
    base = c;
  }
  return applyLensOpticalEnhanced(base, lens);
}

export function applyLensOpticalEnhanced(source: HTMLCanvasElement, lens: CameraLensDef): HTMLCanvasElement {
  switch (lens.id) {
    case "lens_widevista":
      return sharpen(radialMap(source, 0.26), 0.28);
    case "lens_ultrawide_horizon":
      return colorGrade(radialMap(source, 0.44), { contrast: 1.05, sat: 1.03 });
    case "lens_fisheye_orbit":
      return fisheyeMap(source, 0.9);
    case "lens_natural_frame":
      return clarityStack(source);
    case "lens_portrait_bloom":
      return colorGrade(portraitBloom(source), { sat: 1.05, brightness: 1.02 });
    case "lens_cinematic_compress":
      return cinematicLook(teleCrop(source, 1.25));
    case "lens_farreach":
      return sharpen(denoise(teleCrop(source, 2.05), 1), 0.45);
    case "lens_microreveal":
      return hqDetail(teleCrop(source, 2.25));
    case "lens_miniature_shift":
    case "lens_selective_focus":
      return tiltShift(source);
    case "lens_architect_align":
      return sharpen(colorGrade(radialMap(source, -0.12), { contrast: 1.08, sat: 0.95 }), 0.3);
    case "lens_dreamsoft":
      return softFocus(nightLift(denoise(source, 1), 0.25), 3.5);
    case "lens_glowmist":
      return diffusionGlow(nightLift(source, 0.2));
    case "lens_starflare": {
      let c = softFocus(source, 1.4);
      const ctx = c.getContext("2d")!;
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.22;
      ctx.filter = "blur(9px) brightness(1.3)";
      ctx.drawImage(source, 0, 0);
      ctx.filter = "none";
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      return c;
    }
    case "lens_prism_echo":
      return prismEcho(source);
    case "lens_swirl_depth":
      return softFocus(radialMap(portraitBloom(source), 0.09), 1.8);
    case "lens_vintage_halation":
      return vintageHalation(source);
    case "lens_infraglow":
      return infraredLook(source);
    case "lens_longglass_detail":
      return hqDetail(teleCrop(source, 1.55));
    case "lens_perspective_stretch":
      return colorGrade(radialMap(source, 0.52), { contrast: 1.07, sat: 1.04 });
    default:
      return clarityStack(source);
  }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.95,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), type, quality);
  });
}
