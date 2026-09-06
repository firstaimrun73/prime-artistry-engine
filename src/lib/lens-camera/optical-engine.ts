/**
 * Motio2edit camera optics — client-only, free, strongly visible effects.
 */
import type { CameraLensDef, LensAspectId } from "@/lib/lens-camera/roster";
import { LENS_ASPECT_PRESETS } from "@/lib/lens-camera/roster";

export function captureVideoFrame(video: HTMLVideoElement, mirror = false): HTMLCanvasElement {
  const w = video.videoWidth || 0;
  const h = video.videoHeight || 0;
  if (w < 2 || h < 2) throw new Error("Camera frame is not ready. Wait a moment and try again.");
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas not supported on this device.");
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  return c;
}

export function cropToAspect(src: HTMLCanvasElement, aspectId: LensAspectId): HTMLCanvasElement {
  const preset = LENS_ASPECT_PRESETS.find((p) => p.id === aspectId);
  if (!preset || !preset.ratio) return src;
  const target = preset.ratio;
  const sw = src.width, sh = src.height;
  const srcR = sw / sh;
  let cw: number, ch: number, sx: number, sy: number;
  if (srcR > target) {
    ch = sh; cw = Math.round(sh * target); sx = Math.round((sw - cw) / 2); sy = 0;
  } else {
    cw = sw; ch = Math.round(sw / target); sx = 0; sy = Math.round((sh - ch) / 2);
  }
  const out = document.createElement("canvas");
  out.width = cw; out.height = ch;
  out.getContext("2d")!.drawImage(src, sx, sy, cw, ch, 0, 0, cw, ch);
  return out;
}

function clone(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width; c.height = src.height;
  c.getContext("2d")!.drawImage(src, 0, 0);
  return c;
}
function data(c: HTMLCanvasElement): ImageData {
  return c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height);
}
function put(c: HTMLCanvasElement, img: ImageData): HTMLCanvasElement {
  c.getContext("2d")!.putImageData(img, 0, 0);
  return c;
}

function nightLift(src: HTMLCanvasElement, strength = 0.75): HTMLCanvasElement {
  const out = clone(src);
  const img = data(out);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const lift = strength * Math.pow(1 - y, 1.6);
    r = Math.min(1, r + lift); g = Math.min(1, g + lift * 0.95); b = Math.min(1, b + lift * 0.88);
    r = (r - 0.5) * 1.12 + 0.5; g = (g - 0.5) * 1.12 + 0.5; b = (b - 0.5) * 1.12 + 0.5;
    d[i] = Math.max(0, Math.min(255, r * 255));
    d[i + 1] = Math.max(0, Math.min(255, g * 255));
    d[i + 2] = Math.max(0, Math.min(255, b * 255));
  }
  return put(out, img);
}

function denoise(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const s = data(src).data;
  const out = clone(src);
  const dst = data(out);
  const d = dst.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rr = 0, gg = 0, bb = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = Math.min(h - 1, Math.max(0, y + dy));
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.min(w - 1, Math.max(0, x + dx));
          const i = (yy * w + xx) * 4;
          rr += s[i]; gg += s[i + 1]; bb += s[i + 2]; n++;
        }
      }
      const oi = (y * w + x) * 4;
      d[oi] = (s[oi] * 0.4 + (rr / n) * 0.6) | 0;
      d[oi + 1] = (s[oi + 1] * 0.4 + (gg / n) * 0.6) | 0;
      d[oi + 2] = (s[oi + 2] * 0.4 + (bb / n) * 0.6) | 0;
      d[oi + 3] = 255;
    }
  }
  return put(out, dst);
}

function sharpen(src: HTMLCanvasElement, amount = 0.7): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const s = data(src).data;
  const out = clone(src);
  const dst = data(out);
  const d = dst.data;
  const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let v = 0, ki = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            v += s[((y + dy) * w + (x + dx)) * 4 + c] * k[ki++];
        const oi = (y * w + x) * 4 + c;
        d[oi] = Math.max(0, Math.min(255, s[oi] * (1 - amount) + v * amount));
      }
      d[(y * w + x) * 4 + 3] = 255;
    }
  }
  return put(out, dst);
}

