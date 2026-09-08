/**
 * Motio2edit Lens — on-device image processing.
 * Each lens produces a clearly distinguishable result.
 * Native aspect is preserved when aspectId === "native".
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
          (srcD[i - 4 + ch] + srcD[i + 4 + ch] + srcD[i - w * 4 + ch] + srcD[i + w * 4 + ch]) / 4;
        d[i + ch] = Math.max(0, Math.min(255, c0 + (c0 - blur) * amount));
      }
    }
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
  bctx.filter = "blur(10px)";
  bctx.drawImage(src, 0, 0);
  bctx.filter = "none";
  ctx.drawImage(blurC, 0, 0, c.width, top, 0, 0, c.width, top);
  ctx.drawImage(blurC, 0, top + band, c.width, h - top - band, 0, top + band, c.width, h - top - band);
  return grade(c, "saturate(1.4) contrast(1.18)");
}

function radialBokeh(src: HTMLCanvasElement, soft = 0.55): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const blurC = clone(src);
  const bctx = blurC.getContext("2d")!;
  bctx.filter = `blur(${Math.round(14 * soft)}px)`;
  bctx.drawImage(src, 0, 0);
  bctx.filter = "none";
  const g = ctx.createRadialGradient(
    c.width / 2, c.height / 2, c.width * 0.18,
    c.width / 2, c.height / 2, c.width * 0.72,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,1)");
  ctx.drawImage(blurC, 0, 0);
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "destination-over";
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function swirlBackground(src: HTMLCanvasElement): HTMLCanvasElement {
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
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy) / maxR;
      const angle = Math.atan2(dy, dx) + r * r * 1.8;
      const nr = r * maxR;
      const sx = Math.round(cx + Math.cos(angle) * nr);
      const sy = Math.round(cy + Math.sin(angle) * nr);
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
  const mask = octx.createRadialGradient(cx, cy, maxR * 0.2, cx, cy, maxR * 0.55);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  octx.globalCompositeOperation = "destination-out";
  octx.fillStyle = mask;
  octx.fillRect(0, 0, w, h);
  octx.globalCompositeOperation = "destination-over";
  octx.drawImage(src, 0, 0);
  octx.globalCompositeOperation = "source-over";
  return grade(out, "contrast(1.12) saturate(1.15)");
}

function starflare(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const img = data(src);
  const d = img.data;
  const w = src.width;
  const h = src.height;
  for (let y = 4; y < h - 4; y += 3) {
    for (let x = 4; x < w - 4; x += 3) {
      const i = (y * w + x) * 4;
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (lum < 230) continue;
      const len = 8 + Math.floor((lum - 230) / 5);
      ctx.strokeStyle = `rgba(255,255,240,${0.25 + (lum - 230) / 100})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - len, y);
      ctx.lineTo(x + len, y);
      ctx.moveTo(x, y - len);
      ctx.lineTo(x, y + len);
      ctx.moveTo(x - len * 0.7, y - len * 0.7);
      ctx.lineTo(x + len * 0.7, y + len * 0.7);
      ctx.moveTo(x - len * 0.7, y + len * 0.7);
      ctx.lineTo(x + len * 0.7, y - len * 0.7);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.25;
  ctx.filter = "blur(8px) brightness(1.15)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function dreamSoft(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.globalAlpha = 0.45;
  ctx.filter = "blur(6px)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  return grade(c, "brightness(1.06) saturate(1.08)");
}

function glowMist(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.5;
  ctx.filter = "blur(18px) brightness(1.25)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return grade(c, "brightness(1.04) saturate(1.1)");
}

function vintage(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = grade(src, "sepia(0.45) contrast(1.12) brightness(1.06)");
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.28;
  ctx.filter = "blur(14px)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  const img = data(c);
  const d = img.data;
  for (let i = 0; i < d.length; i += 16) {
    const n = (Math.random() - 0.5) * 12;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  return put(c, img);
}

function infrared(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const img = data(c);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    d[i] = Math.min(255, g * 1.1 + b * 0.15);
    d[i + 1] = Math.min(255, r * 0.35 + g * 0.55 + 20);
    d[i + 2] = Math.min(255, r * 0.55 + 10);
  }
  return put(c, img);
}

function prismEcho(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.5;
  ctx.drawImage(src, 8, 0);
  ctx.globalAlpha = 0.4;
  ctx.drawImage(src, -8, 0);
  ctx.globalAlpha = 0.25;
  ctx.drawImage(src, 0, 5);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return grade(c, "saturate(1.35) contrast(1.1)");
}

function portraitBloom(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = teleCrop(src, 1.85);
  c = grade(c, "brightness(1.08) contrast(1.1) saturate(1.18)");
  c = radialBokeh(c, 0.7);
  return sharpen(c, 0.55);
}

function microReveal(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = teleCrop(src, 3.2);
  c = sharpen(c, 1.6);
  c = radialBokeh(c, 0.45);
  return grade(c, "contrast(1.28) saturate(1.2)");
}

function architectAlign(src: HTMLCanvasElement): HTMLCanvasElement {
  return sharpen(grade(radialMap(src, -0.38), "contrast(1.18) saturate(0.92)"), 0.75);
}

export function applyFreeLensWatermark(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const pad = Math.max(10, Math.round(Math.min(c.width, c.height) * 0.02));
  const fontSize = Math.max(11, Math.round(Math.min(c.width, c.height) * 0.028));
  ctx.save();
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 4;
  ctx.fillText("LENSES", c.width - pad, c.height - pad - fontSize * 1.15);
  ctx.font = `500 ${Math.round(fontSize * 0.85)}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.fillText("Motio2edit", c.width - pad, c.height - pad);
  ctx.restore();
  return c;
}

export function applyLensOpticalEnhanced(
  source: HTMLCanvasElement,
  lens: CameraLensDef,
  aspectId: LensAspectId = "native",
): HTMLCanvasElement {
  const base = cropToAspect(source, aspectId);
  let result: HTMLCanvasElement;
  switch (lens.id) {
    case "lens_perspective_stretch":
      result = grade(radialMap(base, 1.65), "contrast(1.25) saturate(1.2) brightness(1.04)");
      break;
    case "lens_fisheye_orbit":
      result = grade(fisheye360(base), "contrast(1.22) saturate(1.18) brightness(1.02)");
      break;
    case "lens_ultrawide_horizon":
      result = grade(radialMap(base, 1.4), "contrast(1.2) saturate(1.28) brightness(1.05)");
      break;
    case "lens_portrait_bloom":
      result = portraitBloom(base);
      break;
    case "lens_natural_frame":
      result = clone(base);
      break;
    case "lens_cinematic_compress":
      result = grade(sharpen(teleCrop(base, 2.1), 1.2), "contrast(1.3) saturate(1.25) brightness(1.05)");
      break;
    case "lens_dreamsoft":
      result = dreamSoft(base);
      break;
    case "lens_widevista":
      result = grade(radialMap(base, 1.05), "contrast(1.18) saturate(1.16) brightness(1.03)");
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
      result = swirlBackground(base);
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
  if (lens.tier === "normal" && lens.creditCost === 0) {
    result = applyFreeLensWatermark(result);
  }
  return result;
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

export function nightBoostPreview(src: HTMLCanvasElement, _strength = 0.9): HTMLCanvasElement {
  return infrared(src);
}
