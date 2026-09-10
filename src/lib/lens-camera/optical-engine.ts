/**
 * Motio2edit Lens — on-device image processing.
 * Each lens produces a clearly distinguishable result.
 * Native aspect is preserved when aspectId === "native".
 * Watermark is NEVER applied unless opts.watermark === true (final output only).
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
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, cw, ch);
  return c;
}

function clone(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  c.getContext("2d")!.drawImage(src, 0, 0);
  return c;
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
  ctx.globalAlpha = Math.min(1, amount * 0.35);
  ctx.globalCompositeOperation = "overlay";
  ctx.filter = "contrast(1.4)";
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function teleCrop(src: HTMLCanvasElement, zoom: number): HTMLCanvasElement {
  const z = Math.max(1.05, zoom);
  const sw = src.width;
  const sh = src.height;
  const cw = Math.round(sw / z);
  const ch = Math.round(sh / z);
  const c = document.createElement("canvas");
  c.width = sw;
  c.height = sh;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, sw, sh);
  return c;
}

function radialMap(src: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = src.getContext("2d")!.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / maxR;
      const dy = (y - cy) / maxR;
      const r = Math.sqrt(dx * dx + dy * dy);
      const f = 1 + strength * r * r;
      const sx = Math.round(cx + (dx * maxR) / f);
      const sy = Math.round(cy + (dy * maxR) / f);
      const si = (Math.min(w - 1, Math.max(0, sx)) + Math.min(h - 1, Math.max(0, sy)) * w) * 4;
      const di = (x + y * w) * 4;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

function fisheye360(src: HTMLCanvasElement): HTMLCanvasElement {
  return radialMap(src, 2.4);
}

function radialBokeh(src: HTMLCanvasElement, power = 0.7): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(
    c.width / 2,
    c.height / 2,
    Math.min(c.width, c.height) * 0.2,
    c.width / 2,
    c.height / 2,
    Math.min(c.width, c.height) * 0.75,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${0.35 * power})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.filter = `blur(${Math.round(4 * power)}px)`;
  ctx.globalAlpha = 0.35 * power;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  return c;
}

function swirlBackground(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = radialMap(src, 0.55);
  return grade(radialBokeh(c, 0.9), "saturate(1.15) contrast(1.08)");
}

function infrared(src: HTMLCanvasElement): HTMLCanvasElement {
  return grade(src, "hue-rotate(90deg) saturate(0.35) contrast(1.25) brightness(1.08)");
}

function vintage(src: HTMLCanvasElement): HTMLCanvasElement {
  return grade(src, "sepia(0.45) contrast(1.1) brightness(1.05) saturate(0.85)");
}

function starflare(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "rgba(255,255,220,0.12)";
  for (let i = 0; i < 8; i++) {
    const x = (c.width * (i + 1)) / 9;
    const y = c.height * 0.2;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(8, c.width * 0.01), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  return grade(c, "contrast(1.12) saturate(1.1)");
}

function prismEcho(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.25;
  ctx.drawImage(src, 3, 0);
  ctx.globalAlpha = 0.2;
  ctx.drawImage(src, -3, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return grade(c, "saturate(1.25) contrast(1.08)");
}

function farReach(src: HTMLCanvasElement): HTMLCanvasElement {
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

/** Dense white corner watermark — L E N S E S / M O T I O 2 E D I T */
export function applyFreeLensWatermark(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const min = Math.min(c.width, c.height);
  const pad = Math.max(12, Math.round(min * 0.028));
  const fontSize = Math.max(13, Math.round(min * 0.036));
  ctx.save();
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  const labelW = Math.round(fontSize * 8.5);
  const labelH = Math.round(fontSize * 2.6);
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  const rx = c.width - pad - labelW - 6;
  const ry = c.height - pad - labelH - 4;
  const r = Math.max(6, Math.round(fontSize * 0.35));
  ctx.beginPath();
  ctx.moveTo(rx + r, ry);
  ctx.arcTo(rx + labelW + 12, ry, rx + labelW + 12, ry + labelH, r);
  ctx.arcTo(rx + labelW + 12, ry + labelH + 8, rx, ry + labelH + 8, r);
  ctx.arcTo(rx, ry + labelH + 8, rx, ry, r);
  ctx.arcTo(rx, ry, rx + labelW + 12, ry, r);
  ctx.closePath();
  ctx.fill();
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 6;
  ctx.fillText("L E N S E S", c.width - pad, c.height - pad - fontSize * 1.2);
  ctx.font = `600 ${Math.round(fontSize * 0.72)}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.86)";
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
      result = grade(radialMap(base, 1.65), "contrast(1.25) saturate(1.2) brightness(1.04)");
      break;
    case "lens_fisheye_orbit":
      result = grade(fisheye360(base), "contrast(1.22) saturate(1.18) brightness(1.02)");
      break;
    case "lens_widevista":
      result = grade(radialMap(base, 0.95), "contrast(1.12) saturate(1.15)");
      break;
    case "lens_ultrawide_horizon":
      result = grade(radialMap(base, 1.35), "contrast(1.15) saturate(1.12) brightness(1.03)");
      break;
    case "lens_cinematic_compress":
      result = grade(teleCrop(base, 1.55), "contrast(1.2) saturate(0.95) brightness(0.98)");
      break;
    case "lens_farreach":
      result = farReach(base);
      break;
    case "lens_portrait_bloom":
      result = grade(radialBokeh(base, 0.95), "brightness(1.05) saturate(1.1)");
      break;
    case "lens_swirl_depth":
      result = swirlBackground(base);
      break;
    case "lens_longglass_detail":
      result = grade(sharpen(teleCrop(base, 1.6), 1.9), "contrast(1.3) saturate(1.12) brightness(1.02)");
      break;
    case "lens_selective_focus":
      result = radialBokeh(grade(base, "contrast(1.1)"), 0.85);
      break;
    case "lens_natural_frame":
      result = grade(sharpen(base, 0.4), "contrast(1.05)");
      break;
    case "lens_microreveal":
      result = microReveal(base);
      break;
    case "lens_miniature_shift":
      result = grade(radialBokeh(base, 1.1), "saturate(1.25) contrast(1.15)");
      break;
    case "lens_architect_align":
      result = architectAlign(base);
      break;
    case "lens_dreamsoft":
      result = grade(base, "blur(0.6px) brightness(1.06) saturate(0.95)");
      break;
    case "lens_glowmist":
      result = grade(base, "brightness(1.08) contrast(0.95) saturate(1.05)");
      break;
    case "lens_starflare":
      result = starflare(base);
      break;
    case "lens_prism_echo":
      result = prismEcho(base);
      break;
    case "lens_vintage_halation":
      result = vintage(base);
      break;
    case "lens_infraglow":
      result = infrared(base);
      break;
    default:
      result = grade(sharpen(base, 0.9), "contrast(1.1)");
  }
  // Watermark ONLY when explicitly requested (final commit), never on live preview
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
): HTMLCanvasElement {
  const frame =
    source instanceof HTMLVideoElement ? captureVideoFrame(source, mirror) : source;
  return applyLensOpticalEnhanced(frame, lens, aspectId, { watermark: false });
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type, quality);
  });
}
