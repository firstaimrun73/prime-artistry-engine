/**
 * Motio2edit Lens public API — quality kernels in opt-*.ts
 * New low-power lenses are handled here without modifying opt-switch.
 */
import type { CameraLensDef, LensAspectId } from "./roster";
import {
  captureVideoFrame,
  cropToAspect,
  canvasToBlob,
  clone,
  normalizeCaptureSize,
  estimateBrightness,
} from "./opt-core";
import { applyLensById } from "./opt-switch";
import { infrared } from "./opt-fx1";

export { captureVideoFrame, cropToAspect, canvasToBlob, normalizeCaptureSize, estimateBrightness };

const LIGHTWEIGHT_IDS = new Set([
  "lens_hd_4k",
  "lens_retro_80s",
  "lens_snake_view",
  "lens_date_time",
  "lens_golden_hour",
  "lens_film_noir",
  "lens_neon_dream",
  "lens_chrome_pop",
  "lens_dream_glow",
  "lens_prism_color",
]);

let _tsCache = "";
let _tsCacheAt = 0;
function cachedTimestamp(): string {
  const now = Date.now();
  if (now - _tsCacheAt < 1000 && _tsCache) return _tsCache;
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  _tsCache = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  _tsCacheAt = now;
  return _tsCache;
}

let _tmpB: HTMLCanvasElement | null = null;
function tmpCanvas(w: number, h: number): HTMLCanvasElement {
  if (_tmpB && _tmpB.width === w && _tmpB.height === h) return _tmpB;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  _tmpB = c;
  return c;
}

function cssGrade(src: HTMLCanvasElement, filter: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.filter = filter;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  return c;
}

function lightSharpen(src: HTMLCanvasElement): HTMLCanvasElement {
  return cssGrade(src, "contrast(1.18) saturate(1.08) brightness(1.03)");
}

