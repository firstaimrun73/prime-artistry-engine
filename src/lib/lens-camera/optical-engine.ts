/**
 * Motio2edit Lens — on-device image processing (upload only).
 * Each lens produces a clearly different result.
 */
import type { CameraLensDef, LensAspectId } from "./roster";
import { LENS_ASPECTS } from "./roster";

export function captureVideoFrame(video: HTMLVideoElement, mirror = false): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = video.videoWidth || 1280;
  c.height = video.videoHeight || 720;
  const ctx = c.getContext("2d")!;
  if (mirror) {
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, c.width, c.height);
  return c;
}

export function cropToAspect(src: HTMLCanvasElement, aspectId: LensAspectId): HTMLCanvasElement {
  const def = LENS_ASPECTS.find((a) => a.id === aspectId);
  if (!def || !def.ratio) return clone(src);
  const target = def.ratio;
  const sw = src.width;
  const sh = src.height;
  const sr = sw / sh;
  let cw = sw;
  let ch = sh;
  if (sr > target) cw = Math.round(sh * target);
  else ch = Math.round(sw / target);
  const sx = Math.floor((sw - cw) / 2);
  const sy = Math.floor((sh - ch) / 2);
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")!.drawImage(src, sx, sy, cw, ch, 0, 0, cw, ch);
  return out;
}

function clone(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  c.getContext("2d")!.drawImage(src, 0, 0);
  return c;
}

function data(c: HTMLCanvasElement): ImageData {
  return c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
}

function put(c: HTMLCanvasElement, img: ImageData): HTMLCanvasElement {
  c.getContext("2d")!.putImageData(img, 0, 0);
  return c;
}

function radialMap(src: HTMLCanvasElement, k: number): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  const sd = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const dst = octx.createImageData(w, h);
  const dd = dst.data;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / maxR;
      const dy = (y - cy) / maxR;
      const r = Math.sqrt(dx * dx + dy * dy);
      const f = 1 + k * r * r;
      const sx = Math.round(cx + (dx * maxR) / f);
      const sy = Math.round(cy + (dy * maxR) / f);
      const di = (y * w + x) * 4;
      if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
        const si = (sy * w + sx) * 4;
        dd[di] = sd[si];
        dd[di + 1] = sd[si + 1];
        dd[di + 2] = sd[si + 2];
        dd[di + 3] = 255;
      }
    }
  }
  octx.putImageData(dst, 0, 0);
  return out;
}

function fisheye360(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  octx.fillStyle = "#000";
  octx.fillRect(0, 0, w, h);
  const sd = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const dst = octx.createImageData(w, h);
  const dd = dst.data;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(cx, cy) * 0.98;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / maxR;
      const dy = (y - cy) / maxR;
      const r = Math.sqrt(dx * dx + dy * dy);
      const di = (y * w + x) * 4;
      if (r > 1) {
        dd[di + 3] = 255;
        continue;
      }
      const theta = Math.atan2(dy, dx);
      const nr = Math.pow(r, 0.55);
      const sx = Math.round(cx + nr * Math.cos(theta) * maxR);
      const sy = Math.round(cy + nr * Math.sin(theta) * maxR);
      if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
        const si = (sy * w + sx) * 4;
        dd[di] = sd[si];
        dd[di + 1] = sd[si + 1];
        dd[di + 2] = sd[si + 2];
        dd[di + 3] = 255;
      }
    }
  }
  octx.putImageData(dst, 0, 0);
  return out;
}

function teleCrop(src: HTMLCanvasElement, zoom: number): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const cw = Math.max(32, Math.floor(w / zoom));
  const ch = Math.max(32, Math.floor(h / zoom));
  const sx = Math.floor((w - cw) / 2);
  const sy = Math.floor((h - ch) / 2);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(src, sx, sy, cw, ch, 0, 0, w, h);
  return out;
}

function grade(src: HTMLCanvasElement, f: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.filter = f;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  return c;
}

