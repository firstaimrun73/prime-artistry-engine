/**
 * Motio2edit Lens — on-device optical processing.
 * Each lens MUST produce a clearly visible change vs source.
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
  if (sr > target) {
    cw = Math.round(sh * target);
  } else {
    ch = Math.round(sw / target);
  }
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

function nightLift(src: HTMLCanvasElement, strength = 0.9): HTMLCanvasElement {
  const c = clone(src);
  const img = data(c);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    const lift = strength * Math.pow(1 - y, 1.35);
    d[i] = Math.min(255, d[i] + lift * 95);
    d[i + 1] = Math.min(255, d[i + 1] + lift * 85);
    d[i + 2] = Math.min(255, d[i + 2] + lift * 70);
  }
  return put(c, img);
}

export function nightBoostPreview(src: HTMLCanvasElement, strength = 0.9): HTMLCanvasElement {
  return nightLift(src, strength);
}

function denoise(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.filter = "blur(0.6px)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  const img = data(c);
  const orig = data(src);
  const d = img.data;
  const o = orig.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i] * 0.55 + o[i] * 0.45;
    d[i + 1] = d[i + 1] * 0.55 + o[i + 1] * 0.45;
    d[i + 2] = d[i + 2] * 0.55 + o[i + 2] * 0.45;
  }
  return put(c, img);
}

function sharpen(src: HTMLCanvasElement, amount = 1.1): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const w = c.width;
  const h = c.height;
  const img = data(c);
  const srcD = data(src).data;
  const d = img.data;
  const k = amount;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const c0 = srcD[i + ch];
        const blur =
          (srcD[i - 4 + ch] +
            srcD[i + 4 + ch] +
            srcD[i - w * 4 + ch] +
            srcD[i + w * 4 + ch]) /
          4;
        d[i + ch] = Math.max(0, Math.min(255, c0 + (c0 - blur) * k));
      }
    }
  }
  return put(c, img);
}

/** Strong barrel / anti-barrel FOV warp — always visible. */
function radialMap(src: HTMLCanvasElement, k: number): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  const sctx = src.getContext("2d")!;
  const srcImg = sctx.getImageData(0, 0, w, h);
  const dst = octx.createImageData(w, h);
  const sd = srcImg.data;
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

function fisheyeMap(src: HTMLCanvasElement): HTMLCanvasElement {
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
  const maxR = Math.min(cx, cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / maxR;
      const dy = (y - cy) / maxR;
      const r = Math.sqrt(dx * dx + dy * dy);
      const di = (y * w + x) * 4;
      if (r > 1.05) {
        dd[di + 3] = 0;
        continue;
      }
      const theta = Math.atan2(dy, dx);
      const nr = Math.pow(r, 0.72);
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

function softFocus(src: HTMLCanvasElement, blurPx = 8): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.globalAlpha = 0.55;
  ctx.filter = `blur(${blurPx}px)`;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  return c;
}

function portraitBloom(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = grade(src, "brightness(1.08) contrast(1.06) saturate(1.12)");
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.28;
  ctx.filter = "blur(18px)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return sharpen(c, 0.55);
}

function tiltShift(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const h = c.height;
  const band = Math.floor(h * 0.22);
  const top = Math.floor(h * 0.39);
  ctx.drawImage(src, 0, 0);
  // Blur outside focus band strongly
  const blurC = clone(src);
  const bctx = blurC.getContext("2d")!;
  bctx.filter = "blur(7px)";
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

function infraredLook(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const img = data(c);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    d[i] = Math.min(255, g * 0.9 + b * 0.3);
    d[i + 1] = Math.min(255, r * 0.35 + g * 0.55);
    d[i + 2] = Math.min(255, r * 0.75);
  }
  return put(c, img);
}

function cinematicLook(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = grade(src, "contrast(1.22) saturate(0.88) brightness(0.94)");
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, "rgba(0,0,0,0.35)");
  g.addColorStop(0.15, "rgba(0,0,0,0)");
  g.addColorStop(0.85, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  // teal-orange push
  const img = data(c);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, d[i] * 1.08 + 6);
    d[i + 2] = Math.min(255, d[i + 2] * 1.06);
  }
  return put(c, img);
}