function snakeHeat(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const t = y / 255;
    let r: number, g: number, b: number;
    if (t < 0.25) {
      const u = t / 0.25;
      r = 20 + u * 40; g = 10 + u * 20; b = 80 + u * 120;
    } else if (t < 0.5) {
      const u = (t - 0.25) / 0.25;
      r = 60 + u * 100; g = 30 + u * 40; b = 200 - u * 80;
    } else if (t < 0.75) {
      const u = (t - 0.5) / 0.25;
      r = 160 + u * 80; g = 70 + u * 80; b = 120 - u * 100;
    } else {
      const u = (t - 0.75) / 0.25;
      r = 240; g = 150 + u * 80; b = 20 + u * 30;
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function softGlow(src: HTMLCanvasElement, blurPx = 8, alpha = 0.35): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const blur = tmpCanvas(w, h);
  const bctx = blur.getContext("2d")!;
  bctx.clearRect(0, 0, w, h);
  bctx.filter = `blur(${blurPx}px)`;
  bctx.drawImage(src, 0, 0);
  bctx.filter = "none";
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = alpha;
  ctx.drawImage(blur, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function scanlines(src: HTMLCanvasElement, strength = 0.12): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const step = Math.max(2, Math.round(c.height / 180));
  ctx.fillStyle = `rgba(0,0,0,${strength})`;
  for (let y = 0; y < c.height; y += step * 2) ctx.fillRect(0, y, c.width, step);
  return c;
}

function burnDateTime(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const fs = Math.max(12, Math.round(c.width * 0.028));
  const pad = Math.max(10, Math.round(c.width * 0.02));
  ctx.save();
  ctx.font = `600 ${fs}px "Courier New", Courier, monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 4;
  ctx.fillStyle = "rgba(255, 170, 40, 0.95)";
  ctx.fillText(cachedTimestamp(), pad, c.height - pad);
  ctx.restore();
  return c;
}

function prismShift(src: HTMLCanvasElement, px = 3): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.55;
  ctx.drawImage(src, px, 0);
  ctx.globalAlpha = 0.45;
  ctx.drawImage(src, -px, 1);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.65;
  ctx.drawImage(src, 0, 0);
  ctx.globalAlpha = 1;
  return cssGrade(c, "contrast(1.1) saturate(1.25) brightness(1.02)");
}

function applyLightweightLens(source: HTMLCanvasElement, lensId: string, liveMode: boolean): HTMLCanvasElement {
  switch (lensId) {
    case "lens_hd_4k": {
      const graded = cssGrade(source, "contrast(1.14) saturate(1.08) brightness(1.03)");
      return liveMode ? graded : lightSharpen(graded);
    }
    case "lens_retro_80s": {
      const base = cssGrade(source, "sepia(0.25) contrast(1.05) brightness(1.06) saturate(1.35) hue-rotate(-12deg)");
      return scanlines(softGlow(base, liveMode ? 6 : 10, liveMode ? 0.22 : 0.32), liveMode ? 0.08 : 0.12);
    }
    case "lens_snake_view":
      return snakeHeat(source);
    case "lens_date_time":
      return burnDateTime(cssGrade(source, "contrast(1.05) brightness(1.02)"));
    case "lens_golden_hour":
      return cssGrade(source, "sepia(0.28) saturate(1.2) contrast(1.08) brightness(1.06) hue-rotate(-8deg)");
    case "lens_film_noir":
      return cssGrade(source, "grayscale(1) contrast(1.35) brightness(0.98)");
    case "lens_neon_dream": {
      const base = cssGrade(source, "saturate(1.45) contrast(1.12) brightness(1.04) hue-rotate(8deg)");
      return softGlow(base, liveMode ? 5 : 9, liveMode ? 0.2 : 0.3);
    }
    case "lens_chrome_pop":
      return cssGrade(source, "contrast(1.28) saturate(0.85) brightness(1.05) hue-rotate(8deg)");
    case "lens_dream_glow": {
      const base = cssGrade(source, "brightness(1.08) contrast(0.95) saturate(1.1)");
      return softGlow(base, liveMode ? 8 : 14, liveMode ? 0.28 : 0.4);
    }
    case "lens_prism_color":
      return prismShift(source, liveMode ? 2 : 4);
    default:
      return source;
  }
}

/** Output watermark badge — scales from output WIDTH (~26%). Output only. */
export function applyFreeLensWatermark(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  const badgeW = Math.round(Math.min(Math.max(W * 0.26, 120), Math.min(W * 0.32, 720)));
  const badgeH = Math.round(badgeW * 0.42);
  const margin = Math.max(10, Math.round(W * 0.018));
  const x = W - margin - badgeW;
  const y = H - margin - badgeH;
  const r = Math.max(6, Math.round(badgeW * 0.08));
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = Math.max(6, badgeW * 0.04);
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + badgeW, y, x + badgeW, y + badgeH, r);
  ctx.arcTo(x + badgeW, y + badgeH, x, y + badgeH, r);
  ctx.arcTo(x, y + badgeH, x, y, r);
  ctx.arcTo(x, y, x + badgeW, y, r);
  ctx.closePath();
  ctx.fillStyle = "rgba(12, 10, 18, 0.72)";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(255, 200, 120, 0.35)";
  ctx.lineWidth = Math.max(1, badgeW * 0.008);
  ctx.stroke();
  const grad = ctx.createLinearGradient(x, y, x + badgeW, y + badgeH);
  grad.addColorStop(0, "rgba(255, 214, 90, 0.98)");
  grad.addColorStop(0.5, "rgba(255, 152, 60, 0.95)");
  grad.addColorStop(1, "rgba(180, 130, 220, 0.92)");
  const brandFs = Math.round(badgeW * 0.16);
  const lensFs = Math.round(badgeW * 0.12);
  const cx = x + badgeW / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = grad;
  ctx.font = `700 ${brandFs}px system-ui, -apple-system, sans-serif`;
  ctx.fillText("Motio2edit", cx, y + badgeH * 0.42);
  ctx.font = `600 ${lensFs}px system-ui, -apple-system, sans-serif`;
  ctx.fillText("L E N S E S 📸", cx, y + badgeH * 0.72);
  ctx.restore();
  return c;
}

export function applyLensOpticalEnhanced(
  source: HTMLCanvasElement,
  lens: CameraLensDef,
  aspectId: LensAspectId = "native",
  opts?: { watermark?: boolean; maxEdge?: number },
): HTMLCanvasElement {
  const maxEdge = opts?.maxEdge ?? 2560;
  const prepared = normalizeCaptureSize(source, maxEdge);
  const liveMode = maxEdge <= 1280;
  let result: HTMLCanvasElement;
  if (LIGHTWEIGHT_IDS.has(lens.id)) {
    const base = aspectId !== "native" ? cropToAspect(prepared, aspectId) : prepared;
    result = applyLightweightLens(base, lens.id, liveMode);
  } else {
    result = applyLensById(prepared, lens.id, aspectId);
  }
  if (opts?.watermark === true) result = applyFreeLensWatermark(result);
  return result;
}

export function applyLensOptical(
  source: HTMLCanvasElement | HTMLVideoElement,
  lens: CameraLensDef,
  aspectId: LensAspectId = "native",
  mirror = false,
  opts?: { watermark?: boolean },
): HTMLCanvasElement {
  const frame = source instanceof HTMLVideoElement ? captureVideoFrame(source, mirror) : source;
  return applyLensOpticalEnhanced(frame, lens, aspectId, opts);
}

export function nightBoostPreview(src: HTMLCanvasElement, _s = 0.9): HTMLCanvasElement {
  return infrared(src);
}