function sharpen(src: HTMLCanvasElement, amount = 1.2): HTMLCanvasElement {
  const c = clone(src);
  const w = c.width;
  const h = c.height;
  const img = data(c);
  const srcD = data(src).data;
  const d = img.data;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const c0 = srcD[i + ch];
        const blur =
          (srcD[i - 4 + ch] + srcD[i + 4 + ch] + srcD[i - w * 4 + ch] + srcD[i + w * 4 + ch]) /
          4;
        d[i + ch] = Math.max(0, Math.min(255, c0 + (c0 - blur) * amount));
      }
    }
  }
  return put(c, img);
}

function lightDenoise(src: HTMLCanvasElement, strength = 0.35): HTMLCanvasElement {
  const c = clone(src);
  const w = c.width;
  const h = c.height;
  const srcD = data(src).data;
  const img = data(c);
  const d = img.data;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const avg =
          (srcD[i + ch] +
            srcD[i - 4 + ch] +
            srcD[i + 4 + ch] +
            srcD[i - w * 4 + ch] +
            srcD[i + w * 4 + ch]) /
          5;
        d[i + ch] = Math.round(srcD[i + ch] * (1 - strength) + avg * strength);
      }
    }
  }
  return put(c, img);
}

/** Enhance 4K — clean clarity only (no grain, mild sharpen). */
function enhance4k(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = lightDenoise(src, 0.55);
  c = grade(c, "contrast(1.08) saturate(1.05) brightness(1.02)");
  c = sharpen(c, 0.55);
  return c;
}

function sketchOutline(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const gray = grade(src, "grayscale(1) contrast(1.4)");
  const img = data(gray);
  const d = img.data;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const dst = out.getContext("2d")!.createImageData(w, h);
  const o = dst.data;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const gx =
        -d[i - 4] +
        d[i + 4] +
        -2 * d[i - 4 + w * 4] +
        2 * d[i + 4 + w * 4] +
        -d[i - 4 - w * 4] +
        d[i + 4 - w * 4];
      const gy =
        -d[i - w * 4] +
        d[i + w * 4] +
        -2 * d[i - 4 - w * 4] +
        2 * d[i - 4 + w * 4] +
        -d[i + 4 - w * 4] +
        d[i + 4 + w * 4];
      const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy) * 0.35);
      const edge = mag > 28 ? Math.min(255, mag * 1.8) : 0;
      const v = 255 - edge;
      o[i] = o[i + 1] = o[i + 2] = v;
      o[i + 3] = 255;
    }
  }
  out.getContext("2d")!.putImageData(dst, 0, 0);
  return out;
}

function nightBlueVision(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const img = data(c);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const lift = Math.pow(1 - y / 255, 1.2) * 90;
    let r = d[i] + lift * 0.25;
    let g = d[i + 1] + lift * 0.55;
    let b = d[i + 2] + lift * 1.35 + 25;
    r = r * 0.45;
    g = g * 0.75 + 15;
    b = Math.min(255, b * 1.15 + 40);
    d[i] = Math.min(255, r);
    d[i + 1] = Math.min(255, g);
    d[i + 2] = Math.min(255, b);
  }
  put(c, img);
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.22;
  ctx.filter = "blur(10px)";
  ctx.drawImage(c, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function portraitClose(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = teleCrop(src, 1.65);
  c = grade(c, "brightness(1.08) contrast(1.08) saturate(1.15)");
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.3;
  ctx.filter = "blur(20px)";
  ctx.drawImage(c, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  const g = ctx.createRadialGradient(
    c.width / 2,
    c.height / 2,
    c.width * 0.2,
    c.width / 2,
    c.height / 2,
    c.width * 0.75,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  return sharpen(c, 0.6);
}

function cineSharp(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = sharpen(src, 1.35);
  c = grade(c, "contrast(1.22) saturate(1.28) brightness(1.06)");
  const img = data(c);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, d[i] * 1.06 + 4);
    d[i + 2] = Math.min(255, d[i + 2] * 1.04);
  }
  return put(c, img);
}

function tiltShift(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const h = c.height;
  const band = Math.floor(h * 0.22);
  const top = Math.floor(h * 0.39);
  const blurC = clone(src);
  const bctx = blurC.getContext("2d")!;
  bctx.filter = "blur(8px)";
  bctx.drawImage(src, 0, 0);
  bctx.filter = "none";
  ctx.drawImage(blurC, 0, 0, c.width, top, 0, 0, c.width, top);
  ctx.drawImage(
    blurC,
    0,
    top + band,
    c.width,
    h - top - band,
    0,
    top + band,
    c.width,
    h - top - band,
  );
  return grade(c, "saturate(1.35) contrast(1.15)");
}

function vintage(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = grade(src, "sepia(0.4) contrast(1.1) brightness(1.05)");
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.2;
  ctx.filter = "blur(12px)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function infrared(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const img = data(c);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    d[i] = Math.min(255, g * 0.95 + b * 0.25);
    d[i + 1] = Math.min(255, r * 0.4 + g * 0.5);
    d[i + 2] = Math.min(255, r * 0.7);
  }
  return put(c, img);
}