function vintageHalation(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = grade(src, "sepia(0.45) contrast(1.1) brightness(1.05) saturate(0.9)");
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.22;
  ctx.filter = "blur(14px)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  // vignette
  const g = ctx.createRadialGradient(
    c.width / 2,
    c.height / 2,
    c.width * 0.25,
    c.width / 2,
    c.height / 2,
    c.width * 0.75,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(40,20,0,0.45)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function prismEcho(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.45;
  ctx.drawImage(src, 6, 0);
  ctx.globalAlpha = 0.35;
  ctx.drawImage(src, -6, 0);
  ctx.globalAlpha = 0.25;
  ctx.drawImage(src, 0, 4);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return grade(c, "saturate(1.25) contrast(1.08)");
}

function diffusionGlow(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.4;
  ctx.filter = "blur(16px) brightness(1.25)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return grade(c, "brightness(1.06) saturate(1.1)");
}

/** Primary API — every branch must look different from source. */
export function applyLensOpticalEnhanced(
  source: HTMLCanvasElement,
  lens: CameraLensDef,
  aspectId: LensAspectId = "native",
): HTMLCanvasElement {
  const base = cropToAspect(source, aspectId);
  switch (lens.id) {
    case "lens_widevista":
      return sharpen(grade(radialMap(base, 0.72), "contrast(1.1) saturate(1.08)"), 0.6);
    case "lens_ultrawide_horizon":
      return grade(radialMap(base, 1.15), "contrast(1.18) saturate(1.22) brightness(1.03)");
    case "lens_fisheye_orbit":
      return grade(fisheyeMap(base), "contrast(1.12) saturate(1.15)");
    case "lens_natural_frame":
      return grade(sharpen(denoise(base), 1.15), "contrast(1.12) saturate(1.05)");
    case "lens_portrait_bloom":
      return portraitBloom(base);
    case "lens_cinematic_compress":
      return cinematicLook(teleCrop(base, 1.55));
    case "lens_farreach":
      return grade(sharpen(denoise(teleCrop(base, 2.6)), 0.9), "contrast(1.15)");
    case "lens_microreveal":
      return grade(sharpen(teleCrop(base, 3.0), 1.2), "contrast(1.25) saturate(1.2)");
    case "lens_miniature_shift":
    case "lens_selective_focus":
      return tiltShift(base);
    case "lens_architect_align":
      return sharpen(grade(radialMap(base, -0.35), "contrast(1.18) saturate(0.88)"), 0.7);
    case "lens_dreamsoft":
      return softFocus(nightLift(denoise(base), 1.15), 4);
    case "lens_glowmist":
      return diffusionGlow(nightLift(base, 0.55));
    case "lens_starflare": {
      let c = softFocus(base, 3);
      const ctx = c.getContext("2d")!;
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.5;
      ctx.filter = "blur(16px) brightness(1.6)";
      ctx.drawImage(base, 0, 0);
      ctx.filter = "none";
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      return grade(c, "contrast(1.1) saturate(1.15)");
    }
    case "lens_prism_echo":
      return prismEcho(base);
    case "lens_swirl_depth":
      return softFocus(radialMap(portraitBloom(base), 0.32), 5);
    case "lens_vintage_halation":
      return vintageHalation(base);
    case "lens_infraglow":
      return infraredLook(nightLift(base, 0.65));
    case "lens_longglass_detail":
      return grade(
        sharpen(denoise(denoise(teleCrop(base, 1.5))), 1.35),
        "contrast(1.25) saturate(1.15) brightness(1.05)",
      );
    case "lens_perspective_stretch":
      // DeepWide — strong FOV stretch (user already sees this)
      return grade(radialMap(base, 1.05), "contrast(1.14) saturate(1.12)");
    default:
      return grade(sharpen(denoise(base), 0.9), "contrast(1.1)");
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
