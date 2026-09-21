/**
 * Motio2edit Lens public API — quality kernels in opt-*.ts
 * Lightweight / UI-driven lenses handled here without modifying opt-switch.
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
  "lens_windows_colour",
  "lens_date_time",
  "lens_snake_view",
  "lens_retro_80s",
]);

export type LensProcessOpts = {
  watermark?: boolean;
  maxEdge?: number;
  zoom?: number;
  dateTimeMode?: "date" | "time" | "both";
  dateTimeStyle?: "digital" | "clean" | "mono" | "classic";
  colourNegative?: boolean;
  dateTimeText?: string;
};

function cssGrade(src: HTMLCanvasElement, filter: string): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.filter = filter;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  return c;
}

function lightSharpen(src: HTMLCanvasElement, strength = 0.35): HTMLCanvasElement {
  const soft = document.createElement("canvas");
  soft.width = src.width;
  soft.height = src.height;
  const sctx = soft.getContext("2d")!;
  sctx.filter = "blur(1.15px)";
  sctx.drawImage(src, 0, 0);
  sctx.filter = "none";
  const detail = document.createElement("canvas");
  detail.width = src.width;
  detail.height = src.height;
  const dctx = detail.getContext("2d")!;
  dctx.drawImage(src, 0, 0);
  dctx.globalCompositeOperation = "difference";
  dctx.globalAlpha = 0.55;
  dctx.drawImage(soft, 0, 0);
  dctx.globalCompositeOperation = "source-over";
  dctx.globalAlpha = 1;
  const out = clone(src);
  const octx = out.getContext("2d")!;
  octx.drawImage(src, 0, 0);
  octx.globalCompositeOperation = "overlay";
  octx.globalAlpha = strength;
  octx.drawImage(detail, 0, 0);
  octx.globalCompositeOperation = "source-over";
  octx.globalAlpha = 1;
  return out;
}

export function applyDigitalZoom(src: HTMLCanvasElement, zoom: number): HTMLCanvasElement {
  const z = Math.min(100, Math.max(1, zoom || 1));
  if (z <= 1.01) return clone(src);
  const inv = 1 / z;
  const sw = Math.max(1, Math.round(src.width * inv));
  const sh = Math.max(1, Math.round(src.height * inv));
  const sx = Math.round((src.width - sw) / 2);
  const sy = Math.round((src.height - sh) / 2);
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out;
}

function snakeHeat(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const t = y / 255;
    let r = 0, g = 0, b = 0;
    if (t < 0.25) {
      const u = t / 0.25;
      r = 20 + u * 80; g = 0; b = 40 + u * 120;
    } else if (t < 0.5) {
      const u = (t - 0.25) / 0.25;
      r = 100 + u * 155; g = u * 40; b = 160 - u * 160;
    } else if (t < 0.75) {
      const u = (t - 0.5) / 0.25;
      r = 255; g = 40 + u * 180; b = 0;
    } else {
      const u = (t - 0.75) / 0.25;
      r = 255; g = 220 + u * 35; b = u * 200;
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function colourNegative(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i + 1] = 255 - d[i + 1];
    d[i + 2] = 255 - d[i + 2];
  }
  ctx.putImageData(img, 0, 0);
  return cssGrade(c, "contrast(1.12) saturate(1.15) brightness(1.02)");
}

function burnCenteredDateTime(
  src: HTMLCanvasElement,
  text: string,
  style: "digital" | "clean" | "mono" | "classic",
): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  const fs = Math.max(18, Math.round(Math.min(W, H) * 0.055));
  const fonts: Record<string, string> = {
    digital: `700 ${fs}px "Courier New", monospace`,
    clean: `600 ${fs}px system-ui, -apple-system, sans-serif`,
    mono: `500 ${fs}px ui-monospace, SFMono-Regular, Menlo, monospace`,
    classic: `italic 600 ${fs}px Georgia, "Times New Roman", serif`,
  };
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = fonts[style] ?? fonts.clean;
  const padX = Math.round(fs * 0.7);
  const padY = Math.round(fs * 0.45);
  const metrics = ctx.measureText(text);
  const boxW = metrics.width + padX * 2;
  const boxH = fs + padY * 2;
  const cx = W / 2;
  const cy = H / 2;
  const x = cx - boxW / 2;
  const y = cy - boxH / 2;
  const r = Math.max(6, fs * 0.25);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + boxW, y, x + boxW, y + boxH, r);
  ctx.arcTo(x + boxW, y + boxH, x, y + boxH, r);
  ctx.arcTo(x, y + boxH, x, y, r);
  ctx.arcTo(x, y, x + boxW, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = Math.max(1, fs * 0.04);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 4;
  ctx.fillText(text, cx, cy);
  ctx.restore();
  return c;
}

function applyLightweightLens(
  source: HTMLCanvasElement,
  lensId: string,
  liveMode: boolean,
  opts: LensProcessOpts,
): HTMLCanvasElement {
  switch (lensId) {
    case "lens_hd_4k": {
      if (liveMode) return cssGrade(source, "contrast(1.08) saturate(1.06) brightness(1.02)");
      const graded = cssGrade(source, "contrast(1.12) saturate(1.08) brightness(1.03)");
      return lightSharpen(graded, 0.42);
    }
    case "lens_windows_colour": {
      let base = cssGrade(
        source,
        liveMode
          ? "contrast(1.06) saturate(1.14) brightness(1.05)"
          : "contrast(1.12) saturate(1.22) brightness(1.06)",
      );
      if (!liveMode) base = lightSharpen(base, 0.22);
      if (opts.colourNegative) base = colourNegative(base);
      return base;
    }
    case "lens_date_time": {
      const text =
        opts.dateTimeText ||
        new Date().toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      const graded = cssGrade(source, "contrast(1.05) brightness(1.02)");
      if (liveMode && !opts.dateTimeText) return graded;
      return burnCenteredDateTime(graded, text, opts.dateTimeStyle ?? "clean");
    }
    case "lens_snake_view":
      return snakeHeat(source);
    case "lens_retro_80s":
      return cssGrade(
        source,
        liveMode
          ? "sepia(0.25) hue-rotate(-15deg) saturate(1.35) contrast(1.08)"
          : "sepia(0.35) hue-rotate(-18deg) saturate(1.45) contrast(1.12) brightness(1.02)",
      );
    default:
      return source;
  }
}

export function applyFreeLensWatermark(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  const badgeW = Math.round(Math.min(Math.max(W * 0.26, 110), Math.min(W * 0.28, 720)));
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
  ctx.fillText("L E N S E S \u{1F4F8}", cx, y + badgeH * 0.72);
  ctx.restore();
  return c;
}

export function applyLensOpticalEnhanced(
  source: HTMLCanvasElement,
  lens: CameraLensDef,
  aspectId: LensAspectId = "native",
  opts?: LensProcessOpts,
): HTMLCanvasElement {
  const maxEdge = opts?.maxEdge ?? 2560;
  let prepared = normalizeCaptureSize(source, maxEdge);
  if (lens.id === "lens_farreach" && opts?.zoom && opts.zoom > 1.01) {
    prepared = applyDigitalZoom(prepared, opts.zoom);
    if (!opts?.maxEdge || opts.maxEdge > 1280) {
      prepared = lightSharpen(
        cssGrade(prepared, "contrast(1.14) saturate(1.08) brightness(1.02)"),
        0.38,
      );
    }
  }
  const liveMode = maxEdge <= 1280;
  let result: HTMLCanvasElement;
  if (LIGHTWEIGHT_IDS.has(lens.id)) {
    const base = aspectId !== "native" ? cropToAspect(prepared, aspectId) : prepared;
    result = applyLightweightLens(base, lens.id, liveMode, opts ?? {});
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
  opts?: LensProcessOpts,
): HTMLCanvasElement {
  const frame = source instanceof HTMLVideoElement ? captureVideoFrame(source, mirror) : source;
  return applyLensOpticalEnhanced(frame, lens, aspectId, opts);
}

export function nightBoostPreview(src: HTMLCanvasElement, _s = 0.9): HTMLCanvasElement {
  return infrared(src);
}

export function formatDateTimeOverlay(mode: "date" | "time" | "both"): string {
  const now = new Date();
  if (mode === "date") {
    return now.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  if (mode === "time") {
    return now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  return now.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