function radialMap(src: HTMLCanvasElement, k: number): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  const s = data(src).data;
  const dst = ctx.createImageData(w, h);
  const d = dst.data;
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy) || 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / maxR, dy = (y - cy) / maxR;
      const r2 = dx * dx + dy * dy;
      const factor = 1 + k * r2;
      const sx = cx + (x - cx) / factor;
      const sy = cy + (y - cy) / factor;
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = Math.min(w - 1, Math.max(0, x0 + 1));
      const y1 = Math.min(h - 1, Math.max(0, y0 + 1));
      const fx = sx - x0, fy = sy - y0;
      const cl = (v: number, m: number) => Math.max(0, Math.min(m, v));
      const i00 = (cl(y0, h - 1) * w + cl(x0, w - 1)) * 4;
      const i10 = (cl(y0, h - 1) * w + x1) * 4;
      const i01 = (y1 * w + cl(x0, w - 1)) * 4;
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

function fisheyeMap(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const s = data(src).data;
  const dst = ctx.createImageData(w, h);
  const d = dst.data;
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  const R = Math.min(cx, cy) * 0.98;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      const di = (y * w + x) * 4;
      if (r > R) { d[di] = d[di + 1] = d[di + 2] = 0; d[di + 3] = 255; continue; }
      const rn = r / R;
      const theta = Math.atan2(dy, dx);
      const srcR = Math.pow(rn, 0.55) * Math.min(cx, cy);
      const sx = cx + Math.cos(theta) * srcR;
      const sy = cy + Math.sin(theta) * srcR;
      const x0 = Math.max(0, Math.min(w - 1, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(h - 1, Math.floor(sy)));
      const si = (y0 * w + x0) * 4;
      d[di] = s[si]; d[di + 1] = s[si + 1]; d[di + 2] = s[si + 2]; d[di + 3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
  return out;
}

function teleCrop(src: HTMLCanvasElement, zoom: number): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const z = Math.max(1.2, Math.min(3, zoom));
  const cw = w / z, ch = h / z;
  const sx = (w - cw) / 2, sy = (h - ch) / 2;
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, sx, sy, cw, ch, 0, 0, w, h);
  return out;
}

function grade(src: HTMLCanvasElement, f: string): HTMLCanvasElement {
  const out = clone(src);
  const ctx = out.getContext("2d")!;
  ctx.filter = f;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  return out;
}

function softFocus(src: HTMLCanvasElement, blurPx = 6): HTMLCanvasElement {
  const out = clone(src);
  const ctx = out.getContext("2d")!;
  ctx.globalAlpha = 0.5;
  ctx.filter = `blur(${blurPx}px)`;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  return out;
}

function portraitBloom(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const blurred = clone(src);
  const bctx = blurred.getContext("2d")!;
  bctx.filter = "blur(8px)";
  bctx.drawImage(src, 0, 0);
  const sharp = data(src), soft = data(blurred);
  const out = clone(src), dst = data(out);
  const cx = w / 2, cy = h / 2, maxR = Math.sqrt(cx * cx + cy * cy) || 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxR;
      const t = Math.min(1, Math.max(0, (r - 0.25) / 0.5));
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) dst.data[i + c] = sharp.data[i + c] * (1 - t) + soft.data[i + c] * t;
      dst.data[i + 3] = 255;
    }
  }
  return put(out, dst);
}

function tiltShift(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const blurred = clone(src);
  blurred.getContext("2d")!.filter = "blur(7px)";
  blurred.getContext("2d")!.drawImage(src, 0, 0);
  const sharp = data(src), soft = data(blurred);
  const out = clone(src), dst = data(out);
  const band = h * 0.12, mid = h / 2;
  for (let y = 0; y < h; y++) {
    const t = Math.min(1, Math.max(0, (Math.abs(y - mid) - band) / (h * 0.25)));
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) dst.data[i + c] = sharp.data[i + c] * (1 - t) + soft.data[i + c] * t;
      dst.data[i + 3] = 255;
    }
  }
  return grade(put(out, dst), "saturate(1.2) contrast(1.1)");
}

function infraredLook(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = clone(src);
  const img = data(out);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const ir = Math.min(255, g * 1.5 + r * 0.25);
    d[i] = Math.min(255, ir * 0.95 + 30);
    d[i + 1] = Math.min(255, ir * 0.7);
    d[i + 2] = Math.min(255, b * 0.25 + 10);
  }
  return put(out, img);
}