function prismEcho(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.45;
  ctx.drawImage(src, 7, 0);
  ctx.globalAlpha = 0.35;
  ctx.drawImage(src, -7, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return grade(c, "saturate(1.3) contrast(1.08)");
}

function diffusion(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.4;
  ctx.filter = "blur(16px) brightness(1.2)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return grade(c, "brightness(1.05) saturate(1.08)");
}

export function applyLensOpticalEnhanced(
  source: HTMLCanvasElement,
  lens: CameraLensDef,
  aspectId: LensAspectId = "native",
): HTMLCanvasElement {
  const base = cropToAspect(source, aspectId);
  switch (lens.id) {
    case "lens_perspective_stretch":
      return grade(radialMap(base, 1.25), "contrast(1.16) saturate(1.12)");
    case "lens_fisheye_orbit":
      return grade(fisheye360(base), "contrast(1.12) saturate(1.1)");
    case "lens_ultrawide_horizon":
      return grade(radialMap(base, 1.05), "contrast(1.14) saturate(1.18) brightness(1.03)");
    case "lens_portrait_bloom":
      return portraitClose(base);
    case "lens_natural_frame":
      return sketchOutline(base);
    case "lens_cinematic_compress":
      return cineSharp(base);
    case "lens_dreamsoft":
      return nightBlueVision(base);
    case "lens_widevista":
      return grade(radialMap(base, 0.7), "contrast(1.1) saturate(1.08)");
    case "lens_farreach":
      return grade(sharpen(teleCrop(base, 2.4), 0.9), "contrast(1.15)");
    case "lens_microreveal":
      return grade(sharpen(teleCrop(base, 3.0), 1.3), "contrast(1.25) saturate(1.2)");
    case "lens_miniature_shift":
      return tiltShift(base);
    case "lens_glowmist":
      return diffusion(base);
    case "lens_vintage_halation":
      return vintage(base);
    case "lens_infraglow":
      return infrared(base);
    case "lens_longglass_detail":
      return grade(sharpen(base, 1.5), "contrast(1.2) saturate(1.1)");
    case "lens_prism_echo":
      return prismEcho(base);
    case "lens_swirl_depth":
      return enhance4k(base);
    case "lens_architect_align":
      return sharpen(grade(radialMap(base, -0.32), "contrast(1.15) saturate(0.9)"), 0.7);
    case "lens_starflare":
      return grade(diffusion(base), "contrast(1.12) brightness(1.08)");
    case "lens_selective_focus":
      return tiltShift(base);
    default:
      return grade(sharpen(base, 0.9), "contrast(1.1)");
  }
}

export function applyLensOptical(
  source: HTMLCanvasElement | HTMLVideoElement,
  lens: CameraLensDef,
  aspectId: LensAspectId = "native",
  mirror = false,
): HTMLCanvasElement {
  const frame =
    source instanceof HTMLVideoElement ? captureVideoFrame(source, mirror) : source;
  return applyLensOpticalEnhanced(frame, lens, aspectId);
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      type,
      quality,
    );
  });
}

export function nightBoostPreview(src: HTMLCanvasElement, strength = 0.9): HTMLCanvasElement {
  return nightBlueVision(src);
}
