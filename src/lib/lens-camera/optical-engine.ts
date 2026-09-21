/**
 * Motio2edit Lens public API — quality kernels in opt-*.ts
 * 4K HD + Windows Colour handled here without modifying opt-switch.
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

const LIGHTWEIGHT_IDS = new Set(["lens_hd_4k", "lens_windows_colour"]);

function cssGrade(src: HTMLCanvasElement, filter: string): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.filter = filter;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  return c;
}

function lightSharpen(src: HTMLCanvasElement): HTMLCanvasElement {
  // Modest capture-only clarity: unsharp via high-pass blend (no upscale)
  const soft = document.createElement("canvas");
  soft.width = src.width;
  soft.height = src.height;
  const sctx = soft.getContext("2d")!;
  sctx.filter = "blur(1.2px)";
  sctx.drawImage(src, 0, 0);
  sctx.filter = "none";
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "difference";
  ctx.globalAlpha = 0.55;
  ctx.drawImage(soft, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  const detail = document.createElement("canvas");
  detail.width = src.width;
  detail.height = src.height;
  const dctx = detail.getContext("2d")!;
  dctx.drawImage(c, 0, 0);
  const out = clone(src);
  const octx = out.getContext("2d")!;
  octx.drawImage(src, 0, 0);
  octx.globalCompositeOperation = "overlay";
  octx.globalAlpha = 0.35;
  octx.drawImage(detail, 0, 0);
  octx.globalCompositeOperation = "source-over";
  octx.globalAlpha = 1;
  return out;
}

function applyLightweightLens(
  source: HTMLCanvasElement,
  lensId: string,
  liveMode: boolean,
): HTMLCanvasElement {
  switch (lensId) {
    case "lens_hd_4k": {
      if (liveMode) {
        return cssGrade(source, "contrast(1.08) saturate(1.06) brightness(1.02)");
      }
      const graded = cssGrade(source, "contrast(1.1) saturate(1.08) brightness(1.02)");
      return lightSharpen(graded);
    }
    case "lens_windows_colour": {
      return cssGrade(
        source,
        liveMode
          ? "contrast(1.06) saturate(1.12) brightness(1.04)"
          : "contrast(1.1) saturate(1.18) brightness(1.05)",
      );
    }
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
  ctx.fillText("L E N S E S \ud83d\udcf8", cx, y + badgeH * 0.72);
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
