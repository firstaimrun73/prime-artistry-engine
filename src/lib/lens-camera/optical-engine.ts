/**
 * Motio2edit Lens public API — quality kernels in opt-*.ts
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

/** Output watermark — bottom-right, premium gold→orange→violet gradient */
export function applyFreeLensWatermark(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const pad = Math.max(14, Math.round(Math.min(c.width, c.height) * 0.024));
  const fs = Math.max(13, Math.round(Math.min(c.width, c.height) * 0.028));
  const x = c.width - pad;
  const yBrand = c.height - pad - fs * 1.2;
  const yLens = c.height - pad;

  ctx.save();
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  // Premium gradient: gold → orange → subtle violet
  const grad = ctx.createLinearGradient(x - fs * 8, yBrand, x, yLens);
  grad.addColorStop(0, "rgba(255, 214, 90, 0.95)");
  grad.addColorStop(0.45, "rgba(255, 152, 60, 0.92)");
  grad.addColorStop(1, "rgba(180, 130, 220, 0.88)");

  ctx.font = `700 ${fs}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = grad;
  ctx.fillText("Motio2edit", x, yBrand);

  ctx.font = `600 ${Math.round(fs * 0.78)}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = grad;
  ctx.fillText("L E N S E S 📸", x, yLens);
  ctx.restore();
  return c;
}

export function applyLensOpticalEnhanced(
  source: HTMLCanvasElement,
  lens: CameraLensDef,
  aspectId: LensAspectId = "native",
  opts?: { watermark?: boolean; maxEdge?: number },
): HTMLCanvasElement {
  const prepared = normalizeCaptureSize(source, opts?.maxEdge ?? 2560);
  let result = applyLensById(prepared, lens.id, aspectId);
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
