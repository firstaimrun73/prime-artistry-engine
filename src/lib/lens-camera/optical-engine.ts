/**
 * Motio2edit Lens — on-device image processing.
 * Each lens produces a clearly distinguishable result.
 * Native aspect is preserved when aspectId === "native".
 * Watermark only when opts.watermark === true (final download).
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

function sampleBilinear(data: Uint8ClampedArray, w: number, h: number, x: number, y: number): [number, number, number, number] {
  const xi = Math.max(0, Math.min(w - 1, Math.floor(x)));
  const yi = Math.max(0, Math.min(h - 1, Math.floor(y)));
  const x1 = Math.min(w - 1, xi + 1);
  const y1 = Math.min(h - 1, yi + 1);
  const fx = Math.max(0, Math.min(1, x - xi));
  const fy = Math.max(0, Math.min(1, y - yi));
  const i00 = (yi * w + xi) * 4, i10 = (yi * w + x1) * 4, i01 = (y1 * w + xi) * 4, i11 = (y1 * w + x1) * 4;
  return [
    data[i00]*(1-fx)*(1-fy)+data[i10]*fx*(1-fy)+data[i01]*(1-fx)*fy+data[i11]*fx*fy,
    data[i00+1]*(1-fx)*(1-fy)+data[i10+1]*fx*(1-fy)+data[i01+1]*(1-fx)*fy+data[i11+1]*fx*fy,
    data[i00+2]*(1-fx)*(1-fy)+data[i10+2]*fx*(1-fy)+data[i01+2]*(1-fx)*fy+data[i11+2]*fx*fy,
    data[i00+3]*(1-fx)*(1-fy)+data[i10+3]*fx*(1-fy)+data[i01+3]*(1-fx)*fy+data[i11+3]*fx*fy,
  ];
}

function radialMap(src: HTMLCanvasElement, k: number): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const octx = out.getContext("2d")!;
  const sd = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const dst = octx.createImageData(w, h);
  const dd = dst.data;
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy) || 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / maxR, dy = (y - cy) / maxR;
      const f = 1 + k * (dx * dx + dy * dy);
      const [r, g, b, a] = sampleBilinear(sd, w, h, cx + (dx * maxR) / f, cy + (dy * maxR) / f);
      const di = (y * w + x) * 4;
      dd[di] = r; dd[di + 1] = g; dd[di + 2] = b; dd[di + 3] = a;
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
  const sd = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const dst = octx.createImageData(w, h);
  const dd = dst.data;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(cx, cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      const di = (y * w + x) * 4;
      if (r > maxR) {
        dd[di + 3] = 0;
        continue;
      }
      const theta = Math.atan2(dy, dx);
      const nr = (r / maxR) * (r / maxR);
      const sx = Math.round(cx + nr * maxR * Math.cos(theta));
      const sy = Math.round(cy + nr * maxR * Math.sin(theta));
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

function grade(src: HTMLCanvasElement, filter: string): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.filter = filter;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  return c;
}

function sharpen(src: HTMLCanvasElement, amount = 1): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const w = c.width;
  const h = c.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const copy = new Uint8ClampedArray(d);
  const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const i = ((y + ky) * w + (x + kx)) * 4;
          const kv = k[(ky + 1) * 3 + (kx + 1)];
          r += copy[i] * kv;
          g += copy[i + 1] * kv;
          b += copy[i + 2] * kv;
        }
      }
      const i = (y * w + x) * 4;
      d[i] = Math.min(255, Math.max(0, copy[i] * (1 - amount) + r * amount));
      d[i + 1] = Math.min(255, Math.max(0, copy[i + 1] * (1 - amount) + g * amount));
      d[i + 2] = Math.min(255, Math.max(0, copy[i + 2] * (1 - amount) + b * amount));
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function teleCrop(src: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const cw = Math.round(w / factor);
  const ch = Math.round(h / factor);
  const sx = Math.floor((w - cw) / 2);
  const sy = Math.floor((h - ch) / 2);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(src, sx, sy, cw, ch, 0, 0, w, h);
  return out;
}

function portraitBloom(src: HTMLCanvasElement): HTMLCanvasElement {
  const soft = document.createElement("canvas");
  soft.width = src.width; soft.height = src.height;
  const sctx = soft.getContext("2d")!;
  sctx.filter = "blur(4.5px)";
  sctx.drawImage(src, 0, 0);
  sctx.filter = "none";
  const c = document.createElement("canvas");
  c.width = src.width; c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(soft, 0, 0);
  const cx = c.width / 2, cy = c.height * 0.42;
  const rx = Math.min(c.width, c.height) * 0.32;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, rx * 1.15, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(src, 0, 0);
  ctx.restore();
  return grade(sharpen(c, 0.5), "contrast(1.1) saturate(1.08) brightness(1.03)");
}

function dreamSoft(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.filter = "blur(1.2px) brightness(1.05) saturate(1.1)";
  ctx.globalAlpha = 0.55;
  ctx.drawImage(src, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  return c;
}

function glowMist(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.filter = "blur(2.5px) brightness(1.12)";
  ctx.globalAlpha = 0.4;
  ctx.drawImage(src, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  return grade(c, "contrast(1.08) saturate(1.15)");
}

function vintage(src: HTMLCanvasElement): HTMLCanvasElement {
  return grade(src, "sepia(0.35) contrast(1.1) brightness(1.05) saturate(0.9)");
}

function infrared(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    d[i] = Math.min(255, g * 1.1 + 20);
    d[i + 1] = Math.min(255, r * 0.7 + b * 0.3);
    d[i + 2] = Math.min(255, b * 0.5);
  }
  ctx.putImageData(img, 0, 0);
  return grade(c, "contrast(1.25) saturate(1.3)");
}

function microReveal(src: HTMLCanvasElement): HTMLCanvasElement {
  return grade(sharpen(teleCrop(src, 1.8), 1.5), "contrast(1.2) saturate(1.05)");
}

function tiltShift(src: HTMLCanvasElement): HTMLCanvasElement {
  const soft = document.createElement("canvas");
  soft.width = src.width; soft.height = src.height;
  const sctx = soft.getContext("2d")!;
  sctx.filter = "blur(5.5px)";
  sctx.drawImage(src, 0, 0);
  sctx.filter = "none";
  const c = clone(soft);
  const ctx = c.getContext("2d")!;
  const h = c.height;
  const bandTop = Math.round(h * 0.38);
  const bandH = Math.round(h * 0.28);
  ctx.drawImage(src, 0, bandTop, c.width, bandH, 0, bandTop, c.width, bandH);
  return grade(c, "contrast(1.2) saturate(1.35) brightness(1.04)");
}

function prismEcho(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.25;
  ctx.drawImage(src, 2, 0);
  ctx.drawImage(src, -2, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return grade(c, "contrast(1.15) saturate(1.35)");
}

function swirlBackground(src: HTMLCanvasElement): HTMLCanvasElement {
  return grade(radialMap(src, 0.55), "contrast(1.18) saturate(1.2)");
}

function starflare(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = grade(src, "contrast(1.2) brightness(1.08) saturate(1.15)");
  const ctx = c.getContext("2d")!;
  ctx.strokeStyle = "rgba(255,240,200,0.35)";
  ctx.lineWidth = 1.5;
  const cx = c.width * 0.7, cy = c.height * 0.25;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40);
    ctx.stroke();
  }
  return c;
}

function radialBokeh(src: HTMLCanvasElement, strength = 0.8): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.filter = `blur(${2 + strength * 3}px)`;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  const cx = c.width / 2, cy = c.height / 2;
  const r = Math.min(c.width, c.height) * 0.28;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(src, 0, 0);
  ctx.restore();
  return grade(c, "contrast(1.12) saturate(1.1)");
}

function architectAlign(src: HTMLCanvasElement): HTMLCanvasElement {
  return sharpen(grade(radialMap(src, -0.38), "contrast(1.18) saturate(0.92)"), 0.75);
}

export function applyFreeLensWatermark(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const pad = Math.max(12, Math.round(Math.min(c.width, c.height) * 0.022));
  const fontSize = Math.max(12, Math.round(Math.min(c.width, c.height) * 0.026));
  ctx.save();
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 5;
  ctx.fillText("L E N S E S", c.width - pad, c.height - pad - fontSize * 1.2);
  ctx.font = `500 ${Math.round(fontSize * 0.82)}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.fillText("M O T I O 2 E D I T", c.width - pad, c.height - pad);
  ctx.restore();
  return c;
}

export function applyLensOpticalEnhanced(
  source: HTMLCanvasElement,
  lens: CameraLensDef,
  aspectId: LensAspectId = "native",
  opts?: { watermark?: boolean },
): HTMLCanvasElement {
  const base = cropToAspect(source, aspectId);
  let result: HTMLCanvasElement;
  switch (lens.id) {
    case "lens_perspective_stretch":
      result = grade(radialMap(base, 1.72), "contrast(1.24) saturate(1.18) brightness(1.03)");
      break;
    case "lens_fisheye_orbit":
      result = grade(fisheye360(base), "contrast(1.22) saturate(1.18) brightness(1.02)");
      break;
    case "lens_ultrawide_horizon":
      result = grade(radialMap(base, 1.55), "contrast(1.22) saturate(1.3) brightness(1.05)");
      break;
    case "lens_portrait_bloom":
      result = portraitBloom(base);
      break;
    case "lens_natural_frame":
      result = grade(sharpen(base, 0.45), "contrast(1.07) saturate(1.05) brightness(1.02)");
      break;
    case "lens_cinematic_compress":
      result = grade(sharpen(teleCrop(base, 2.1), 1.2), "contrast(1.3) saturate(1.25) brightness(1.05)");
      break;
    case "lens_dreamsoft":
      result = dreamSoft(base);
      break;
    case "lens_widevista":
      result = grade(radialMap(base, 1.28), "contrast(1.2) saturate(1.18) brightness(1.03)");
      break;
    case "lens_farreach":
      result = grade(sharpen(teleCrop(base, 2.9), 1.35), "contrast(1.25) saturate(1.08)");
      break;
    case "lens_microreveal":
      result = microReveal(base);
      break;
    case "lens_miniature_shift":
      result = tiltShift(base);
      break;
    case "lens_glowmist":
      result = glowMist(base);
      break;
    case "lens_vintage_halation":
      result = vintage(base);
      break;
    case "lens_infraglow":
      result = infrared(base);
      break;
    case "lens_longglass_detail":
      result = grade(sharpen(teleCrop(base, 1.6), 1.9), "contrast(1.3) saturate(1.12) brightness(1.02)");
      break;
    case "lens_prism_echo":
      result = prismEcho(base);
      break;
    case "lens_swirl_depth":
      result = grade(radialMap(base, 0.85), "contrast(1.16) saturate(1.18)");
      break;
    case "lens_architect_align":
      result = architectAlign(base);
      break;
    case "lens_starflare":
      result = starflare(base);
      break;
    case "lens_selective_focus":
      result = radialBokeh(grade(base, "contrast(1.1)"), 0.85);
      break;
    default:
      result = grade(sharpen(base, 0.9), "contrast(1.1)");
  }
  if (opts?.watermark === true) {
    result = applyFreeLensWatermark(result);
  }
  return result;
}

export function applyLensOptical(
  source: HTMLCanvasElement | HTMLVideoElement,
  lens: CameraLensDef,
  aspectId: LensAspectId = "native",
  mirror = false,
  opts?: { watermark?: boolean },
): HTMLCanvasElement {
  const frame =
    source instanceof HTMLVideoElement ? captureVideoFrame(source, mirror) : source;
  return applyLensOpticalEnhanced(frame, lens, aspectId, opts);
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

export function nightBoostPreview(src: HTMLCanvasElement, _strength = 0.9): HTMLCanvasElement {
  return infrared(src);
}