function cinematicLook(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = grade(src, "contrast(1.18) saturate(0.88) brightness(0.97)");
  const img = data(c);
  const d = img.data;
  const w = c.width, h = c.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const yv = (d[i] * 0.2 + d[i + 1] * 0.7 + d[i + 2] * 0.1) / 255;
      if (yv < 0.4) d[i + 2] = Math.min(255, d[i + 2] + 18);
      else d[i] = Math.min(255, d[i] + 12);
      const nx = (x / w - 0.5) * 2, ny = (y / h - 0.5) * 2;
      const v = Math.min(1, Math.sqrt(nx * nx + ny * ny));
      const dark = 1 - v * v * 0.35;
      d[i] = (d[i] * dark) | 0;
      d[i + 1] = (d[i + 1] * dark) | 0;
      d[i + 2] = (d[i + 2] * dark) | 0;
    }
  }
  return put(c, img);
}

function vintageHalation(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = softFocus(src, 4);
  c = grade(c, "sepia(0.45) contrast(0.95) saturate(0.8) brightness(1.05)");
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.3;
  ctx.filter = "blur(18px)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function prismEcho(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = clone(src);
  const ctx = out.getContext("2d")!;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.28;
  ctx.drawImage(src, 5, 0);
  ctx.globalAlpha = 0.22;
  ctx.drawImage(src, -5, 0);
  ctx.globalAlpha = 0.15;
  ctx.drawImage(src, 0, 3);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return out;
}

function diffusionGlow(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = clone(src);
  const ctx = out.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.45;
  ctx.filter = "blur(14px) brightness(1.15)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return out;
}

export function applyLensOpticalEnhanced(
  source: HTMLCanvasElement,
  lens: CameraLensDef,
  aspectId: LensAspectId = "native",
): HTMLCanvasElement {
  let base = cropToAspect(source, aspectId);
  switch (lens.id) {
    case "lens_widevista":
      return sharpen(radialMap(base, 0.45), 0.4);
    case "lens_ultrawide_horizon":
      return grade(radialMap(base, 0.72), "contrast(1.08) saturate(1.1)");
    case "lens_fisheye_orbit":
      return fisheyeMap(base);
    case "lens_natural_frame":
      return sharpen(denoise(base), 0.65);
    case "lens_portrait_bloom":
      return grade(portraitBloom(base), "saturate(1.08) brightness(1.03)");
    case "lens_cinematic_compress":
      return cinematicLook(teleCrop(base, 1.45));
    case "lens_farreach":
      return sharpen(denoise(teleCrop(base, 2.3)), 0.55);
    case "lens_microreveal":
      return grade(sharpen(teleCrop(base, 2.6), 0.8), "contrast(1.15) saturate(1.12)");
    case "lens_miniature_shift":
    case "lens_selective_focus":
      return tiltShift(base);
    case "lens_architect_align":
      return sharpen(grade(radialMap(base, -0.22), "contrast(1.12) saturate(0.92)"), 0.4);
    case "lens_dreamsoft":
      return softFocus(nightLift(denoise(base), 0.85), 3);
    case "lens_glowmist":
      return diffusionGlow(nightLift(base, 0.35));
    case "lens_starflare": {
      let c = softFocus(base, 2);
      const ctx = c.getContext("2d")!;
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.35;
      ctx.filter = "blur(12px) brightness(1.4)";
      ctx.drawImage(base, 0, 0);
      ctx.filter = "none";
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      return c;
    }
    case "lens_prism_echo":
      return prismEcho(base);
    case "lens_swirl_depth":
      return softFocus(radialMap(portraitBloom(base), 0.18), 3);
    case "lens_vintage_halation":
      return vintageHalation(base);
    case "lens_infraglow":
      return infraredLook(base);
    case "lens_longglass_detail":
      return grade(sharpen(denoise(teleCrop(base, 1.7)), 0.85), "contrast(1.12) saturate(1.08)");
    case "lens_perspective_stretch":
      return grade(radialMap(base, 0.85), "contrast(1.1) saturate(1.08)");
    default:
      return sharpen(denoise(base), 0.5);
  }
}

export function applyLensOptical(
  source: HTMLCanvasElement | HTMLVideoElement,
  lens: CameraLensDef,
  aspectId: LensAspectId = "native",
  mirror = false,
): HTMLCanvasElement {
  const frame = source instanceof HTMLVideoElement ? captureVideoFrame(source, mirror) : source;
  return applyLensOpticalEnhanced(frame, lens, aspectId);
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
